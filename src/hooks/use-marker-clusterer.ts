/**
 * @fileoverview useMarkerClusterer — viewport-aware marker clustering hook.
 *
 * Groups nearby pandal markers into clusters at low zoom levels to prevent
 * overlapping markers in dense areas (e.g. North Kolkata with 40+ pandals
 * within 2km).
 *
 * Algorithm: grid-based spatial hashing.
 *  1. Convert each marker's lat/lng to pixel coordinates at the current zoom
 *  2. Assign each marker to a grid cell (cell size = CLUSTER_RADIUS pixels)
 *  3. All markers in the same cell become a cluster
 *  4. Single-marker cells render as normal markers
 *
 * This runs entirely in React (no external clustering library) and works
 * seamlessly with @vis.gl/react-google-maps AdvancedMarker.
 *
 * Performance: O(n) per zoom/pan — no quadtree needed for ~100 markers.
 */

import { useMemo } from "react";
import type { Pandal } from "@/lib/types";

/** Minimum number of markers in a cell to form a cluster */
const MIN_CLUSTER_SIZE = 2;

/**
 * Grid cell size in pixels. Markers within this radius (at the current zoom)
 * will be grouped. 80px provides a good balance between decluttering and
 * preserving individual markers at reasonable zoom levels.
 */
const CLUSTER_RADIUS = 80;

/** Zoom level at or above which clustering is disabled (show all markers) */
const CLUSTER_DISABLE_ZOOM = 15;

export interface MarkerCluster {
  /** Unique key for React rendering */
  key: string;
  /** Center position (average of all contained markers) */
  lat: number;
  lng: number;
  /** Markers in this cluster */
  pandals: Pandal[];
  /** Number of markers in the cluster */
  count: number;
}

export interface ClusterResult {
  /** Individual markers that aren't clustered */
  singles: Pandal[];
  /** Grouped clusters of 2+ markers */
  clusters: MarkerCluster[];
}

/**
 * Convert lat/lng to pixel coordinates at a given zoom level
 * using the Web Mercator projection (same as Google Maps).
 */
function latLngToPixel(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = Math.pow(2, zoom) * 256;
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

/**
 * Clusters pandal markers based on the current map zoom level.
 *
 * @param pandals - All pandals to potentially cluster
 * @param zoom - Current map zoom level (null if map not ready)
 * @returns Object with `singles` (unclustered markers) and `clusters` (grouped markers)
 */
export function useMarkerClusterer(pandals: Pandal[], zoom: number | null): ClusterResult {
  return useMemo(() => {
    // At high zoom or when zoom is unknown, show all markers individually
    if (zoom === null || zoom >= CLUSTER_DISABLE_ZOOM) {
      return { singles: pandals, clusters: [] };
    }

    // Grid-based spatial hashing
    const grid = new Map<string, Pandal[]>();

    for (const pandal of pandals) {
      const { x, y } = latLngToPixel(pandal.latitude, pandal.longitude, zoom);
      const cellX = Math.floor(x / CLUSTER_RADIUS);
      const cellY = Math.floor(y / CLUSTER_RADIUS);
      const cellKey = `${cellX}:${cellY}`;

      const cell = grid.get(cellKey);
      if (cell) {
        cell.push(pandal);
      } else {
        grid.set(cellKey, [pandal]);
      }
    }

    const singles: Pandal[] = [];
    const clusters: MarkerCluster[] = [];

    for (const [cellKey, cellPandals] of grid) {
      if (cellPandals.length < MIN_CLUSTER_SIZE) {
        singles.push(...cellPandals);
      } else {
        // Compute cluster center as average of all marker positions
        let totalLat = 0;
        let totalLng = 0;
        for (const p of cellPandals) {
          totalLat += p.latitude;
          totalLng += p.longitude;
        }
        clusters.push({
          key: `cluster-${cellKey}`,
          lat: totalLat / cellPandals.length,
          lng: totalLng / cellPandals.length,
          pandals: cellPandals,
          count: cellPandals.length,
        });
      }
    }

    return { singles, clusters };
  }, [pandals, zoom]);
}
