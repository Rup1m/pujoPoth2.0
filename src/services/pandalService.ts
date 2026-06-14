
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
        const pandalsCollection = collection(db(), 'pandals');
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
            const metrosCollection = collection(db(), 'Metro');
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

        // Filter out metro entries from pandals to avoid duplicates —
        // the Metro collection is the source of truth for metro stations.
        const filteredPandalList = pandalList.filter(p => p.type !== 'metro');

        // Combine pandals and metros into one list for the app to use
        return [...filteredPandalList, ...metroList];

    } catch (error) {
        console.error('[pandalService] Firestore fetch failed:', error);
        return [];
    }
});


export function getFilteredPandals(
  allPandals: Pandal[],
  filters: Filters,
  visitedIds: Set<string>
): Pandal[] {
    const { north, south, central, bonedi, metro, visited } = filters;
    
    // If metro is selected, show only metro stations
    if (metro) {
        return allPandals.filter(pandal => pandal.type === 'metro');
    }

    const noFiltersApplied = !north && !south && !central && !bonedi && !visited;
    
    if (noFiltersApplied) {
        // Return everything if no filters are on
        return allPandals;
    }

    return allPandals.filter(pandal => {
        // Exclude metros from regular pandal filtering if any zone/bonedi/visited filter is active
        if (pandal.type === 'metro') {
            return false;
        }

        const zoneMatch = 
            (!north && !south && !central) || // if no zone is selected, all zones match
            (north && pandal.zone === 'North') ||
            (south && pandal.zone === 'South') ||
            (central && pandal.zone === 'Central');

        const bonediMatch = !bonedi || pandal.bonedi;
        
        const visitedMatch = !visited || visitedIds.has(pandal.id);
        
        return zoneMatch && bonediMatch && visitedMatch;
    });
}
