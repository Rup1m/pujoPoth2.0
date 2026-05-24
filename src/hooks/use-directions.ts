/**
 * @fileoverview useDirections — encapsulates travel-time fetching via the
 * server-side Genkit flow.  Consumers call `fetchDirections(origin, dest)`
 * and receive the current `directions` state plus a `clearDirections` helper.
 */

"use client";

import { useState, useCallback } from "react";
import {
  getDirections,
  type DirectionsOutput,
} from "@/ai/flows/get-directions-flow";
import type { LatLng } from "@/hooks/use-location";

export interface UseDirectionsReturn {
  directions: DirectionsOutput | null;
  isFetchingDirections: boolean;
  fetchDirections: (origin: LatLng, destination: LatLng) => Promise<void>;
  clearDirections: () => void;
}

const DIRECTIONS_TIMEOUT_MS = 8000;

/**
 * Fetches walking / driving / transit travel times between two lat-lng points.
 * On any error the state is reset to `{ walking: null, driving: null, transit: null }`
 * so the UI degrades gracefully without crashing.
 *
 * `isFetchingDirections` is `true` while a request is in-flight and `false`
 * once it settles (success, error, or 8-second timeout).
 */
export function useDirections(): UseDirectionsReturn {
  const [directions, setDirections] = useState<DirectionsOutput | null>(null);
  const [isFetchingDirections, setIsFetchingDirections] = useState(false);

  const fetchDirections = useCallback(
    async (origin: LatLng, destination: LatLng) => {
      setDirections(null); // Reset before fetching so stale data is cleared.
      setIsFetchingDirections(true);
      try {
        const result = await Promise.race([
          getDirections({ origin, destination }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), DIRECTIONS_TIMEOUT_MS)
          ),
        ]);
        setDirections(result);
      } catch (err) {
        console.error("[useDirections] Failed to fetch directions:", err);
        setDirections({ walking: null, driving: null, transit: null });
      } finally {
        setIsFetchingDirections(false);
      }
    },
    []
  );

  const clearDirections = useCallback(() => {
    setDirections(null);
    setIsFetchingDirections(false);
  }, []);

  return { directions, isFetchingDirections, fetchDirections, clearDirections };
}
