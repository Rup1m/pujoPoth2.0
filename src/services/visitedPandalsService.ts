import { db } from "@/lib/firebase-config";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import type { Pandal } from "@/lib/types";

/** Shape of a visited-pandal document stored in Firestore. */
export interface VisitedPandalDoc {
  id: string;
  name: string;
  name_bengali: string;
  zone: string | null;
  bonedi: boolean;
  visitedAt: Date | null;
}

/**
 * Marks a pandal as visited in the user's visitedPandals collection.
 * Document ID = pandal.id so marks are idempotent.
 * 
 * NOTE: The parent users/{userId} document MUST exist (created by ensureUserExists).
 * If it doesn't exist, this will still succeed due to Firestore's auto-creation of
 * intermediate collections, but it's a sign that user initialization failed.
 */
export async function markVisited(userId: string, pandal: Pandal): Promise<void> {
  if (!userId) {
    throw new Error("Cannot mark pandal visited: userId is missing");
  }
  
  const ref = doc(db(), "users", userId, "visitedPandals", pandal.id);
  await setDoc(
    ref,
    {
      id: pandal.id,
      name: pandal.name,
      name_bengali: pandal.name_bengali,
      latitude: pandal.latitude,
      longitude: pandal.longitude,
      zone: pandal.zone ?? null,
      bonedi: pandal.bonedi ?? false,
      visitedAt: serverTimestamp(),
    },
    { merge: false }
  );
}

/**
 * Removes a pandal from the user's visitedPandals collection.
 */
export async function unmarkVisited(userId: string, pandalId: string): Promise<void> {
  if (!userId) {
    throw new Error("Cannot unmark pandal visited: userId is missing");
  }
  
  const ref = doc(db(), "users", userId, "visitedPandals", pandalId);
  await deleteDoc(ref);
}

/**
 * Returns the IDs of all pandals visited by this user.
 * Returns empty array if user has no visited pandals or collection doesn't exist.
 */
export async function getVisitedPandals(userId: string): Promise<string[]> {
  if (!userId) {
    throw new Error("Cannot get visited pandals: userId is missing");
  }
  
  try {
    const colRef = collection(db(), "users", userId, "visitedPandals");
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => d.id);
  } catch (error) {
    // Log the error for debugging but don't crash the app
    console.error("[visitedPandalsService] getVisitedPandals failed:", error);
    return [];
  }
}

/**
 * Returns full details of all pandals visited by this user,
 * sorted most-recently-visited first.
 * Returns empty array if fetch fails or user has no visited pandals.
 */
export async function getVisitedPandalDetails(userId: string): Promise<VisitedPandalDoc[]> {
  if (!userId) {
    throw new Error("Cannot get visited pandal details: userId is missing");
  }

  try {
    const colRef = collection(db(), "users", userId, "visitedPandals");
    const snapshot = await getDocs(colRef);
    return snapshot.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? "",
          name_bengali: data.name_bengali ?? "",
          zone: data.zone ?? null,
          bonedi: data.bonedi ?? false,
          visitedAt: data.visitedAt?.toDate?.() ?? null,
        } as VisitedPandalDoc;
      })
      .sort((a, b) => {
        if (!a.visitedAt && !b.visitedAt) return 0;
        if (!a.visitedAt) return 1;
        if (!b.visitedAt) return -1;
        return b.visitedAt.getTime() - a.visitedAt.getTime();
      });
  } catch (error) {
    // Log the error for debugging but don't crash the app
    console.error("[visitedPandalsService] getVisitedPandalDetails failed:", error);
    return [];
  }
}

