
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
        const pandalsCollection = collection(db, 'pandals');
        const metrosCollection = collection(db, 'Metro');

        // Fetch both collections in parallel for efficiency
        const [pandalSnapshot, metroSnapshot] = await Promise.all([
            getDocs(pandalsCollection),
            getDocs(metrosCollection)
        ]);

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
        
        const metroList = metroSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                type: 'metro', // Ensure the type is correctly set for metros
            } as Pandal;
        });

        // Combine pandals and metros into one list for the app to use
        return [...pandalList, ...metroList];

    } catch (error) {
        console.error("Error fetching from Firestore:", error);
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
