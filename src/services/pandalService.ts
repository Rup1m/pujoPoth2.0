
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import type { Pandal } from '@/lib/types';
import type { Filters } from '@/components/filter-panel';
import { cache } from 'react';

/**
 * Fetches all pandals and metros from Firestore, merging them into a single list.
 *
 * Caching strategy (two layers):
 *  1. `React.cache()` — deduplicates within a single server-side render pass
 *     (e.g. if multiple components call `getPandals()` in the same request).
 *  2. Next.js ISR via `revalidate` on the page segment (`app/page.tsx`)
 *     controls how often the HTML is regenerated (every 600s).
 *
 * This replaces the previous `unstable_cache` usage (BUG 4) with stable,
 * production-safe APIs that won't silently break under load.
 */
export const getPandals = cache(async (): Promise<Pandal[]> => {
    try {
        console.log('Fetching fresh pandal data from Firestore...');

        // Pandals — critical data, failure propagates up
        const pandalsCollection = collection(db, 'pandals');
        const pandalSnapshot = await getDocs(pandalsCollection);

        if (pandalSnapshot.empty) {
            console.warn("Firestore 'pandals' collection is empty. You may need to seed it.");
        }

        const pandalList = pandalSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
            } as Pandal;
        });

        // Metros — optional data, app should still load without it
        let metroList: Pandal[] = [];
        try {
            const metrosCollection = collection(db, 'Metro');
            const metroSnapshot = await getDocs(metrosCollection);
            metroList = metroSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    type: 'metro', // Ensure the type is correctly set for metros
                } as Pandal;
            });
        } catch (metroError) {
            console.warn('[pandalService] Metro collection unavailable:', metroError);
        }

        // Combine pandals and metros into one list for the app to use
        return [...pandalList, ...metroList];

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("Error fetching from Firestore:", error);
        
        // During build time, Firebase credentials may be unavailable.
        // Throw with a descriptive error that won't break the build with dynamic=force-dynamic.
        if (errorMsg.includes('undefined') || errorMsg.includes('credential')) {
            throw new Error(
              `Firebase not initialized: ensure NEXT_PUBLIC_FIREBASE_* env vars are set in Vercel. ` +
              `During build, pages with dynamic=force-dynamic will skip prerendering and fetch on-demand instead.`
            );
        }
        
        throw new Error("Could not load pandal data from the database.");
    }
});


export async function getFilteredPandals(
  allPandals: Pandal[],
  filters: Filters
): Promise<Pandal[]> {
    const { north, south, central, bonedi, metro } = filters;
    
    // If metro is selected, show only metro stations
    if (metro) {
        return allPandals.filter(pandal => pandal.type === 'metro');
    }

    const noFiltersApplied = !north && !south && !central && !bonedi;
    
    if (noFiltersApplied) {
        // Return everything if no filters are on
        return allPandals;
    }

    return allPandals.filter(pandal => {
        // Exclude metros from regular pandal filtering if any zone/bonedi filter is active
        if (pandal.type === 'metro') {
            return false;
        }

        const zoneMatch = 
            (!north && !south && !central) || // if no zone is selected, all zones match
            (north && pandal.zone === 'North') ||
            (south && pandal.zone === 'South') ||
            (central && pandal.zone === 'Central');

        const bonediMatch = !bonedi || pandal.bonedi;
        
        return zoneMatch && bonediMatch;
    });
}
