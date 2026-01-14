import { Platform } from "react-native";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { Note } from "@/hooks/useNotes";
import { CustomSection } from "@/hooks/useCustomSections";

interface ParsedNote {
  rawText: string;
  title: string;
  category: string;
  dueDate?: string;
  entities?: string[];
  tags?: string[];
}

interface TranscribeResult {
  notes: ParsedNote[];
}

interface QueryResult {
  query: string;
  response: string;
  matchedNotes?: Note[];
  action?: "complete" | "delete" | "archive" | "create_section" | null;
  sectionName?: string;
  sectionIcon?: string;
  sectionKeywords?: string[];
}

export type { ParsedNote };

interface AudioInput {
  uri: string;
  blob?: Blob;
}

export async function transcribeAndProcess(
  audio: string | AudioInput,
  customSections: CustomSection[] = [],
  timezone: string = "America/New_York"
): Promise<TranscribeResult> {
  const formData = new FormData();
  
  if (Platform.OS === "web") {
    const audioInput = audio as AudioInput;
    if (audioInput.blob) {
      formData.append("audio", audioInput.blob, "recording.webm");
    } else {
      const response = await fetch(audioInput.uri);
      const blob = await response.blob();
      formData.append("audio", blob, "recording.webm");
    }
  } else {
    const audioUri = typeof audio === "string" ? audio : audio.uri;
    const filename = audioUri.includes(".") 
      ? audioUri.split("/").pop() || "recording.m4a"
      : "recording.m4a";
    
    formData.append("audio", {
      uri: audioUri,
      type: "audio/m4a",
      name: filename.endsWith(".m4a") ? filename : `${filename}.m4a`,
    } as any);
  }
  
  formData.append("customSections", JSON.stringify(customSections));
  formData.append("timezone", timezone);

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
  audio: string | AudioInput,
  notes: Note[],
  customSections: CustomSection[] = [],
  timezone: string = "America/New_York"
): Promise<QueryResult> {
  const formData = new FormData();
  
  if (Platform.OS === "web") {
    const audioInput = audio as AudioInput;
    if (audioInput.blob) {
      formData.append("audio", audioInput.blob, "recording.webm");
    } else {
      const response = await fetch(audioInput.uri);
      const blob = await response.blob();
      formData.append("audio", blob, "recording.webm");
    }
  } else {
    const audioUri = typeof audio === "string" ? audio : audio.uri;
    const filename = audioUri.includes(".") 
      ? audioUri.split("/").pop() || "recording.m4a"
      : "recording.m4a";
    
    formData.append("audio", {
      uri: audioUri,
      type: "audio/m4a",
      name: filename.endsWith(".m4a") ? filename : `${filename}.m4a`,
    } as any);
  }
  
  formData.append("notes", JSON.stringify(notes));
  formData.append("customSections", JSON.stringify(customSections));
  formData.append("timezone", timezone);

  const url = new URL("/api/query", getApiUrl());
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  
  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to process query");
    }

    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  }
}
