/**
 * @fileoverview ClusterMarker — visual representation of a marker cluster.
 *
 * Renders a circular badge showing the number of pandals in the cluster.
 * Uses the primary color with a scale based on cluster size for visual weight.
 */

"use client";

import { memo } from "react";

interface ClusterMarkerProps {
  count: number;
}

function ClusterMarkerComponent({ count }: ClusterMarkerProps) {
  // Scale the circle size based on cluster count for visual weight
  const size = Math.min(28 + count * 2, 56);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Outer pulse ring */}
      <div
        className="absolute inset-0 rounded-full bg-primary/30 animate-pulse will-change-transform"
        style={{ transform: "translateZ(0)" }}
      />
      {/* Main circle */}
      <div
        className="absolute inset-1 rounded-full bg-primary border-2 border-background shadow-lg flex items-center justify-center"
      >
        <span className="text-primary-foreground font-bold text-xs leading-none">
          {count}
        </span>
      </div>
    </div>
  );
}

export const ClusterMarker = memo(ClusterMarkerComponent);
