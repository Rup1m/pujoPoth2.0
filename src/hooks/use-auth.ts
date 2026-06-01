"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase-config";
import { ensureUserExists } from "@/services/userService";

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

/** Sync localStorage cache — best-effort, never throws. */
function cacheUid(firebaseUser: User | null) {
  try {
    if (firebaseUser) {
      localStorage.setItem(LS_KEY, firebaseUser.uid);
    } else {
      localStorage.removeItem(LS_KEY);
    }
  } catch {
    // localStorage may be unavailable in private browsing — non-fatal
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const mountedRef = useRef(true);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Sequenced auth initialization ─────────────────────────────────────────
  //
  // CRITICAL ORDER OF OPERATIONS:
  //   1. Set persistence            (await — must complete first)
  //   2. Process redirect result     (await — must complete before listener)
  //   3. Attach onAuthStateChanged   (listener fires with FINAL auth state)
  //
  // This ordering guarantees that when onAuthStateChanged fires its first
  // callback, the redirect result (if any) has ALREADY been processed.
  // Without this, onAuthStateChanged fires immediately with `null`,
  // page.tsx sees loading=false + user=null, renders the landing page,
  // and the user is stuck — even though getRedirectResult would eventually
  // resolve with a valid user.
  //
  useEffect(() => {
    let cancelled = false;
    const authInstance = auth();

    const initAuth = async () => {
      // 1. Set persistence before any auth operations
      try {
        await setPersistence(authInstance, indexedDBLocalPersistence);
      } catch {
        try {
          await setPersistence(authInstance, browserLocalPersistence);
        } catch {
          // Both failed — continue with Firebase's default persistence.
          // Auth still works; sessions just may not survive tab closure.
        }
      }

      if (cancelled) return;

      // 2. Process any pending redirect result FIRST.
      //    This resolves almost instantly (~10ms) when there's no pending
      //    redirect, so it does NOT add latency for non-redirect visitors.
      //    For redirect returns, this is the step that exchanges the Google
      //    auth code for Firebase credentials and writes the session.
      //    
      //    IMPORTANT: getRedirectResult can only be called once per redirect.
      //    If called multiple times (in different useAuth instances), only the
      //    first call processes the redirect; subsequent calls return null.
      //    This is why we rely on persistence + onAuthStateChanged to handle
      //    auth state in second+ useAuth instances (e.g., after navigation to /app).
      let redirectProcessed = false;
      try {
        const result = await getRedirectResult(authInstance);
        if (result?.user) {
          redirectProcessed = true;
          console.log("[useAuth] Redirect sign-in succeeded:", result.user.email);
        }
      } catch (err) {
        const code = (err as { code?: string })?.code ?? "";
        if (!SILENT_ERROR_CODES.has(code)) {
          console.error("[useAuth] Redirect sign-in failed:", code, err);
        }
      }

      if (cancelled) return;

      // 2.5. After processing redirect result, wait a brief moment to ensure
      //      persistence has been written to storage. This prevents a race where
      //      onAuthStateChanged fires before the session cookie/token is ready.
      if (redirectProcessed) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (cancelled) return;

      // 3. NOW attach the auth state listener.
      //    At this point, if a redirect was processed above, the auth state
      //    already includes the authenticated user. The first callback will
      //    fire with the correct user — never with a premature `null`.
      //    If this is a second+ useAuth instance (after client navigation),
      //    the listener will fire with the persisted user (if any).
      unsubRef.current = onAuthStateChanged(authInstance, (firebaseUser) => {
        if (cancelled) return;

        if (firebaseUser) {
          // NEW: Ensure user document exists in Firestore on first sign-in
          // This is non-blocking — we set the user state immediately and
          // ensure the profile in parallel. If ensureUserExists fails,
          // we log the error but don't block the user from using the app.
          // 
          // RETRY LOGIC: If user initialization fails (network, permission, etc),
          // attempt retry after 2 seconds. This provides automatic recovery for
          // transient failures without requiring user intervention.
          let retryCount = 0;
          const maxRetries = 3;
          const retryInterval = 2000; // 2 seconds between retries

          const tryEnsureUser = async () => {
            try {
              await ensureUserExists(firebaseUser);
              console.log(
                "[useAuth] User profile initialized successfully:",
                firebaseUser.email
              );
            } catch (err) {
              retryCount++;
              if (retryCount < maxRetries) {
                console.warn(
                  `[useAuth] User profile initialization failed (attempt ${retryCount}/${maxRetries}), retrying in ${retryInterval}ms:`,
                  err
                );
                // Schedule retry
                const retryTimer = setTimeout(tryEnsureUser, retryInterval);
                // Clean up retry timer on unmount
                const originalUnsub = unsubRef.current;
                unsubRef.current = () => {
                  clearTimeout(retryTimer);
                  originalUnsub?.();
                };
              } else {
                console.error(
                  "[useAuth] Failed to initialize user profile after 3 attempts:",
                  err
                );
              }
            }
          };

          tryEnsureUser();
        }

        setUser(firebaseUser);
        setLoading(false);
        cacheUid(firebaseUser);
        if (firebaseUser) {
          console.log("[useAuth] Auth state resolved:", firebaseUser.email);
        } else {
          console.log("[useAuth] Auth state resolved: unauthenticated");
        }
      });
    };

    initAuth();

    return () => {
      cancelled = true;
      unsubRef.current?.();
    };
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
