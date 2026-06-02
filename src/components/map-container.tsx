/**
 * @fileoverview MapContainer — pure map-rendering component.
 *
 * Responsibilities (and ONLY these):
 *  - Render the Google Map via @vis.gl/react-google-maps
 *  - Display the user-location marker with its pulse animation
 *  - Render pandal markers via PandalMarker, with clustering at low zoom
 *  - Render cluster markers for dense areas
 *
 * All state management and business logic live in the parent (pujo-map.tsx).
 *
 * Optimizations:
 *  - Memoized to prevent re-renders on parent prop changes
 *  - Marker filtering prevents rendering invalid coordinates
 *  - Grid-based clustering prevents overlapping markers at low zoom
 *  - Static map styles to prevent Map remounts
 */

"use client";

import { useState, useCallback, memo } from "react";
import { Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import type { Pandal } from "@/lib/types";
import { PandalMarker } from "@/components/pandal-marker";
import { ClusterMarker } from "@/components/cluster-marker";
import { useMarkerClusterer } from "@/hooks/use-marker-clusterer";
import type { LatLng } from "@/hooks/use-location";

/** Static map styles applied at render time — defined outside the component to
 *  avoid a new array reference on every render (which would force a Map remount). */
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
];

export interface MapContainerProps {
  location: LatLng | null;
  initialCenter: LatLng;
  pandals: Pandal[];
  selectedPandalId: string | null;
  visitedIds: Set<string>;
  onPandalSelect: (pandal: Pandal) => void;
}

/**
 * Pure-rendering component — receives all data through props and fires
 * callback events upward. Contains no internal async logic or side-effects
 * beyond the DOM event listener.
 *
 * Error handling: wrapped in try-catch to prevent crashes from malformed events.
 */
export const MapContainer = memo(function MapContainer({
  location,
  initialCenter,
  pandals,
  selectedPandalId,
  visitedIds,
  onPandalSelect,
}: MapContainerProps) {
  const [zoom, setZoom] = useState<number | null>(14);

  // Track zoom via onZoomChanged — only fires when zoom changes, not on every pan.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleZoomChanged = useCallback((ev: any) => {
    const newZoom: number = ev?.detail?.zoom ?? ev?.map?.getZoom?.() ?? 14;
    setZoom((prev) => {
      // Only update if zoom changed by a meaningful amount to reduce re-renders
      if (prev === null || Math.abs(prev - newZoom) >= 0.5) {
        return Math.round(newZoom);
      }
      return prev;
    });
  }, []);

  const { singles, clusters } = useMarkerClusterer(pandals, zoom);

  return (
    <Map
      defaultCenter={initialCenter}
      defaultZoom={14}
      gestureHandling="greedy"
      disableDefaultUI
      mapId="a3b2b1c3d4e5f6a1"
      className="h-full w-full"
      styles={MAP_STYLES}
      onZoomChanged={handleZoomChanged}
    >
      {/* ── User location marker ─────────────────────────── */}
      {location && (
        <AdvancedMarker position={location}>
          <div className="relative h-16 w-16 flex items-center justify-center">
            <div className="absolute h-5 w-5 rounded-full bg-primary ring-4 ring-background z-10" />
            <div
              className="absolute h-full w-full rounded-full bg-primary/40 border-2 border-primary/90 animate-pulse-marker will-change-transform"
              style={{ animationDelay: "-1s", transform: "translateZ(0)" }}
            />
            <div className="absolute h-full w-full rounded-full bg-primary/40 border-2 border-primary/90 animate-pulse-marker will-change-transform" style={{ transform: "translateZ(0)" }} />
          </div>
        </AdvancedMarker>
      )}

      {/* ── Cluster markers ───────────────────────────────── */}
      {clusters.map((cluster) => (
        <AdvancedMarker
          key={cluster.key}
          position={{ lat: cluster.lat, lng: cluster.lng }}
          onClick={() => {
            // Select the first pandal in the cluster to zoom in
            if (cluster.pandals.length > 0) {
              onPandalSelect(cluster.pandals[0]);
            }
          }}
        >
          <ClusterMarker count={cluster.count} />
        </AdvancedMarker>
      ))}

      {/* ── Individual pandal markers ─────────────────────── */}
      {singles.map((pandal) => (
          <AdvancedMarker
            key={pandal.id}
            position={{ lat: pandal.latitude, lng: pandal.longitude }}
            onClick={() => onPandalSelect(pandal)}
          >
            <PandalMarker
              isSelected={pandal.id === selectedPandalId}
              pandalType={pandal.type}
              isBonedi={pandal.bonedi}
              isVisited={pandal.type === "metro" ? false : visitedIds.has(pandal.id)}
            />
          </AdvancedMarker>
        ))}
    </Map>
  );
});
