
import { getPandals } from '@/services/pandalService';
import { AuthGatedApp } from './auth-gated-app';
import { ErrorBoundary } from '@/components/error-boundary';
import type { Pandal } from '@/lib/types';

/**
 * Dynamic route prevents prerendering at build time (when Firebase credentials may be unavailable).
 * The page will render on-demand for each request in production.
 * This avoids "Failed to collect page data" errors during Vercel builds.
 */
export const dynamic = 'force-dynamic';

/** Revalidate every 600 seconds (10 minutes) via ISR.
 *  Pandal data is static during Puja — this is more than sufficient. */
export const revalidate = 600;

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ pandal?: string }>;
}) {
  // Fetch pandals on the server to make initial load faster.
  // With force-dynamic, this runs on each request (not at build time).
  let pandals: Pandal[] = [];
  let fetchError: string | null = null;

  try {
    pandals = await getPandals();
  } catch (error) {
    // If Firestore fetch fails, app will still render with empty state
    // and client-side components can fetch data independently
    console.error('[AppPage] Failed to fetch pandals:', error);
    fetchError = error instanceof Error ? error.message : 'Failed to load pandals';
  }

  const { pandal: initialSelectedPandalId } = await searchParams;

  return (
    <main className="h-screen w-screen overflow-hidden">
      <ErrorBoundary>
        <AuthGatedApp 
          initialPandals={pandals} 
          initialSelectedPandalId={initialSelectedPandalId}
          initialFetchError={fetchError}
        />
      </ErrorBoundary>
    </main>
  );
}
