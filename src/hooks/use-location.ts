/**
 * @fileoverview useLocation — encapsulates all GPS / geolocation logic.
 * Consumers receive the user's lat/lng, a loading status, and an
 * imperative `getLocation()` trigger so they never need to touch the
 * Geolocation API directly.
 */

"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

export type LocationStatus = "idle" | "loading" | "error" | "success";

export interface LatLng {
  lat: number;
  lng: number;
}

/** Default map centre — central Kolkata */
const KOLKATA_CENTER: LatLng = { lat: 22.5726, lng: 88.3639 };

export interface UseLocationReturn {
  location: LatLng | null;
  mapCenter: LatLng;
  status: LocationStatus;
  locationDenied: boolean;
  getLocation: () => void;
}

/**
 * Requests the user's GPS position, updates `location` and `mapCenter`,
 * and surfaces toast notifications on errors.
 *
 * On any failure the status is still set to "success" so the map can
 * render centred on Kolkata — consistent with the original behaviour.
 */
export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLng>(KOLKATA_CENTER);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [locationDenied, setLocationDenied] = useState(false);
  const { toast } = useToast();
  const { text } = useLanguage();

  const getLocation = useCallback(() => {
    setStatus("loading");

    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: text.locationError,
        description: text.geolocationNotSupported,
      });
      // Unblock the UI even when geolocation is absent.
      setLocationDenied(true);
      setStatus("success");
      return;
    }

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

        // Show the map centred on Kolkata even on error.
        if (err.code === err.PERMISSION_DENIED || err.code === err.POSITION_UNAVAILABLE) {
          setLocationDenied(true);
        }
        setStatus("success");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );
  }, [toast, text]);

  return { location, mapCenter, status, locationDenied, getLocation };
}
