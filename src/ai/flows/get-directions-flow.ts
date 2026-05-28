
'use server';
/**
 * @fileOverview A flow to calculate travel time for multiple modes.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const DirectionsInputSchema = z.object({
  origin: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  destination: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

export type DirectionsInput = z.infer<typeof DirectionsInputSchema>;

const DirectionsOutputSchema = z.object({
    walking: z.string().nullable(),
    driving: z.string().nullable(),
    transit: z.string().nullable(),
});

export type DirectionsOutput = z.infer<typeof DirectionsOutputSchema>;


const getDirectionsFlow = ai.defineFlow(
    {
        name: 'getDirectionsFlow',
        inputSchema: DirectionsInputSchema,
        outputSchema: DirectionsOutputSchema,
    },
    async (input) => {
        const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
        if (!apiKey) {
            console.error("Google Maps API key is not configured in environment variables.");
            return { walking: null, driving: null, transit: null };
        }

        const fetchDirectionsForMode = async (mode: 'walking' | 'driving' | 'transit') => {
             const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${input.origin.lat},${input.origin.lng}&destination=${input.destination.lat},${input.destination.lng}&mode=${mode}&key=${apiKey}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            try {
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                const data = await response.json();

                if (data.status === 'OK' && data.routes?.[0]?.legs?.[0]?.duration?.text) {
                    return data.routes[0].legs[0].duration.text;
                }
                return null;
            } catch (error: unknown) {
                clearTimeout(timeoutId);
                if (error instanceof Error && error.name === 'AbortError') {
                    console.warn('[getDirections] timeout for mode:', mode);
                } else {
                    console.error('[getDirections] fetch error for mode:', mode, error);
                }
                return null;
            }
        }
        
        const [walking, driving, transit] = await Promise.all([
            fetchDirectionsForMode('walking'),
            fetchDirectionsForMode('driving'),
            fetchDirectionsForMode('transit'),
        ]);
        
        return { walking, driving, transit };
    }
);


export async function getDirections(input: DirectionsInput): Promise<DirectionsOutput> {
    return getDirectionsFlow(input);
}
