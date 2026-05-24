
import { getPandals } from '@/services/pandalService';
import { AuthGatedApp } from './auth-gated-app';
import { ErrorBoundary } from '@/components/error-boundary';

/** Revalidate every 600 seconds (10 minutes) via ISR.
 *  Pandal data is static during Puja — this is more than sufficient. */
export const revalidate = 600;

export default async function AppPage() {
  // Fetch pandals on the server to make initial load faster.
  // If this fails, Next.js will show an error boundary.
  const pandals = await getPandals();

  return (
    <main className="h-screen w-screen overflow-hidden">
      <ErrorBoundary>
        <AuthGatedApp initialPandals={pandals} />
      </ErrorBoundary>
    </main>
  );
}
