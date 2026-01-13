import { getApiUrl, apiRequest } from "@/lib/query-client";
import { Note } from "@/hooks/useNotes";
import { File } from "expo-file-system/next";

interface TranscribeResult {
  rawText: string;
  title: string;
  category: string;
  dueDate?: string;
  entities?: string[];
}

interface QueryResult {
  query: string;
  response: string;
  matchedNotes?: Note[];
}

export async function transcribeAndProcess(audioUri: string): Promise<TranscribeResult> {
  const formData = new FormData();
  
  const file = new File(audioUri);
  formData.append("audio", file);

  const url = new URL("/api/transcribe", getApiUrl());
  
  const response = await fetch(url.toString(), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Failed to transcribe audio");
  }

  return response.json();
}

export async function queryNotes(
  audioUri: string,
  notes: Note[]
): Promise<QueryResult> {
  const formData = new FormData();
  
  const file = new File(audioUri);
  formData.append("audio", file);
  formData.append("notes", JSON.stringify(notes));

  const url = new URL("/api/query", getApiUrl());
  
  const response = await fetch(url.toString(), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Failed to process query");
  }

  return response.json();
}
