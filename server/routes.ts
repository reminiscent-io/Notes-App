import type { Express } from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const upload = multer({ dest: "uploads/" });

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const audioPath = req.file.path;
      const audioStream = fs.createReadStream(audioPath);

      const transcription = await openai.audio.transcriptions.create({
        file: audioStream,
        model: "whisper-1",
      });

      const rawText = transcription.text;

      const understanding = await openai.chat.completions.create({
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
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const notes = JSON.parse(req.body.notes || "[]");

      const audioPath = req.file.path;
      const audioStream = fs.createReadStream(audioPath);

      const transcription = await openai.audio.transcriptions.create({
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

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are a helpful voice notes assistant. The user has these notes:

${notesContext || "No notes yet."}

Answer the user's question conversationally and concisely. If they ask about what's due today/tomorrow, list relevant items. If they ask about a person or topic, find related notes.

Also return the IDs of any notes that match the query.

Respond with JSON:
{
  "response": "Your conversational answer",
  "matchedNoteIds": ["id1", "id2"]
}`,
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
      });
    } catch (error: any) {
      console.error("Query error:", error);
      res.status(500).json({ error: error.message || "Failed to process query" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
