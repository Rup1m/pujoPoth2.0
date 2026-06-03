/**
 * @fileoverview useLocation — encapsulates all GPS / geolocation logic.
 * Consumers receive the user's lat/lng, a loading status, and an
 * imperative `getLocation()` trigger so they never need to touch the
 * Geolocation API directly.
 *
 * Optimizations:
 *  - Adaptive accuracy: uses low accuracy for speed, high accuracy only on retry
 *  - Location caching: reuses cached location if recent (<5min), persisted to sessionStorage
 *  - Smart timeouts: adaptive timeout based on accuracy level
 *  - Request deduplication: prevents multiple concurrent requests
 *  - Hard safety timeout: forces success after 8s even if browser hangs
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

export type LocationStatus = "idle" | "loading" | "error" | "success";

export interface LatLng {
  lat: number;
  lng: number;
}

/** Default map centre — central Kolkata */
const KOLKATA_CENTER: LatLng = { lat: 22.5726, lng: 88.3639 };

/** Cache location for 5 minutes to reduce repeated GPS requests */
const LOCATION_CACHE_DURATION = 5 * 60 * 1000;

/** Hard safety timeout — if browser geolocation silently hangs, force success after this */
const HARD_SAFETY_TIMEOUT_MS = 8_000;

/** SessionStorage key for persisting location across in-session navigations */
const SESSION_LOCATION_KEY = "pujopath_location";

export interface UseLocationReturn {
  location: LatLng | null;
  mapCenter: LatLng;
  status: LocationStatus;
  locationDenied: boolean;
  getLocation: () => void;
}

interface CachedLocation {
  data: LatLng;
  timestamp: number;
}

/** Try to restore a recent location from sessionStorage for instant load */
function getSessionCachedLocation(): CachedLocation | null {
  try {
    const stored = sessionStorage.getItem(SESSION_LOCATION_KEY);
    if (stored) {
      const parsed: CachedLocation = JSON.parse(stored);
      const age = Date.now() - parsed.timestamp;
      if (age < LOCATION_CACHE_DURATION && parsed.data?.lat && parsed.data?.lng) {
        return parsed;
      }
    }
  } catch {
    // sessionStorage not available or corrupted — ignore
  }
  return null;
}

/** Persist location to sessionStorage for instant restore on navigation */
function setSessionCachedLocation(location: LatLng): void {
  try {
    const entry: CachedLocation = { data: location, timestamp: Date.now() };
    sessionStorage.setItem(SESSION_LOCATION_KEY, JSON.stringify(entry));
  } catch {
    // Quota exceeded or unavailable — ignore
  }
}

/**
 * Requests the user's GPS position, updates `location` and `mapCenter`,
 * and surfaces toast notifications on errors.
 *
 * On any failure the status is still set to "success" so the map can
 * render centred on Kolkata — consistent with the original behaviour.
 *
 * Uses adaptive accuracy: starts with low accuracy (fast, battery-efficient),
 * then retries with high accuracy if needed.
 *
 * SAFETY: A hard 8-second timeout ensures the hook ALWAYS resolves,
 * even if the browser's geolocation silently drops the request (common
 * on Samsung Internet, UC Browser, older Android WebView).
 */
export function useLocation(): UseLocationReturn {
  // Initialize from sessionStorage for instant location on in-session navigation
  const sessionCached = typeof window !== "undefined" ? getSessionCachedLocation() : null;

  const [location, setLocation] = useState<LatLng | null>(sessionCached?.data ?? null);
  const [mapCenter, setMapCenter] = useState<LatLng>(sessionCached?.data ?? KOLKATA_CENTER);
  const [status, setStatus] = useState<LocationStatus>(sessionCached ? "success" : "idle");
  const [locationDenied, setLocationDenied] = useState(false);
  const { toast } = useToast();
  const { text } = useLanguage();
  const requestInFlightRef = useRef(false);
  const locationCacheRef = useRef<CachedLocation | null>(sessionCached);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup safety timeout on unmount
  useEffect(() => {
    return () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
    };
  }, []);

  const getLocation = useCallback(() => {
    // Prevent concurrent requests
    if (requestInFlightRef.current) return;

    // Check in-memory cache first
    if (locationCacheRef.current) {
      const age = Date.now() - locationCacheRef.current.timestamp;
      if (age < LOCATION_CACHE_DURATION) {
        setLocation(locationCacheRef.current.data);
        setMapCenter(locationCacheRef.current.data);
        setLocationDenied(false);
        setStatus("success");
        return;
      }
    }

    requestInFlightRef.current = true;
    setStatus("loading");

    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: text.locationError,
        description: text.geolocationNotSupported,
      });
      setLocationDenied(true);
      setStatus("success");
      requestInFlightRef.current = false;
      return;
    }

    // ── Hard safety timeout ──────────────────────────────────────────────
    // Some browsers silently drop geolocation requests without calling
    // either the success or error callback. This ensures we ALWAYS resolve.
    safetyTimeoutRef.current = setTimeout(() => {
      if (requestInFlightRef.current) {
        console.warn("[useLocation] Hard safety timeout reached — forcing success");
        requestInFlightRef.current = false;
        setStatus("success");
      }
    }, HARD_SAFETY_TIMEOUT_MS);

    /** Helper to clear the safety timeout once a real response arrives */
    const clearSafetyTimeout = () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    };

    // First attempt: low accuracy (fast, battery-efficient)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearSafetyTimeout();
        const newLocation: LatLng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(newLocation);
        setMapCenter(newLocation);
        setLocationDenied(false);
        setStatus("success");
        locationCacheRef.current = {
          data: newLocation,
          timestamp: Date.now(),
        };
        setSessionCachedLocation(newLocation);

        // If accuracy is poor (>200m), silently retry with high accuracy
        if (position.coords.accuracy > 200) {
          navigator.geolocation.getCurrentPosition(
            (highAccPos) => {
              if (highAccPos.coords.accuracy < position.coords.accuracy) {
                const improvedLocation: LatLng = {
                  lat: highAccPos.coords.latitude,
                  lng: highAccPos.coords.longitude,
                };
                setLocation(improvedLocation);
                setMapCenter(improvedLocation);
                locationCacheRef.current = {
                  data: improvedLocation,
                  timestamp: Date.now(),
                };
                setSessionCachedLocation(improvedLocation);
              }
              requestInFlightRef.current = false;
            },
            () => {
              // Silent fail — keep the low-accuracy result
              requestInFlightRef.current = false;
            },
            { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 }
          );
        } else {
          requestInFlightRef.current = false;
        }
      },
      (err) => {
        clearSafetyTimeout();
        let description = text.locationErrorUnknown;
        if (err.code === err.PERMISSION_DENIED)
          description = text.locationPermissionDenied;
        if (err.code === err.POSITION_UNAVAILABLE)
          description = text.locationUnavailable;
        if (err.code === err.TIMEOUT) description = text.locationTimeout;

        toast({
          variant: "destructive",
          title: text.locationError,
          description,
        });

        if (err.code === err.PERMISSION_DENIED || err.code === err.POSITION_UNAVAILABLE) {
          setLocationDenied(true);
        }
        setStatus("success");
        requestInFlightRef.current = false;
      },
      {
        // Adaptive accuracy: start with low accuracy for speed and battery efficiency
        enableHighAccuracy: false,
        // Adaptive timeout: 6s for low accuracy (fast first attempt)
        timeout: 6_000,
        // Accept cached results up to 30 seconds old for better UX
        maximumAge: 30_000,
      }
    );
  }, [toast, text]);

  return { location, mapCenter, status, locationDenied, getLocation };
}
