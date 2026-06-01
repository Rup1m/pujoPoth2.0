"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SplashScreen } from "@/components/splash-screen";
import PujoMap from "@/components/pujo-map";
import type { Pandal } from "@/lib/types";

/**
 * Client-side auth gate for the app route.
 * Shows SplashScreen while auth state resolves, redirects to / if unauthenticated,
 * and renders PujoMap with the userId prop once authenticated.
 * 
 * If server-side pandal fetch failed (e.g., during build or Firebase unavailable),
 * the client component will fetch on its own.
 */
export function AuthGatedApp({ 
  initialPandals, 
  initialSelectedPandalId,
  initialFetchError
}: { 
  initialPandals: Pandal[]; 
  initialSelectedPandalId?: string;
  initialFetchError?: string | null;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pandals, setPandals] = useState<Pandal[]>(initialPandals);
  const [hasError, setHasError] = useState(!!initialFetchError);
  const [hydrationDelay, setHydrationDelay] = useState(true);

  // ── Hydration delay with extended timeout for redirect processing ────────
  //
  // After user completes OAuth redirect and returns to /app, Firebase's
  // onAuthStateChanged needs time to resolve the persisted auth state.
  // The delay MUST be long enough for:
  //   1. getRedirectResult() to process (if this is the redirect landing)
  //   2. Persistence (IndexedDB/localStorage) to be read
  //   3. onAuthStateChanged listener to fire with the final auth state
  //
  // With 500ms, slow connections/devices could timeout prematurely, causing
  // the component to redirect to / before the user state resolves, trapping
  // users on the landing page.
  //
  // 1500ms provides a generous buffer for all these operations on any device.
  useEffect(() => {
    const timer = setTimeout(() => setHydrationDelay(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // If server-side fetch failed, attempt client-side fetch
  useEffect(() => {
    if (initialFetchError && pandals.length === 0) {
      const fetchPandalsClient = async () => {
        try {
          const response = await fetch('/api/pandals');
          if (response.ok) {
            const data = await response.json();
            setPandals(data);
            setHasError(false);
          } else {
            setHasError(true);
          }
        } catch (error) {
          console.error('[AuthGatedApp] Client-side pandal fetch failed:', error);
          setHasError(true);
        }
      };
      fetchPandalsClient();
    }
  }, [initialFetchError, pandals.length]);

  // ── Auth-gated redirect: send unauthenticated users back to landing page ──
  //
  // CRITICAL: Only redirect after both:
  //   1. Loading state is false (auth state has been resolved)
  //   2. Hydration delay has passed (redirect processing is complete)
  //
  // If we redirect before these complete, users get trapped on the landing
  // page even though they successfully authenticated.
  useEffect(() => {
    if (loading || hydrationDelay) {
      console.log('[AuthGatedApp] Waiting for hydration:', { loading, hydrationDelay });
      return;
    }

    if (!user) {
      console.log('[AuthGatedApp] User is not authenticated, redirecting to landing page');
      // Preserve the deep-link pandal ID through the sign-in redirect
      if (initialSelectedPandalId) {
        localStorage.setItem("pendingPandalId", initialSelectedPandalId);
      }
      router.replace("/");
    } else {
      console.log('[AuthGatedApp] User authenticated, rendering map:', user.email);
    }
  }, [loading, user, hydrationDelay, router, initialSelectedPandalId]);

  if (loading || hydrationDelay) {
    return <SplashScreen />;
  }

  if (!user) {
    return <SplashScreen />;
  }

  return (
    <PujoMap 
      initialPandals={pandals} 
      userId={user.uid} 
      initialSelectedPandalId={initialSelectedPandalId}
    />
  );
}
