"use client";

import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import {
  User,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut as firebaseSignOut,
  type AuthError as FirebaseAuthError,
} from "firebase/auth";
import { auth } from "@/lib/firebase-config";
import { trackEvent } from "@/lib/analytics";
import {
  initializeGis,
  promptOneTap,
  renderSignInButton,
  cancelOneTap,
  disableAutoSelect,
  isGisAvailable,
  type GisCredentialResponse,
} from "@/lib/google-one-tap";

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

    // Invalid / expired credential — could happen if GIS token is stale
    case "auth/invalid-credential":
    case "auth/invalid-id-token":
      return { code, category: "Generic" };

    // User intentionally cancelled — not an error to display
    case "auth/user-cancelled":
      return { code, category: "Generic" };

    default:
      return { code, category: "Generic" };
  }
}

// ── Context ─────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** The last auth error, if any. Cleared on next sign-in attempt. */
  authError: AuthError | null;
  /** True while a sign-in operation is in-flight. */
  isSigningIn: boolean;
  /**
   * Initialize GIS, render the branded button, and trigger One Tap.
   * Called automatically on mount; can be re-called on retry.
   */
  initGoogleSignIn: (buttonContainer?: HTMLElement | null) => void;
  /**
   * Popup fallback — only used when GIS fails to load
   * (ad-blocker, in-app WebView, etc.).
   */
  signInWithPopupFallback: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  /** Whether GIS has been initialized and is ready. */
  isGisReady: boolean;
  /** Whether GIS failed to load and the fallback button should be shown. */
  gisLoadFailed: boolean;
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
  const [isGisReady, setIsGisReady] = useState(false);
  const [gisLoadFailed, setGisLoadFailed] = useState(false);

  // Guard against concurrent credential processing
  const credentialInProgressRef = useRef(false);
  // Guard against concurrent GIS initialization
  const gisInitInProgressRef = useRef(false);
  // Track if component is still mounted (prevents setState on unmounted component)
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── GIS credential callback ──────────────────────────────────────────────
  // Called by GIS when the user selects a Google account (One Tap or button).
  // Stored in a ref so GIS always calls the latest version without needing
  // to re-initialize every time the callback identity changes.

  const handleGisCredentialRef = useRef<(response: GisCredentialResponse) => Promise<void>>();

  handleGisCredentialRef.current = async (response: GisCredentialResponse) => {
    // ── Validate credential response ────────────────────────────────────
    if (!response?.credential || typeof response.credential !== "string") {
      console.error("[Auth] Invalid GIS credential response — missing token");
      if (mountedRef.current) {
        setAuthError({ code: "gis/invalid-response", category: "Generic" });
      }
      return;
    }

    // Guard against concurrent processing (double-tap on One Tap)
    if (credentialInProgressRef.current) return;
    credentialInProgressRef.current = true;

    if (mountedRef.current) {
      setIsSigningIn(true);
      setAuthError(null);
    }

    try {
      const authInstance = auth();

      // Build a Firebase credential from the GIS ID token
      const credential = GoogleAuthProvider.credential(response.credential);
      await signInWithCredential(authInstance, credential);

      const method = response.select_by?.includes("btn") ? "gis_button" : "one_tap";
      trackEvent("auth_success", { provider: "google", method });
    } catch (error) {
      const classified = classifyAuthError(error);

      if (mountedRef.current) {
        setAuthError(classified);
      }

      trackEvent("auth_failed", {
        code: classified.code,
        method: "gis_credential",
      });
      console.error("[Auth] GIS credential sign-in failed:", error);
    } finally {
      credentialInProgressRef.current = false;
      if (mountedRef.current) {
        setIsSigningIn(false);
      }
    }
  };

  // Stable callback ref that GIS can call
  const gisCallbackRef = useCallback((response: GisCredentialResponse) => {
    handleGisCredentialRef.current?.(response);
  }, []);

  // ── Initialize GIS + render button ───────────────────────────────────────

  const initGoogleSignIn = useCallback(
    (buttonContainer?: HTMLElement | null) => {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error(
          "[Auth] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. " +
            "Google One Tap sign-in will not work."
        );
        if (mountedRef.current) setGisLoadFailed(true);
        return;
      }

      // Prevent concurrent initialization calls (e.g. fast StrictMode double-mount)
      if (gisInitInProgressRef.current) return;
      gisInitInProgressRef.current = true;

      initializeGis(clientId, gisCallbackRef)
        .then(() => {
          if (!mountedRef.current) return;

          setIsGisReady(true);
          setGisLoadFailed(false);

          // Render the branded "Sign In With Google" button
          if (buttonContainer) {
            renderSignInButton(buttonContainer);
          }

          // Trigger the One Tap prompt (auto-dismisses if blocked / cooldown)
          promptOneTap();
        })
        .catch((err) => {
          console.error("[Auth] Failed to initialize Google Identity Services:", err);

          if (!mountedRef.current) return;

          // Signal the UI to show the fallback popup button
          setGisLoadFailed(true);
          setIsGisReady(false);
        })
        .finally(() => {
          gisInitInProgressRef.current = false;
        });
    },
    [gisCallbackRef]
  );

  // ── Popup fallback (when GIS is unavailable) ────────────────────────────
  // This is the escape hatch for ad-blockers, corporate proxies, and
  // in-app WebViews (Instagram, Facebook) where GIS can't load.

  const signInWithPopupFallback = useCallback(async () => {
    if (credentialInProgressRef.current) return;
    credentialInProgressRef.current = true;

    setIsSigningIn(true);
    setAuthError(null);

    const authInstance = auth();
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(authInstance, provider);
      trackEvent("auth_success", { provider: "google", method: "popup_fallback" });
    } catch (error) {
      const classified = classifyAuthError(error);
      if (mountedRef.current) {
        setAuthError(classified);
      }
      trackEvent("auth_failed", { code: classified.code, method: "popup_fallback" });
      console.error("[Auth] Popup fallback sign-in failed:", error);
    } finally {
      credentialInProgressRef.current = false;
      if (mountedRef.current) {
        setIsSigningIn(false);
      }
    }
  }, []);

  // ── Auth state listener ─────────────────────────────────────────────────

  useEffect(() => {
    const authInstance = auth();

    // Use onIdTokenChanged instead of onAuthStateChanged so that
    // token refresh failures (e.g., revoked account) are caught
    // immediately rather than silently failing on the next API call.
    const unsubscribe = authInstance.onIdTokenChanged((currentUser) => {
      if (mountedRef.current) {
        setUser(currentUser);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // ── Clean up One Tap on unmount ─────────────────────────────────────────

  useEffect(() => {
    return () => {
      cancelOneTap();
    };
  }, []);

  // ── Sign out ────────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    try {
      const authInstance = auth();
      // Tell GIS not to auto-select the user again immediately.
      // This also resets the initialization flag so the next
      // initGoogleSignIn call starts fresh.
      disableAutoSelect();
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
        isGisReady,
        gisLoadFailed,
        initGoogleSignIn,
        signInWithPopupFallback,
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
