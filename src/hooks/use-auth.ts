"use client";

import { useState, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase-config";

const LS_KEY = "pujopath_uid";

/** Firebase Auth error codes that should NOT surface as user-facing errors. */
const SILENT_ERROR_CODES = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
]);

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        try {
          localStorage.setItem(LS_KEY, firebaseUser.uid);
        } catch {
          // localStorage may be unavailable in private browsing — non-fatal
        }
      } else {
        try {
          localStorage.removeItem(LS_KEY);
        } catch {
          // same guard
        }
      }
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    // Prevent concurrent sign-in attempts (double-click protection)
    if (signingIn) return { success: false };

    setSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting the user — no navigation here
      return { success: true };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      const message = (err as { message?: string })?.message ?? "Unknown error";

      // Silently ignore benign popup dismissals
      if (SILENT_ERROR_CODES.has(code)) {
        return { success: false };
      }

      console.error("[useAuth] signIn failed:", code, message);
      return { success: false, error: code || message };
    } finally {
      setSigningIn(false);
    }
  }, [signingIn]);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("[useAuth] signOut failed:", err);
    }
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      // localStorage guard
    }
  }, []);

  return { user, loading, signingIn, signIn, signOut };
}
