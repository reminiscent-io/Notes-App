import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Note {
  id: string;
  rawText: string;
  title: string;
  category: "today" | "tomorrow" | "idea" | "shopping" | "other";
  dueDate?: string;
  entities?: string[];
  completed: boolean;
  createdAt: string;
}

interface NoteInput {
  rawText: string;
  title: string;
  category: string;
  dueDate?: string;
  entities?: string[];
}

interface NotesContextType {
  notes: Note[];
  loading: boolean;
  addNote: (input: NoteInput) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  refreshNotes: () => Promise<void>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

const STORAGE_KEY = "@voice_notes";

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Note[];
        const sortedNotes = parsed.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setNotes(sortedNotes);
      }
    } catch (error) {
      console.error("Failed to load notes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const saveNotes = async (newNotes: Note[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newNotes));
    } catch (error) {
      console.error("Failed to save notes:", error);
    }
  };

  const addNote = useCallback(async (input: NoteInput) => {
    const newNote: Note = {
      id: Date.now().toString(),
      rawText: input.rawText,
      title: input.title,
      category: (input.category as Note["category"]) || "other",
      dueDate: input.dueDate,
      entities: input.entities,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setNotes((prev) => {
      const updated = [newNote, ...prev];
      saveNotes(updated);
      return updated;
    });
  }, []);

  const toggleComplete = useCallback(async (id: string) => {
    setNotes((prev) => {
      const updated = prev.map((note) =>
        note.id === id ? { ...note, completed: !note.completed } : note
      );
      saveNotes(updated);
      return updated;
    });
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setNotes((prev) => {
      const updated = prev.filter((note) => note.id !== id);
      saveNotes(updated);
      return updated;
    });
  }, []);

  const refreshNotes = useCallback(async () => {
    await loadNotes();
  }, [loadNotes]);

  return (
    <NotesContext.Provider
      value={{ notes, loading, addNote, toggleComplete, deleteNote, refreshNotes }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error("useNotes must be used within a NotesProvider");
  }
  return context;
}
