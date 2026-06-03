/**
 * AppPageClient — client-side wrapper for the app page.
 * Renders the map with initial pandals data.
 *
 * The previous isMounted gate has been removed because PujoMap
 * already handles client-side hydration safety internally via its
 * own isClient state. The double-gate was causing an unnecessary
 * blank render frame on navigation.
 */

"use client";

import { ErrorBoundary } from "@/components/error-boundary";
import PujoMap from "@/components/pujo-map";
import type { Pandal } from "@/lib/types";

export interface AppPageClientProps {
  initialPandals: Pandal[];
  initialSelectedPandalId?: string;
}

/**
 * Client wrapper that renders the map with initial pandals data.
 * Location permission is handled by PujoMap's useLocation hook.
 */
export function AppPageClient({
  initialPandals,
  initialSelectedPandalId,
}: AppPageClientProps) {
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
