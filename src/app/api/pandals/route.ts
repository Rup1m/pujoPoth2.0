import { NextResponse } from 'next/server';
import { getPandals } from '@/services/pandalService';

export const dynamic = 'force-dynamic';

/**
 * API Route to fetch pandals.
 * Used as a fallback when server-side rendering fails during build or
 * when Firebase credentials are unavailable at build time.
 */
export async function GET() {
  try {
    const pandals = await getPandals();
    return NextResponse.json(pandals, {
      headers: {
        'Cache-Control': 'public, max-age=600, s-maxage=600, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('[API /pandals] Error fetching pandals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pandals' },
      { status: 500 }
    );
  }
}
