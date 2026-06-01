import type { Pandal } from "@/lib/types";

const STORAGE_KEY = "pujo_visited_pandals";

function getStoredIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setStoredIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage errors
  }
}

export async function markVisited(pandal: Pandal): Promise<void> {
  const ids = new Set(getStoredIds());
  ids.add(pandal.id);
  setStoredIds(Array.from(ids));
}

export async function unmarkVisited(pandalId: string): Promise<void> {
  const ids = new Set(getStoredIds());
  ids.delete(pandalId);
  setStoredIds(Array.from(ids));
}

export async function getVisitedPandals(): Promise<string[]> {
  return getStoredIds();
}
