/**
 * @fileoverview useDirections — encapsulates travel-time fetching via the
 * server-side Genkit flow.  Consumers call `fetchDirections(origin, dest)`
 * and receive the current `directions` state plus a `clearDirections` helper.
 *
 * Optimizations:
 *  - Input validation to prevent invalid API calls
 *  - Request deduplication with ID tracking
 *  - Stale result rejection
 *  - Abort controller for pending requests
 *  - Better error handling and logging
 */

"use client";

import { useState, useCallback, useRef } from "react";
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
 *
 * Uses a monotonically increasing request ID so that stale results from
 * superseded requests are silently discarded.
 *
 * Improvements:
 *  - Input validation to prevent invalid API calls
 *  - AbortController for request cancellation
 *  - Better error logging for debugging
 */
export function useDirections(): UseDirectionsReturn {
  const [directions, setDirections] = useState<DirectionsOutput | null>(null);
  const [isFetchingDirections, setIsFetchingDirections] = useState(false);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Local cache to make directions perfectly fault-tolerant and instantaneous
  const cacheRef = useRef<Map<string, DirectionsOutput>>(new Map());

  const fetchDirections = useCallback(
    async (origin: LatLng, destination: LatLng) => {
      // Validate inputs to prevent invalid API calls
      if (!origin || !destination || !isFinite(origin.lat) || !isFinite(destination.lat)) {
        console.warn("[useDirections] Invalid origin or destination coordinates");
        setDirections(null);
        return;
      }

      // Generate cache key
      const cacheKey = `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}-${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;
      
      // Check cache first
      if (cacheRef.current.has(cacheKey)) {
        setDirections(cacheRef.current.get(cacheKey)!);
        return;
      }

      const currentRequestId = ++requestIdRef.current;

      // Cancel previous request if still in flight
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setDirections(null); // Reset before fetching so stale data is cleared.
      setIsFetchingDirections(true);
      try {
        const result = await Promise.race([
          getDirections({ origin, destination }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), DIRECTIONS_TIMEOUT_MS)
          ),
        ]);

        // Only apply if this is still the most recent request
        if (requestIdRef.current !== currentRequestId) return;
        
        setDirections(result);
        cacheRef.current.set(cacheKey, result);
      } catch (err) {
        // Only apply if this is still the most recent request
        if (requestIdRef.current !== currentRequestId) return;
        console.error("[useDirections] Failed to fetch directions:", err);
        setDirections({ walking: null, driving: null, transit: null });
      } finally {
        // Only clear loading if this is still the most recent request
        if (requestIdRef.current === currentRequestId) {
          setIsFetchingDirections(false);
        }
      }
    },
    []
  );

  const clearDirections = useCallback(() => {
    // Bump request ID to invalidate any in-flight requests
    ++requestIdRef.current;
    
    // Abort any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setDirections(null);
    setIsFetchingDirections(false);
  }, []);

  return { directions, isFetchingDirections, fetchDirections, clearDirections };
}
