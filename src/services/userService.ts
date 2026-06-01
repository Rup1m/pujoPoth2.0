/**
 * @fileoverview userService.ts — User profile management
 * 
 * Handles creation and retrieval of user documents in Firestore.
 * Called on first sign-in to initialize user profile with metadata.
 */

import { db } from "@/lib/firebase-config";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import type { User } from "firebase/auth";

export interface UserProfile extends DocumentData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: any; // Firestore Timestamp
  lastSignIn: any; // Firestore Timestamp
}

/**
 * Ensures a user document exists in Firestore.
 * Called after successful authentication to create/update user profile.
 * 
 * Uses setDoc with merge: true to:
 *   - Create if doesn't exist (first sign-in)
 *   - Only update lastSignIn if exists (returning user)
 *   - Never overwrite existing data
 */
export async function ensureUserExists(firebaseUser: User): Promise<UserProfile> {
  if (!firebaseUser.uid) {
    throw new Error("Cannot ensure user exists: firebaseUser.uid is missing");
  }

  const userRef = doc(db(), "users", firebaseUser.uid);

  // Check if user already exists
  const existingUserSnap = await getDoc(userRef);

  if (existingUserSnap.exists()) {
    // Returning user — just update lastSignIn
    await setDoc(
      userRef,
      {
        lastSignIn: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      ...existingUserSnap.data(),
    } as UserProfile;
  }

  // New user — create profile with full metadata
  const newProfile: UserProfile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    createdAt: serverTimestamp(),
    lastSignIn: serverTimestamp(),
  };

  await setDoc(userRef, newProfile);

  return newProfile;
}

/**
 * Retrieves a user profile from Firestore.
 * Returns null if user document doesn't exist (should not happen after ensureUserExists).
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) {
    throw new Error("Cannot get user profile: uid is missing");
  }

  const userRef = doc(db(), "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return userSnap.data() as UserProfile;
}

/**
 * Updates specific fields in a user profile.
 * Useful for updating preferences, profile metadata, etc.
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  if (!uid) {
    throw new Error("Cannot update user profile: uid is missing");
  }

  const userRef = doc(db(), "users", uid);
  await setDoc(userRef, updates, { merge: true });
}
