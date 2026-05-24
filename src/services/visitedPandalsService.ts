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

/**
 * Marks a pandal as visited in the user's visitedPandals collection.
 * Document ID = pandal.id so marks are idempotent.
 */
export async function markVisited(userId: string, pandal: Pandal): Promise<void> {
  const ref = doc(db, "users", userId, "visitedPandals", pandal.id);
  await setDoc(
    ref,
    {
      id: pandal.id,
      name: pandal.name,
      name_bengali: pandal.name_bengali,
      latitude: pandal.latitude,
      longitude: pandal.longitude,
      visitedAt: serverTimestamp(),
    },
    { merge: false }
  );
}

/**
 * Removes a pandal from the user's visitedPandals collection.
 */
export async function unmarkVisited(userId: string, pandalId: string): Promise<void> {
  const ref = doc(db, "users", userId, "visitedPandals", pandalId);
  await deleteDoc(ref);
}

/**
 * Returns the IDs of all pandals visited by this user.
 */
export async function getVisitedPandals(userId: string): Promise<string[]> {
  const colRef = collection(db, "users", userId, "visitedPandals");
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map((d) => d.id);
}
