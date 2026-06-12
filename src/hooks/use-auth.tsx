"use client";

import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  type AuthError as FirebaseAuthError,
} from "firebase/auth";
import { auth } from "@/lib/firebase-config";
import { trackEvent } from "@/lib/analytics";

// ── Error classification ────────────────────────────────────────────────────

/** Typed auth error surfaced to the UI. */
export interface AuthError {
  code: string;
  /** Locale-key suffix, e.g. "Network" → the UI maps to `text.authErrorNetwork` */
  category: "Generic" | "Network" | "TooManyRequests" | "AccountDisabled" | "PopupBlocked";
}

/**
 * Classify a Firebase Auth error code into a user-friendly category.
 * This prevents raw Firebase strings from ever reaching the UI.
 */
function classifyAuthError(error: unknown): AuthError {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as FirebaseAuthError).code)
      : "unknown";

  switch (code) {
    case "auth/network-request-failed":
      return { code, category: "Network" };

    case "auth/too-many-requests":
      return { code, category: "TooManyRequests" };

    case "auth/user-disabled":
      return { code, category: "AccountDisabled" };

    case "auth/popup-blocked":
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return { code, category: "PopupBlocked" };

    // User intentionally cancelled — not an error to display
    case "auth/user-cancelled":
      return { code, category: "Generic" };

    default:
      return { code, category: "Generic" };
  }
}

// ── Session storage key for redirect flow ────────────────────────────────────

const REDIRECT_PENDING_KEY = "pujo_auth_redirect_pending";

// ── Context ─────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** The last auth error, if any. Cleared on next sign-in attempt. */
  authError: AuthError | null;
  /** True while a sign-in operation is in-flight. */
  isSigningIn: boolean;
  /** True when a redirect sign-in flow is being completed on mount. */
  isRedirectPending: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const UNINITIALIZED_SENTINEL = Symbol("AuthContext.uninitialized");

const AuthContext = createContext<AuthContextType | typeof UNINITIALIZED_SENTINEL>(
  UNINITIALIZED_SENTINEL
);

// ── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isRedirectPending, setIsRedirectPending] = useState(false);

  // Guard against concurrent sign-in calls (double-click, fast re-taps)
  const signInInProgressRef = useRef(false);

  // ── Auth state listener ─────────────────────────────────────────────────

  useEffect(() => {
    const authInstance = auth();

    // Use onIdTokenChanged instead of onAuthStateChanged so that
    // token refresh failures (e.g., revoked account) are caught
    // immediately rather than silently failing on the next API call.
    const unsubscribe = authInstance.onIdTokenChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Complete pending redirect flow on mount ─────────────────────────────

  useEffect(() => {
    const authInstance = auth();

    // Check if we flagged a redirect before navigating away
    const isPending =
      typeof window !== "undefined" &&
      sessionStorage.getItem(REDIRECT_PENDING_KEY) === "true";

    if (!isPending) return;

    setIsRedirectPending(true);

    getRedirectResult(authInstance)
      .then((result) => {
        // Clean up the flag regardless of outcome
        sessionStorage.removeItem(REDIRECT_PENDING_KEY);

        if (result?.user) {
          trackEvent("auth_success", { provider: "google", method: "redirect" });
        }
      })
      .catch((error) => {
        sessionStorage.removeItem(REDIRECT_PENDING_KEY);
        const classified = classifyAuthError(error);
        setAuthError(classified);
        trackEvent("auth_failed", { code: classified.code, method: "redirect" });
        console.error("[Auth] Redirect sign-in failed:", error);
      })
      .finally(() => {
        setIsRedirectPending(false);
      });
  }, []);

  // ── Sign in ─────────────────────────────────────────────────────────────

  const signInWithGoogle = useCallback(async () => {
    // Double-click / rapid re-tap guard
    if (signInInProgressRef.current) return;
    signInInProgressRef.current = true;

    setIsSigningIn(true);
    setAuthError(null);

    const authInstance = auth();
    const provider = new GoogleAuthProvider();

    try {
      // Attempt popup first (works on most desktop browsers)
      await signInWithPopup(authInstance, provider);
      trackEvent("auth_success", { provider: "google", method: "popup" });
    } catch (error) {
      const classified = classifyAuthError(error);

      // If popup was blocked/closed, fall back to redirect flow.
      // This is critical for in-app WebViews (Instagram, Facebook, LinkedIn).
      if (classified.category === "PopupBlocked") {
        try {
          trackEvent("auth_popup_blocked_fallback", { code: classified.code });
          // Flag the redirect so we can detect it on return
          sessionStorage.setItem(REDIRECT_PENDING_KEY, "true");
          await signInWithRedirect(authInstance, provider);
          // Page navigates away — execution stops here
          return;
        } catch (redirectError) {
          const redirectClassified = classifyAuthError(redirectError);
          setAuthError(redirectClassified);
          trackEvent("auth_failed", { code: redirectClassified.code, method: "redirect" });
          console.error("[Auth] Redirect sign-in failed:", redirectError);
        }
      } else {
        setAuthError(classified);
        trackEvent("auth_failed", { code: classified.code, method: "popup" });
        console.error("[Auth] Sign-in failed:", error);
      }
    } finally {
      signInInProgressRef.current = false;
      setIsSigningIn(false);
    }
  }, []);

  // ── Sign out ────────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    try {
      const authInstance = auth();
      await firebaseSignOut(authInstance);
      trackEvent("auth_sign_out", {});
    } catch (error) {
      console.error("[Auth] Sign-out failed:", error);
      // Sign-out failures are rare and non-critical.
      // The auth state listener will still reflect the correct state.
      throw error;
    }
  }, []);

  // ── Clear error ─────────────────────────────────────────────────────────

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        isSigningIn,
        isRedirectPending,
        signInWithGoogle,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────────────────

/**
 * Access auth state. Throws immediately if called outside `<AuthProvider>`.
 */
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (ctx === UNINITIALIZED_SENTINEL) {
    throw new Error(
      "useAuth() was called outside of <AuthProvider>. " +
      "Wrap your component tree with <AuthProvider> in layout.tsx."
    );
  }
  return ctx;
}
