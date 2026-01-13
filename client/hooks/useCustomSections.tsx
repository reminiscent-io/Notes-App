import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CustomSection {
  id: string;
  name: string;
  icon: string;
  keywords: string[];
  createdAt: string;
}

interface CustomSectionsContextType {
  sections: CustomSection[];
  addSection: (name: string, icon: string, keywords: string[]) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  updateSection: (id: string, updates: Partial<CustomSection>) => Promise<void>;
}

const CustomSectionsContext = createContext<CustomSectionsContextType | undefined>(undefined);

const STORAGE_KEY = "@voice_notes_sections";

export function CustomSectionsProvider({ children }: { children: ReactNode }) {
  const [sections, setSections] = useState<CustomSection[]>([]);

  const loadSections = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CustomSection[];
        setSections(parsed);
      }
    } catch (error) {
      console.error("Failed to load custom sections:", error);
    }
  }, []);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  const saveSections = async (newSections: CustomSection[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSections));
    } catch (error) {
      console.error("Failed to save custom sections:", error);
    }
  };

  const addSection = useCallback(async (name: string, icon: string, keywords: string[]) => {
    const newSection: CustomSection = {
      id: Date.now().toString(),
      name,
      icon,
      keywords,
      createdAt: new Date().toISOString(),
    };

    setSections((prev) => {
      const updated = [...prev, newSection];
      saveSections(updated);
      return updated;
    });
  }, []);

  const deleteSection = useCallback(async (id: string) => {
    setSections((prev) => {
      const updated = prev.filter((section) => section.id !== id);
      saveSections(updated);
      return updated;
    });
  }, []);

  const updateSection = useCallback(async (id: string, updates: Partial<CustomSection>) => {
    setSections((prev) => {
      const updated = prev.map((section) =>
        section.id === id ? { ...section, ...updates } : section
      );
      saveSections(updated);
      return updated;
    });
  }, []);

  return (
    <CustomSectionsContext.Provider
      value={{ sections, addSection, deleteSection, updateSection }}
    >
      {children}
    </CustomSectionsContext.Provider>
  );
}

export function useCustomSections() {
  const context = useContext(CustomSectionsContext);
  if (!context) {
    throw new Error("useCustomSections must be used within a CustomSectionsProvider");
  }
  return context;
}
