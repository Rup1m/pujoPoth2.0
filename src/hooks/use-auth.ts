"use client";

import { useState, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase-config";

/** Minimal type declarations for Google Identity Services (GSI). */
interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  prompt(): void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

const LS_KEY = "pujopath_uid";

/** Firebase Auth error codes that should NOT surface as user-facing errors. */
const SILENT_ERROR_CODES = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
]);

/**
 * Detects whether the current browser context is likely to block popups:
 *  - Mobile devices (phones/tablets)
 *  - In-app browsers (Instagram, Facebook, WhatsApp, etc.)
 *  - PWA / standalone display mode
 */
function shouldUseRedirect(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent || "";

  // Mobile device check
  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(ua);

  // In-app browser detection (Instagram, Facebook, WhatsApp, Line, etc.)
  const isInAppBrowser = /FBAN|FBAV|Instagram|Line|WhatsApp|Snapchat|Twitter|Weibo/i.test(ua);

  // PWA / standalone mode
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (navigator as { standalone?: boolean }).standalone === true;

  return isMobile || isInAppBrowser || isStandalone;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  // ── Listen to auth state changes ─────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth(), (firebaseUser) => {
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

  // ── Handle redirect result on mount (for mobile sign-in flow) ──────────
  useEffect(() => {
    getRedirectResult(auth())
      .then((result) => {
        if (result?.user) {
          // onAuthStateChanged will pick this up — no extra action needed
          console.log("[useAuth] Redirect sign-in succeeded");
        }
      })
      .catch((err) => {
        const code = (err as { code?: string })?.code ?? "";
        if (!SILENT_ERROR_CODES.has(code)) {
          console.error("[useAuth] Redirect sign-in failed:", code, err);
        }
      });
  }, []);

  const signIn = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    // Prevent concurrent sign-in attempts (double-click protection)
    if (signingIn) return { success: false };

    setSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();

      if (shouldUseRedirect()) {
        // Mobile / in-app browser: redirect-based flow (won't return from here)
        await signInWithRedirect(auth(), provider);
        // Page will navigate away — return optimistically
        return { success: true };
      }

      // Desktop: popup-based flow
      try {
        await signInWithPopup(auth(), provider);
        return { success: true };
      } catch (popupErr: unknown) {
        const popupCode = (popupErr as { code?: string })?.code ?? "";

        // If popup was blocked, fall back to redirect
        if (popupCode === "auth/popup-blocked") {
          await signInWithRedirect(auth(), provider);
          return { success: true };
        }

        throw popupErr; // re-throw for outer catch
      }
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
      await firebaseSignOut(auth());
    } catch (err) {
      console.error("[useAuth] signOut failed:", err);
    }
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      // localStorage guard
    }
  }, []);

  const initializeOneTap = useCallback(() => {
    if (typeof window === 'undefined' || !window.google) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: GoogleCredentialResponse) => {
        try {
          const credential = GoogleAuthProvider.credential(response.credential);
          await signInWithCredential(auth(), credential);
          // onAuthStateChanged handles state update + navigation
        } catch (err) {
          console.error('[useAuth] One-Tap sign-in failed:', err);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: false,
    });

    window.google.accounts.id.prompt();
  }, []);

  return { user, loading, signingIn, signIn, signOut, initializeOneTap };
}

