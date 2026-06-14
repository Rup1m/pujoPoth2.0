/**
 * @fileoverview visitedPandalsService.ts — Visited pandal persistence layer.
 *
 * Uses localStorage as the instant cache (zero-latency reads) and
 * syncs to Firestore `users/{uid}/` for cross-device persistence.
 *
 * Write path:  localStorage (immediate) → Firestore (background, fire-and-forget)
 * Read path:   localStorage on mount → Firestore merge on auth ready
 *
 * Metro stations (type === "metro") are NEVER counted or stored.
 */

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-config";
import type { Pandal } from "@/lib/types";

const STORAGE_KEY = "pujo_visited_pandals";

// ── localStorage helpers (instant, offline-safe) ─────────────────────────────

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
    // Ignore storage errors (quota, private browsing)
  }
}

// ── Firestore sync helpers ───────────────────────────────────────────────────

function getUserDocRef(uid: string) {
  return doc(db(), "users", uid);
}

/**
 * Merge local visited IDs with Firestore (union of both sets).
 * Called once after auth state resolves.
 */
export async function syncVisitedWithFirestore(uid: string): Promise<string[]> {
  try {
    const localIds = new Set(getStoredIds());
    const userDoc = await getDoc(getUserDocRef(uid));

    if (userDoc.exists()) {
      const remoteIds: string[] = userDoc.data()?.visitedPandals ?? [];
      // Union merge — keep all IDs from both sources
      for (const id of remoteIds) {
        localIds.add(id);
      }
    }

    const mergedIds = Array.from(localIds);
    // Persist merged set to both stores
    setStoredIds(mergedIds);
    await setDoc(getUserDocRef(uid), { visitedPandals: mergedIds }, { merge: true });

    return mergedIds;
  } catch (error) {
    console.error("Failed to sync visited pandals with Firestore:", error);
    // Fallback to local-only
    return getStoredIds();
  }
}

/**
 * Persist visited IDs to Firestore in background.
 * Fire-and-forget — localStorage is already updated by the caller.
 */
async function persistToFirestore(uid: string | null, ids: string[]) {
  if (!uid) return;
  try {
    await setDoc(getUserDocRef(uid), { visitedPandals: ids }, { merge: true });
  } catch (error) {
    console.error("Background Firestore sync failed:", error);
    // Non-critical — localStorage is the source of truth for this session
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function markVisited(pandal: Pandal, uid: string | null): void {
  // Never track metro stations
  if (pandal.type === "metro") return;

  const ids = new Set(getStoredIds());
  ids.add(pandal.id);
  const updated = Array.from(ids);
  setStoredIds(updated);
  persistToFirestore(uid, updated);
}

export function unmarkVisited(pandalId: string, uid: string | null): void {
  const ids = new Set(getStoredIds());
  ids.delete(pandalId);
  const updated = Array.from(ids);
  setStoredIds(updated);
  persistToFirestore(uid, updated);
}

export function getVisitedPandals(): string[] {
  return getStoredIds();
}
