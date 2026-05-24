"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SplashScreen } from "@/components/splash-screen";
import PujoMap from "@/components/pujo-map";
import type { Pandal } from "@/lib/types";

/**
 * Client-side auth gate for the app route.
 * Shows SplashScreen while auth state resolves, redirects to / if unauthenticated,
 * and renders PujoMap with the userId prop once authenticated.
 */
export function AuthGatedApp({ initialPandals }: { initialPandals: Pandal[] }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (loading) {
    return <SplashScreen />;
  }

  if (!user) {
    return <SplashScreen />;
  }

  return <PujoMap initialPandals={initialPandals} userId={user.uid} />;
}
