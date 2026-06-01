/**
 * @fileoverview pujo-map.tsx — Orchestrator
 *
 * This file owns ONLY the composition of the app:
 *  - API provider setup
 *  - Onboarding gate (splash → language selection → GPS)
 *  - Pandal selection + filter state
 *  - Wiring hooks (useLocation, useDirections) to child components
 *  - Passing the useMap instance down for imperative pan/zoom
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
import { useState, useEffect, useCallback, useRef, memo } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle } from "lucide-react";
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

// ── Lazy-loaded heavy components ─────────────────────────────────────────────

const PandalHub = dynamic(
  () => import("@/components/pandal-hub").then((m) => m.PandalHub),
  {
    ssr: false,
    loading: () => (
      <div className="absolute bottom-4 right-4 z-20">
        <Skeleton className="h-48 w-full max-w-sm" />
      </div>
    ),
  }
);

// ── Loading animation ─────────────────────────────────────────────────────────

const CardioLoadingAnimation = () => (
  <div className="w-48 h-32 flex items-center justify-center">
    <svg
      className="w-[100px] h-auto text-foreground"
      viewBox="0 0 50 31.25"
      preserveAspectRatio="xMidYMid"
    >
      <path
        className="opacity-20"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        pathLength="100"
        d="M0.625 21.5 h10.25 l3.75 -5.875 l7.375 15 l9.75 -30 l7.375 20.875 v0 h10.25"
      />
      <path
        className="animate-travel-fade"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeDasharray="100"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="100"
        d="M0.625 21.5 h10.25 l3.75 -5.875 l7.375 15 l9.75 -30 l7.375 20.875 v0 h10.25"
      />
    </svg>
  </div>
);

// ── MapCore — inner component that has access to the useMap() hook ─────────────

interface MapCoreProps {
  location: { lat: number; lng: number } | null;
  locationDenied: boolean;
  initialPandals: Pandal[];
  initialCenter: { lat: number; lng: number };
  initialSelectedPandalId?: string;
}

/**
 * MapCore must be a child of <APIProvider> to call useMap().
 * It orchestrates pandal selection, suggestion calculation, filtering,
 * and imperative map navigation — delegating all rendering to focused children.
 */
function MapCore({ location, locationDenied, initialPandals, initialCenter, initialSelectedPandalId }: MapCoreProps) {
  const mapInstance = useMap();
  const { text } = useLanguage();
  const { toast } = useToast();
  const { directions, isFetchingDirections, fetchDirections, clearDirections } = useDirections();
  const { visitedIds, toggleVisited } = useVisitedPandals(null);

  const [displayedPandals, setDisplayedPandals] =
    useState<Pandal[]>(initialPandals);
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
      !deepLinkHandledRef.current
    ) {
      const target = initialPandals.find((p) => p.id === initialSelectedPandalId);
      if (target) {
        deepLinkHandledRef.current = true;
        // Delay to ensure the map tiles and markers are fully initialised
        const timer = setTimeout(() => {
          handlePandalSelect(target);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [initialSelectedPandalId, initialPandals, handlePandalSelect]);

  // ── Recenter handler ──────────────────────────────────────────────────────

  const handleRecenter = useCallback(() => {
    if (location && mapInstance) {
      mapInstance.panTo(location);
      if ((mapInstance.getZoom() ?? 0) < 15) mapInstance.setZoom(15);
    }
  }, [location, mapInstance]);

  // ── Filter handler ────────────────────────────────────────────────────────

  const handleFilterChange = useCallback(
    async (filters: Filters) => {
      const filtered = await getFilteredPandals(initialPandals, filters);
      setDisplayedPandals(filtered);
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
      {/* Search bar — emits custom DOM events consumed by MapContainer */}
      <PandalSearch pandals={initialPandals} />

      {/* Pure map + markers */}
      <MapContainer
        location={location}
        initialCenter={initialCenter}
        pandals={displayedPandals}
        selectedPandalId={selectedPandal?.id ?? null}
        visitedIds={visitedIds}
        onPandalSelect={handlePandalSelect}
        onPandalDeselect={handlePandalDeselect}
      />

      {/* Detail sheet — lazy loaded */}
      {selectedPandal && (
        <PandalHub
          pandal={selectedPandal}
          location={location}
          directions={directions}
          isFetchingDirections={isFetchingDirections}
          suggestions={suggestedPandals}
          onSuggestionSelect={handlePandalSelect}
          onClose={handlePandalDeselect}
          visitedIds={visitedIds}
          onToggleVisited={toggleVisited}
          userId={null}
        />
      )}

      {/* Floating action buttons */}
      <MapControls
        onRecenter={handleRecenter}
        onFilterChange={handleFilterChange}
        isAboutOpen={isAboutOpen}
        onAboutOpenChange={setIsAboutOpen}
        visitedIds={visitedIds}
        allPandals={initialPandals}
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

  // ── Client-side initialisation ────────────────────────────────────────────

  useEffect(() => {
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

  // Trigger GPS once language is confirmed
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

  if (status === "loading") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-background gap-4">
        <CardioLoadingAnimation />
        <p className="text-lg font-semibold text-foreground animate-pulse">
          {text.findingLocation}
        </p>
      </div>
    );
  }

  // ── Map ───────────────────────────────────────────────────────────────────

  return (
    <div className="h-full w-full relative">
      <APIProvider
        apiKey={apiKey}
        solutionChannel="GMP_visgl_rgm_devrel_v1_pujopath"
      >
        <DynamicMapCore
          location={location}
          locationDenied={locationDenied}
          initialPandals={initialPandals}
          initialCenter={mapCenter}
          initialSelectedPandalId={initialSelectedPandalId}
        />
      </APIProvider>
    </div>
  );
}
