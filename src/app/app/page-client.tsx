/**
 * AppPageClient — client-side wrapper for the app page.
 * Handles first-time location permission request and initializes the map.
 */

"use client";

import { useFirstLocationPrompt } from "@/hooks/use-first-location-prompt";
import { ErrorBoundary } from "@/components/error-boundary";
import PujoMap from "@/components/pujo-map";
import type { Pandal } from "@/lib/types";
import { useEffect, useState } from "react";

export interface AppPageClientProps {
  initialPandals: Pandal[];
  initialSelectedPandalId?: string;
}

/**
 * Client wrapper that:
 * 1. Requests location permission automatically on first visit
 * 2. Renders the map with initial pandals data
 */
export function AppPageClient({
  initialPandals,
  initialSelectedPandalId,
}: AppPageClientProps) {
  // This hook automatically requests location on first visit
  // using localStorage to ensure it only happens once
  useFirstLocationPrompt();

  // Small state to ensure hydration safety
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <main className="h-screen w-screen overflow-hidden">
      <ErrorBoundary>
        <PujoMap
          initialPandals={initialPandals}
          initialSelectedPandalId={initialSelectedPandalId}
        />
      </ErrorBoundary>
    </main>
  );
}
