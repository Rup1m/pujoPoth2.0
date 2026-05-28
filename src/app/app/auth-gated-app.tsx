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

  useEffect(() => {
    if (!loading && !user) {
      // Preserve the deep-link pandal ID through the sign-in redirect
      if (initialSelectedPandalId) {
        localStorage.setItem("pendingPandalId", initialSelectedPandalId);
      }
      router.replace("/");
    }
  }, [loading, user, router, initialSelectedPandalId]);

  if (loading) {
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
