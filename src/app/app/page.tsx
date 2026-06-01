
import { getPandals } from '@/services/pandalService';
import { ErrorBoundary } from '@/components/error-boundary';
import PujoMap from '@/components/pujo-map';
import type { Pandal } from '@/lib/types';

/**
 * Dynamic route prevents prerendering at build time (when Firebase credentials may be unavailable).
 * The page will render on-demand for each request in production.
 * This avoids "Failed to collect page data" errors during Vercel builds.
 */
export const dynamic = 'force-dynamic';

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
  } catch {
    fetchError = 'Failed to load pandals';
  }

  const { pandal: initialSelectedPandalId } = await searchParams;

  return (
    <main className="h-screen w-screen overflow-hidden">
      <ErrorBoundary>
        <PujoMap 
          initialPandals={pandals} 
          initialSelectedPandalId={initialSelectedPandalId}
        />
      </ErrorBoundary>
    </main>
  );
}
