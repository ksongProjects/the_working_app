"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type SelectedSchedule = {
  kind: "schedule";
  id: string;
  title: string;
  start: string; // ISO string
  end: string; // ISO string
};

export type SelectedJira = {
  kind: "jira";
  issueKey: string;
};

export type SelectedCalendar = {
  kind: "calendar";
  provider: "google" | "microsoft";
  id: string;
  title: string;
  start?: string | null; // ISO string
  end?: string | null; // ISO string
};

export type SelectedItem =
  | SelectedSchedule
  | SelectedJira
  | SelectedCalendar
  | null;

type SelectionContextValue = {
  selected: SelectedItem;
  select: (item: SelectedItem) => void;
  clear: () => void;
};

const SelectionContext = createContext<SelectionContextValue | undefined>(
  undefined
);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<SelectedItem>(null);
  const select = useCallback((item: SelectedItem) => setSelected(item), []);
  const clear = useCallback(() => setSelected(null), []);
  const value = useMemo(
    () => ({ selected, select, clear }),
    [selected, select, clear]
  );
  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx)
    throw new Error("useSelection must be used within SelectionProvider");
  return ctx;
}

// Optional hook for components that can operate without a selection provider.
// Returns undefined if no provider is mounted.
export function useSelectionOptional() {
  return useContext(SelectionContext);
}
