import type { Express } from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

// Lazy initialization of OpenAI client
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set. Please add your OpenAI API key.");
    }
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

const upload = multer({ dest: "uploads/" });

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
    try {
      const client = getOpenAIClient();
      
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const audioPath = req.file.path;
      const originalName = req.file.originalname || "audio.m4a";
      const ext = path.extname(originalName) || ".m4a";
      const newPath = audioPath + ext;
      fs.renameSync(audioPath, newPath);
      
      const audioStream = fs.createReadStream(newPath);

      const transcription = await client.audio.transcriptions.create({
        file: audioStream,
        model: "whisper-1",
      });

      const rawText = transcription.text;

      const customSections = JSON.parse(req.body.customSections || "[]");
      
      const sectionsContext = customSections.length > 0
        ? `\n\nCustom sections (auto-tag if content matches):\n${customSections.map((s: any) => `- "${s.name}": keywords = [${s.keywords.join(", ")}]`).join("\n")}`
        : "";

      const understanding = await client.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are a voice notes assistant. Analyze the transcribed text and extract one or more distinct notes.

IMPORTANT: If the user mentions multiple unrelated items, tasks, or ideas, create SEPARATE notes for each. For example:
- "Remind me to call mom tomorrow, also buy milk" = 2 notes (call reminder + shopping)
- "I have an idea for an app, and don't forget the meeting at 3pm" = 2 notes (idea + meeting)
- "Pick up groceries: milk, eggs, bread" = 1 note (all items are part of one shopping list)

For EACH distinct note, determine:
1. A short title (max 50 chars) summarizing that specific note
   - DO NOT include times in the title (e.g., "Meeting at 3pm" should be "Meeting" not "Meeting at 3pm")
   - Focus on the core subject/action only
2. Category: "today" (due today), "tomorrow" (due tomorrow), "idea" (creative thought/project), "shopping" (items to buy), or "other"
3. Due date if mentioned (in ISO format)
4. Entities mentioned (names of people, places, things)
5. Tags: Which custom sections this note belongs to
6. rawText: The FULL portion of the transcript that relates to this specific note
   - Keep the complete spoken content, only fix minor grammar issues to make it readable
   - Preserve the user's original wording and details
   - Only clean up obvious speech artifacts (um, uh, repeated words)
${sectionsContext}

Respond with JSON in this exact format:
{
  "notes": [
    {
      "rawText": "The relevant portion of the transcript",
      "title": "Short descriptive title",
      "category": "today|tomorrow|idea|shopping|other",
      "dueDate": "2026-01-13T15:00:00Z" or null,
      "entities": ["Person1", "Thing1"],
      "tags": ["SectionName1"]
    }
  ]
}

Time references:
- "today", "this afternoon", "tonight" = today's date
- "tomorrow", "next day" = tomorrow's date
- "EOD", "end of day" = today at 17:00
- If a specific time is mentioned, include it

Categories:
- Reminders, tasks, calls, meetings = "today" or "tomorrow" based on time
- "Buy", "get", "pick up" items = "shopping"
- Ideas, thoughts, concepts, app ideas = "idea"
- General notes = "other"

Tags:
- Match notes to custom sections based on keywords or semantic similarity
- A note can have multiple tags
- Only use section names from the custom sections list
- Return empty array if no sections match`,
          },
          {
            role: "user",
            content: rawText,
          },
        ],
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(understanding.choices[0].message.content || "{}");

      try { fs.unlinkSync(newPath); } catch {}

      const notes = parsed.notes || [{
        rawText,
        title: parsed.title || rawText.slice(0, 50),
        category: parsed.category || "other",
        dueDate: parsed.dueDate || null,
        entities: parsed.entities || [],
        tags: parsed.tags || [],
      }];

      res.json({ notes });
    } catch (error: any) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: error.message || "Failed to transcribe audio" });
    }
  });

  app.post("/api/query", upload.single("audio"), async (req, res) => {
    let queryAudioPath: string | null = null;
    try {
      const client = getOpenAIClient();
      
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const audioPath = req.file.path;
      const originalName = req.file.originalname || "audio.m4a";
      const ext = path.extname(originalName) || ".m4a";
      queryAudioPath = audioPath + ext;
      fs.renameSync(audioPath, queryAudioPath);

      const notes = JSON.parse(req.body.notes || "[]");
      const customSections = JSON.parse(req.body.customSections || "[]");
      const userTimezone = req.body.timezone || "America/New_York";

      const audioStream = fs.createReadStream(queryAudioPath);

      const transcription = await client.audio.transcriptions.create({
        file: audioStream,
        model: "whisper-1",
      });

      const query = transcription.text;

      const formatDateInTimezone = (dateStr: string, tz: string) => {
        try {
          const date = new Date(dateStr);
          return date.toLocaleString("en-US", {
            timeZone: tz,
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
        } catch {
          return new Date(dateStr).toLocaleString();
        }
      };

      const currentTime = new Date().toLocaleString("en-US", {
        timeZone: userTimezone,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const notesContext = notes
        .map(
          (n: any) =>
            `- [ID:${n.id}] [${n.category}] ${n.title}${n.completed ? " (DONE)" : ""}${n.archivedAt ? " (ARCHIVED)" : ""}${n.tags?.length ? ` [Tags: ${n.tags.join(", ")}]` : ""}${n.dueDate ? ` (Due: ${formatDateInTimezone(n.dueDate, userTimezone)})` : ""}`
        )
        .join("\n");

      const sectionsContext = customSections.length > 0
        ? `\n\nExisting custom sections: ${customSections.map((s: any) => s.name).join(", ")}`
        : "\n\nNo custom sections yet.";

      const response = await client.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are a helpful voice notes assistant.

Current time: ${currentTime}
User timezone: ${userTimezone}

The user has these notes:

${notesContext || "No notes yet."}
${sectionsContext}

IMPORTANT: When mentioning times, always use the exact times shown in the "Due:" fields above. Do not convert or adjust times - they are already in the user's timezone.

You can:
1. Answer questions about their notes conversationally
2. Complete/check off notes when asked (e.g., "mark the grocery list as done")
3. Delete notes when asked (e.g., "delete my shopping list")
4. Archive notes when asked (e.g., "archive my completed work tasks")
5. Create new sections when asked (e.g., "create a work section for meetings, deadlines, boss")

Detect the user's intent:
- complete: mark notes as done
- delete: remove notes
- archive: archive notes (hide from main view but keep)
- create_section: create a new smart section

For create_section, extract:
- sectionName: name of the section (e.g., "Work", "Family")
- sectionIcon: Feather icon name (e.g., "briefcase", "users", "heart", "book")
- sectionKeywords: array of keywords that trigger auto-tagging

Respond with JSON:
{
  "response": "Conversational answer",
  "matchedNoteIds": ["id1", "id2"],
  "action": "complete" | "delete" | "archive" | "create_section" | null,
  "sectionName": "Work",
  "sectionIcon": "briefcase",
  "sectionKeywords": ["meeting", "deadline", "boss", "project"]
}

Examples:
- "Create a work section" → action: "create_section", sectionName: "Work", sectionIcon: "briefcase", sectionKeywords: ["meeting", "deadline", "work", "office"]
- "Archive my done tasks" → action: "archive", find completed notes
- "Mark grocery list done" → action: "complete"`,
          },
          {
            role: "user",
            content: query,
          },
        ],
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(response.choices[0].message.content || "{}");

      const matchedNotes = notes.filter((n: any) =>
        (parsed.matchedNoteIds || []).includes(n.id)
      );

      try { if (queryAudioPath) fs.unlinkSync(queryAudioPath); } catch {}

      res.json({
        query,
        response: parsed.response || "I couldn't find anything related to that.",
        matchedNotes,
        action: parsed.action || null,
        sectionName: parsed.sectionName || null,
        sectionIcon: parsed.sectionIcon || null,
        sectionKeywords: parsed.sectionKeywords || [],
      });
    } catch (error: any) {
      console.error("Query error:", error);
      try { if (queryAudioPath) fs.unlinkSync(queryAudioPath); } catch {}
      res.status(500).json({ error: error.message || "Failed to process query" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
