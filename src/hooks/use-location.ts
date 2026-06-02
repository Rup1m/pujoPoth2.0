/**
 * @fileoverview useLocation — encapsulates all GPS / geolocation logic.
 * Consumers receive the user's lat/lng, a loading status, and an
 * imperative `getLocation()` trigger so they never need to touch the
 * Geolocation API directly.
 *
 * Optimizations:
 *  - Adaptive accuracy: uses low accuracy for speed, high accuracy only on retry
 *  - Location caching: reuses cached location if recent (<5min)
 *  - Smart timeouts: adaptive timeout based on accuracy level
 *  - Request deduplication: prevents multiple concurrent requests
 */

"use client";

import { useState, useCallback, useRef } from "react";
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

/**
 * Requests the user's GPS position, updates `location` and `mapCenter`,
 * and surfaces toast notifications on errors.
 *
 * On any failure the status is still set to "success" so the map can
 * render centred on Kolkata — consistent with the original behaviour.
 *
 * Uses adaptive accuracy: starts with low accuracy (fast, battery-efficient),
 * then retries with high accuracy if needed.
 */
export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLng>(KOLKATA_CENTER);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [locationDenied, setLocationDenied] = useState(false);
  const { toast } = useToast();
  const { text } = useLanguage();
  const requestInFlightRef = useRef(false);
  const locationCacheRef = useRef<CachedLocation | null>(null);

  const getLocation = useCallback(() => {
    // Prevent concurrent requests
    if (requestInFlightRef.current) return;

    // Check cache first
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

    // First attempt: low accuracy (fast, battery-efficient)
    navigator.geolocation.getCurrentPosition(
      (position) => {
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
