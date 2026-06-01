"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
  "auth/redirect-cancelled-by-user",
  "auth/popup-blocked",
]);

/**
 * Detects whether the current device is mobile.
 * Checks viewport width first, then falls back to UA sniffing.
 * Includes iPad (iPadOS 13+ reports desktop UA but has touch).
 */
function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 768) return true;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone/i.test(ua)) return true;
  // iPadOS 13+ sends a Mac UA — detect via touch + platform
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // ── Auth state listener + redirect result handler ─────────────────────────
  // Combined into one effect to guarantee onAuthStateChanged is attached
  // BEFORE getRedirectResult resolves. This prevents a race on mobile where
  // the redirect result could resolve before the listener is attached.
  useEffect(() => {
    const authInstance = auth();

    const unsubscribe = onAuthStateChanged(authInstance, (firebaseUser) => {
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

    // Process any pending redirect result (mobile sign-in flow).
    // onAuthStateChanged above will automatically pick up the user —
    // this call just ensures Firebase processes the redirect URL params.
    getRedirectResult(authInstance)
      .then((result) => {
        if (result?.user) {
          console.log("[useAuth] Redirect sign-in succeeded");
        }
      })
      .catch((err) => {
        const code = (err as { code?: string })?.code ?? "";
        if (!SILENT_ERROR_CODES.has(code)) {
          console.error("[useAuth] Redirect sign-in failed:", code, err);
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

      if (isMobile()) {
        // Mobile: redirect-based flow (page navigates away)
        await signInWithRedirect(auth(), provider);
        // Page will navigate away — return optimistically
        return { success: true };
      }

      // Desktop: popup-based flow with redirect fallback
      try {
        await signInWithPopup(auth(), provider);
        return { success: true };
      } catch (popupErr: unknown) {
        const popupCode = (popupErr as { code?: string })?.code ?? "";

        // If popup was blocked by the browser, silently fall back to redirect
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
      // Guard against setState on unmounted component (redirect navigates away)
      if (mountedRef.current) setSigningIn(false);
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

  return { user, loading, signingIn, signIn, signOut };
}
