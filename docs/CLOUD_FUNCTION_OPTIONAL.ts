/**
 * @fileoverview Cloud Function: Auto-create user documents on Auth signup
 * 
 * OPTIONAL server-side backup mechanism for user creation.
 * This function automatically creates a Firestore user document whenever
 * a new user signs up via Firebase Authentication.
 * 
 * SETUP:
 * 1. Copy this file to: functions/src/onUserCreate.ts
 * 2. Deploy: firebase deploy --only functions
 * 
 * This is a BACKUP MECHANISM — the client-side ensureUserExists() is primary.
 */

import { onAuthStateChanged } from "firebase-admin/auth";
import { doc, setDoc, serverTimestamp } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

/**
 * Triggered when a new user is created via Firebase Auth.
 * Creates a corresponding user document in Firestore.
 */
export const createUserDocumentOnSignup = async (user: any) => {
  if (!user.uid) {
    console.warn("[createUserDocumentOnSignup] user.uid is missing");
    return;
  }

  const userRef = doc(db, "users", user.uid);

  try {
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        lastSignIn: serverTimestamp(),
      },
      { merge: true }
    );

    console.log(
      `[createUserDocumentOnSignup] Created user document for ${user.email}`
    );
  } catch (error) {
    console.error(
      `[createUserDocumentOnSignup] Failed to create user document:`,
      error
    );
    throw error; // Let Firebase handle retry
  }
};

/**
 * Usage with Cloud Functions for Firebase (via firebase-functions):
 * 
 * import * as functions from "firebase-functions";
 * import { createUserDocumentOnSignup } from "./onUserCreate";
 * 
 * export const onCreateUser = functions.auth.user().onCreate((user) => {
 *   return createUserDocumentOnSignup(user);
 * });
 */
