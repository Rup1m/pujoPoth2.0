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
 */
export async function markVisited(userId: string, pandal: Pandal): Promise<void> {
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
  const ref = doc(db(), "users", userId, "visitedPandals", pandalId);
  await deleteDoc(ref);
}

/**
 * Returns the IDs of all pandals visited by this user.
 */
export async function getVisitedPandals(userId: string): Promise<string[]> {
  const colRef = collection(db(), "users", userId, "visitedPandals");
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map((d) => d.id);
}

/**
 * Returns full details of all pandals visited by this user,
 * sorted most-recently-visited first.
 */
export async function getVisitedPandalDetails(userId: string): Promise<VisitedPandalDoc[]> {
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
}

