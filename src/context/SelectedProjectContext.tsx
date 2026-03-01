import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useProjects } from "@/hooks/useProjects";

const STORAGE_KEY = "app_selected_project_id";

function getStored(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

interface SelectedProjectContextValue {
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
}

const SelectedProjectContext = createContext<SelectedProjectContextValue | null>(null);

export function SelectedProjectProvider({ children }: { children: React.ReactNode }) {
  const [selectedProjectId, setState] = useState<string>(getStored);
  const { projects } = useProjects();

  const setSelectedProjectId = useCallback((id: string) => {
    setState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  useEffect(() => {
    if (!projects.length) return;
    const isValid = selectedProjectId && projects.some((p) => p.id === selectedProjectId);
    if (!selectedProjectId || !isValid) {
      const next = projects[0]?.id ?? "";
      setState(next);
      if (typeof window !== "undefined" && next) {
        localStorage.setItem(STORAGE_KEY, next);
      }
    }
  }, [projects, selectedProjectId]);

  return (
    <SelectedProjectContext.Provider value={{ selectedProjectId, setSelectedProjectId }}>
      {children}
    </SelectedProjectContext.Provider>
  );
}

export function useSelectedProject(): SelectedProjectContextValue {
  const ctx = useContext(SelectedProjectContext);
  if (!ctx) throw new Error("useSelectedProject must be used within SelectedProjectProvider");
  return ctx;
}
