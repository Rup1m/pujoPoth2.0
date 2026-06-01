
import { getPandals } from '@/services/pandalService';
import type { Pandal } from '@/lib/types';
import { AppPageClient } from './page-client';

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

  try {
    pandals = await getPandals();
  } catch {
    // On error, still render with empty pandals array
    // PujoMap will handle the error state
    console.error('Failed to load pandals');
  }

  const { pandal: initialSelectedPandalId } = await searchParams;

  return (
    <AppPageClient
      initialPandals={pandals}
      initialSelectedPandalId={initialSelectedPandalId}
    />
  );
}
