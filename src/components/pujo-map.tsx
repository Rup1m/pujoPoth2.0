/**
 * @fileoverview pujo-map.tsx — Orchestrator
 *
 * This file owns ONLY the composition of the app:
 *  - API provider setup
 *  - Onboarding gate (splash → language selection)
 *  - Pandal selection + filter state
 *  - Wiring hooks (useLocation, useDirections) to child components
 *  - Passing the useMap instance down for imperative pan/zoom
 *
 * KEY FIX: The map is NEVER blocked behind GPS location. The map
 * renders immediately with Kolkata center, and GPS updates the
 * location dot asynchronously — matching how Google Maps works.
 *
 * Extracted modules:
 *  - GPS logic      → src/hooks/use-location.ts
 *  - Directions     → src/hooks/use-directions.ts
 *  - Map rendering  → src/components/map-container.tsx
 *  - Control panel  → src/components/map-controls.tsx
 */

"use client";

import {
  APIProvider,
  useMap,
} from "@vis.gl/react-google-maps";
import { useState, useEffect, useCallback, useRef, memo, useLayoutEffect } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, MapPin, Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "@/hooks/use-location";
import { useDirections } from "@/hooks/use-directions";
import { useVisitedPandals } from "@/hooks/use-visited-pandals";
import type { Pandal } from "@/lib/types";
import { getFilteredPandals } from "@/services/pandalService";
import type { Filters } from "@/components/filter-panel";
import { haversineDistance } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { PandalSearch } from "@/components/pandal-search";
import { MapContainer } from "@/components/map-container";
import { MapControls } from "@/components/map-controls";
import { SplashScreen } from "@/components/splash-screen";
import { LanguageOnboarding } from "@/components/language-onboarding";
import { useAuth } from "@/hooks/use-auth";
import { AuthScreen } from "@/components/auth-screen";

// ── Lazy-loaded heavy components ─────────────────────────────────────────────

const PandalHub = dynamic(
  () => import("@/components/pandal-hub").then((m) => m.PandalHub),
  {
    ssr: false,
    loading: () => null,
  }
);

// ── Non-blocking Location Pill ───────────────────────────────────────────────

type LocationPillState = "locating" | "located" | "denied" | "hidden";

function LocationPill({ state }: { state: LocationPillState }) {
  if (state === "hidden") return null;

  return (
    <div
      className={`
        absolute top-3 left-1/2 -translate-x-1/2 z-20
        flex items-center gap-2 px-4 py-2
        rounded-full backdrop-blur-md border shadow-lg
        transition-all duration-500 ease-out
        ${state === "denied"
          ? "bg-amber-50/90 border-amber-300/60 text-amber-800"
          : state === "located"
            ? "bg-emerald-50/90 border-emerald-300/60 text-emerald-800"
            : "bg-background/90 border-border/60 text-foreground"
        }
        animate-fade-in-up
      `}
    >
      {state === "locating" && (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span className="text-xs font-semibold">Locating you...</span>
        </>
      )}
      {state === "located" && (
        <>
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </div>
          <span className="text-xs font-semibold">Location found</span>
        </>
      )}
      {state === "denied" && (
        <>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-semibold">Location unavailable — showing Kolkata</span>
        </>
      )}
    </div>
  );
}

// ── MapCore — inner component that has access to the useMap() hook ─────────────

interface MapCoreProps {
  location: { lat: number; lng: number } | null;
  locationDenied: boolean;
  locationPillState: LocationPillState;
  initialPandals: Pandal[];
  initialCenter: { lat: number; lng: number };
  initialSelectedPandalId?: string;
}

/**
 * MapCore must be a child of <APIProvider> to call useMap().
 * It orchestrates pandal selection, suggestion calculation, filtering,
 * and imperative map navigation — delegating all rendering to focused children.
 */
function MapCore({ location, locationDenied, locationPillState, initialPandals, initialCenter, initialSelectedPandalId }: MapCoreProps) {
  const mapInstance = useMap();
  const { text } = useLanguage();
  const { toast } = useToast();
  const { directions, isFetchingDirections, fetchDirections, clearDirections } = useDirections();
  const { visitedIds, toggleVisited } = useVisitedPandals();

  const [displayedPandals, setDisplayedPandals] = useState<Pandal[]>(() => 
    initialPandals.filter(
      (p) =>
        typeof p.latitude === "number" &&
        typeof p.longitude === "number" &&
        isFinite(p.latitude) &&
        isFinite(p.longitude)
    )
  );
  const [selectedPandal, setSelectedPandal] = useState<Pandal | null>(null);
  const [suggestedPandals, setSuggestedPandals] = useState<
    (Pandal & { distance: number })[]
  >([]);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const directionsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Suggestion calculation ────────────────────────────────────────────────

  const calculateSuggestions = useCallback(
    (current: Pandal) => {
      const suggestions = initialPandals
        .filter((p) => p.id !== current.id && p.type !== "metro")
        .map((p) => ({
          ...p,
          distance: haversineDistance(
            { lat: current.latitude, lng: current.longitude },
            { lat: p.latitude, lng: p.longitude }
          ),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);

      setSuggestedPandals(suggestions);
    },
    [initialPandals]
  );

  // ── Pandal selection handler ──────────────────────────────────────────────

  const handlePandalSelect = useCallback(
    async (pandal: Pandal) => {
      // Toggle deselect
      if (pandal.id === selectedPandal?.id) {
        setSelectedPandal(null);
        setSuggestedPandals([]);
        clearDirections();
        return;
      }

      setSelectedPandal(pandal);
      calculateSuggestions(pandal);
      trackEvent('pandal_clicked', { pandal_name: pandal.name, type: pandal.type, zone: pandal.zone ?? 'unknown', source: 'marker' });

      // Imperatively pan/zoom the map
      if (mapInstance) {
        mapInstance.panTo({ lat: pandal.latitude, lng: pandal.longitude });
        if ((mapInstance.getZoom() ?? 0) < 15) mapInstance.setZoom(15);
      }

      // Fetch directions only when we have the user's location (debounced)
      if (location) {
        // Clear any pending debounced fetch from a previous rapid selection
        if (directionsDebounceRef.current) {
          clearTimeout(directionsDebounceRef.current);
        }
        directionsDebounceRef.current = setTimeout(() => {
          fetchDirections(location, {
            lat: pandal.latitude,
            lng: pandal.longitude,
          });
        }, 500);
      }
    },
    [
      selectedPandal?.id,
      calculateSuggestions,
      mapInstance,
      location,
      fetchDirections,
      clearDirections,
    ]
  );

  const handlePandalDeselect = useCallback(() => {
    if (directionsDebounceRef.current) {
      clearTimeout(directionsDebounceRef.current);
    }
    setSelectedPandal(null);
    setSuggestedPandals([]);
    clearDirections();
  }, [clearDirections]);

  // ── Deep-link auto-select ─────────────────────────────────────────────────

  const deepLinkHandledRef = useRef(false);
  useEffect(() => {
    if (
      initialSelectedPandalId &&
      initialPandals.length > 0 &&
      !deepLinkHandledRef.current &&
      mapInstance // Wait deterministically for the Google Map engine to be ready
    ) {
      const target = initialPandals.find((p) => p.id === initialSelectedPandalId);
      if (target) {
        deepLinkHandledRef.current = true;
        handlePandalSelect(target);
      }
    }
  }, [initialSelectedPandalId, initialPandals, handlePandalSelect, mapInstance]);

  // ── Pan to user location when GPS resolves (one-time) ─────────────────────

  const hasPannedToLocationRef = useRef(false);
  useEffect(() => {
    if (location && mapInstance && !hasPannedToLocationRef.current && !initialSelectedPandalId) {
      hasPannedToLocationRef.current = true;
      mapInstance.panTo(location);
    }
  }, [location, mapInstance, initialSelectedPandalId]);

  // ── Recenter handler ──────────────────────────────────────────────────────

  const handleRecenter = useCallback(() => {
    if (location && mapInstance) {
      mapInstance.panTo(location);
      if ((mapInstance.getZoom() ?? 0) < 15) mapInstance.setZoom(15);
    }
  }, [location, mapInstance]);

  // ── Filter handler ────────────────────────────────────────────────────────

  const handleFilterChange = useCallback(
    (filters: Filters) => {
      const filtered = getFilteredPandals(initialPandals, filters);
      const validFiltered = filtered.filter(
        (p) =>
          typeof p.latitude === "number" &&
          typeof p.longitude === "number" &&
          isFinite(p.latitude) &&
          isFinite(p.longitude)
      );
      setDisplayedPandals(validFiltered);
      setSelectedPandal(null);
      setSuggestedPandals([]);
      clearDirections();

      const anyFilterActive =
        filters.north ||
        filters.south ||
        filters.central ||
        filters.bonedi ||
        filters.metro;
      if (filtered.length === 0 && anyFilterActive) {
        toast({
          title: text.noPandalsFound,
          description: "Try changing your filter selection.",
          variant: "destructive",
        });
      }
    },
    [initialPandals, text.noPandalsFound, toast, clearDirections]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Non-blocking location pill */}
      <LocationPill state={locationPillState} />

      {/* Search bar */}
      <PandalSearch pandals={initialPandals} onSelect={handlePandalSelect} />

      {/* Pure map + markers */}
      <MapContainer
        location={location}
        initialCenter={initialCenter}
        pandals={displayedPandals}
        selectedPandalId={selectedPandal?.id ?? null}
        visitedIds={visitedIds}
        onPandalSelect={handlePandalSelect}
      />

      {/* Detail sheet — lazy loaded */}
      <PandalHub
        pandal={selectedPandal}
        location={location}
        directions={directions}
        isFetchingDirections={isFetchingDirections}
        suggestions={suggestedPandals}
        onSuggestionSelect={handlePandalSelect}
        onClose={handlePandalDeselect}
        onToggleVisited={toggleVisited}
        visitedIds={visitedIds}
      />

      {/* Floating action buttons */}
      <MapControls
        onRecenter={handleRecenter}
        onFilterChange={handleFilterChange}
        isAboutOpen={isAboutOpen}
        onAboutOpenChange={setIsAboutOpen}
      />

      {/* Location denied banner */}
      {locationDenied && (
        <div className="absolute top-[72px] left-4 right-4 z-10 flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-amber-400/50 rounded-xl px-4 py-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-foreground">
            Location unavailable — showing central Kolkata. Directions disabled.
          </p>
        </div>
      )}
    </>
  );
}

// Memoised + dynamically imported so the map chunk is never SSR'd
const DynamicMapCore = dynamic(() => Promise.resolve(memo(MapCore)), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 flex justify-between items-center">
        <Skeleton className="h-12 w-full max-w-sm" />
      </div>
      <Skeleton className="flex-grow w-full h-full" />
    </div>
  ),
});

// ── Public default export — the outermost orchestrator ───────────────────────

export default function PujoMap({
  initialPandals,
  initialSelectedPandalId,
}: {
  initialPandals: Pandal[];
  initialSelectedPandalId?: string;
}) {
  const [isClient, setIsClient] = useState(false);
  const [animComplete, setAnimComplete] = useState(false);
  const [langSelected, setLangSelected] = useState(false);
  const { text } = useLanguage();
  const { location, mapCenter, status, locationDenied, getLocation } = useLocation();
  const { user, loading: authLoading } = useAuth();

  // ── Auth loading timeout — avoid infinite spinner if Firebase is unreachable ──
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const authTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (authLoading && !authTimedOut) {
      authTimeoutRef.current = setTimeout(() => {
        setAuthTimedOut(true);
      }, 5000);
    } else if (!authLoading && authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
      setAuthTimedOut(false);
    }
    return () => {
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, [authLoading, authTimedOut]);

  // ── Location pill state machine ────────────────────────────────────────────
  const [locationPillState, setLocationPillState] = useState<LocationPillState>("hidden");
  const pillDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track location status transitions for the pill
  useEffect(() => {
    if (status === "loading") {
      setLocationPillState("locating");
    } else if (status === "success" && locationDenied) {
      setLocationPillState("denied");
      // Auto-dismiss after 4s
      pillDismissTimerRef.current = setTimeout(() => {
        setLocationPillState("hidden");
      }, 4000);
    } else if (status === "success" && location) {
      setLocationPillState("located");
      // Auto-dismiss after 2s
      pillDismissTimerRef.current = setTimeout(() => {
        setLocationPillState("hidden");
      }, 2000);
    } else if (status === "success") {
      // Success but no location (denied without explicit denial flag)
      setLocationPillState("hidden");
    }

    return () => {
      if (pillDismissTimerRef.current) {
        clearTimeout(pillDismissTimerRef.current);
      }
    };
  }, [status, locationDenied, location]);

  // ── Client-side initialisation ────────────────────────────────────────────
  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    const storedLang = localStorage.getItem("lang");
    if (storedLang) {
      // Returning user: bypass splash + language screen entirely
      setIsClient(true);
      setAnimComplete(true);
      setLangSelected(true);
    } else {
      setIsClient(true);
    }
  }, []);

  /** Called by SplashScreen once the minimum animation duration elapses. */
  const handleAnimationComplete = useCallback(() => {
    setAnimComplete(true);
  }, []);

  // Trigger GPS once language is confirmed — fire and forget,
  // the map renders immediately regardless of GPS outcome
  useEffect(() => {
    if (isClient && langSelected && status === "idle") {
      getLocation();
    }
  }, [isClient, langSelected, status, getLocation]);

  // ── Onboarding gates ──────────────────────────────────────────────────────
  // Splash stays visible until BOTH: (a) client hydrated, and (b) animation floor reached.

  if (!isClient || !animComplete) return <SplashScreen onAnimationComplete={handleAnimationComplete} />;

  if (!langSelected) {
    return (
      <LanguageOnboarding onLanguageSelect={() => setLangSelected(true)} />
    );
  }

  // ── Auth Gate ─────────────────────────────────────────────────────────────
  if (authLoading) {
    // Show a timeout message instead of infinite spinner after 5s
    if (authTimedOut) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-background gap-4 p-4 animate-fade-in">
          <h1 className="font-calligraphy text-4xl text-primary drop-shadow-sm">
            Pujo<span className="text-foreground">পথ</span>
          </h1>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            {text.authLoadingTimeout}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm transition-transform active:scale-95"
          >
            {text.retry}
          </button>
        </div>
      );
    }

    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full shadow-lg border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle />
              {text.configError}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{text.apiKeyMissing}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Map — renders IMMEDIATELY, no location gate ───────────────────────────
  // GPS location updates the blue dot and pans the map asynchronously.
  // This matches how Google Maps itself works — map first, blue dot later.

  return (
    <div className="h-full w-full relative">
      <APIProvider
        apiKey={apiKey}
        solutionChannel="GMP_visgl_rgm_devrel_v1_pujopath"
      >
        <DynamicMapCore
          location={location}
          locationDenied={locationDenied}
          locationPillState={locationPillState}
          initialPandals={initialPandals}
          initialCenter={mapCenter}
          initialSelectedPandalId={initialSelectedPandalId}
        />
      </APIProvider>
    </div>
  );
}
