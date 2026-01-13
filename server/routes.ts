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
      const audioStream = fs.createReadStream(audioPath);

      const transcription = await client.audio.transcriptions.create({
        file: audioStream,
        model: "whisper-1",
      });

      const rawText = transcription.text;

      const understanding = await client.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are a voice notes assistant. Analyze the transcribed text and extract structured information.
            
Determine:
1. A short title (max 50 chars) summarizing the note
2. Category: "today" (due today), "tomorrow" (due tomorrow), "idea" (creative thought/project), "shopping" (items to buy), or "other"
3. Due date if mentioned (in ISO format)
4. Entities mentioned (names of people, places, things)

Respond with JSON in this exact format:
{
  "title": "Short descriptive title",
  "category": "today|tomorrow|idea|shopping|other",
  "dueDate": "2026-01-13T15:00:00Z" or null,
  "entities": ["Person1", "Thing1"]
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
- General notes = "other"`,
          },
          {
            role: "user",
            content: rawText,
          },
        ],
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(understanding.choices[0].message.content || "{}");

      fs.unlinkSync(audioPath);

      res.json({
        rawText,
        title: parsed.title || rawText.slice(0, 50),
        category: parsed.category || "other",
        dueDate: parsed.dueDate || null,
        entities: parsed.entities || [],
      });
    } catch (error: any) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: error.message || "Failed to transcribe audio" });
    }
  });

  app.post("/api/query", upload.single("audio"), async (req, res) => {
    try {
      const client = getOpenAIClient();
      
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const notes = JSON.parse(req.body.notes || "[]");

      const audioPath = req.file.path;
      const audioStream = fs.createReadStream(audioPath);

      const transcription = await client.audio.transcriptions.create({
        file: audioStream,
        model: "whisper-1",
      });

      const query = transcription.text;

      const notesContext = notes
        .map(
          (n: any) =>
            `- [${n.category}] ${n.title}${n.completed ? " (DONE)" : ""}${n.dueDate ? ` (Due: ${new Date(n.dueDate).toLocaleString()})` : ""}`
        )
        .join("\n");

      const response = await client.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are a helpful voice notes assistant. The user has these notes:

${notesContext || "No notes yet."}

You can:
1. Answer questions about their notes conversationally
2. Complete/check off notes when asked (e.g., "mark the grocery list as done", "check off my meeting")
3. Delete notes when asked (e.g., "delete my shopping list", "remove the reminder about...")

Detect the user's intent:
- If they want to complete/check off notes: action = "complete"
- If they want to delete notes: action = "delete"
- If they're just asking questions: action = null

Respond with JSON:
{
  "response": "Your conversational answer confirming what you did or answering their question",
  "matchedNoteIds": ["id1", "id2"],
  "action": "complete" | "delete" | null
}

Examples:
- "Mark my grocery list as done" → action: "complete", find the shopping note
- "Delete all my ideas" → action: "delete", find all idea notes
- "What do I need to do today?" → action: null, find today notes`,
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

      fs.unlinkSync(audioPath);

      res.json({
        query,
        response: parsed.response || "I couldn't find anything related to that.",
        matchedNotes,
        action: parsed.action || null,
      });
    } catch (error: any) {
      console.error("Query error:", error);
      res.status(500).json({ error: error.message || "Failed to process query" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
