/**
 * @fileoverview useFirstLocationPrompt — requests location permission on first app visit.
 * Only prompts once per device/browser using localStorage flag.
 * Automatically triggers location permission request when called.
 */

"use client";

import { useEffect, useCallback } from "react";
import { useLocation } from "@/hooks/use-location";

const LOCATION_PERMISSION_KEY = "pujopoth_location_permission_requested";

export interface UseFirstLocationPromptReturn {
  hasRequestedLocation: boolean;
  resetLocationPrompt: () => void;
}

/**
 * Hook to request location permission automatically on first app visit.
 * Uses localStorage to ensure prompt only shows once per device.
 * Should be called early in the app (e.g., in layout or app page).
 */
export function useFirstLocationPrompt(): UseFirstLocationPromptReturn {
  const { getLocation } = useLocation();

  useEffect(() => {
    // Only request location on client-side to avoid hydration mismatch
    const hasRequested = localStorage.getItem(LOCATION_PERMISSION_KEY);
    
    if (!hasRequested) {
      // Mark that we've requested permission
      localStorage.setItem(LOCATION_PERMISSION_KEY, "true");
      
      // Trigger location request with a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        getLocation();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [getLocation]);

  const resetLocationPrompt = useCallback(() => {
    localStorage.removeItem(LOCATION_PERMISSION_KEY);
  }, []);

  return {
    hasRequestedLocation: !!localStorage.getItem(LOCATION_PERMISSION_KEY),
    resetLocationPrompt,
  };
}
