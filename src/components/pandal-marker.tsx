
"use client";

import type { Pandal } from "@/lib/types";
import { memo } from "react";
import { TramFront, Check } from "lucide-react";

interface PandalMarkerProps {
  isSelected: boolean;
  pandalType: Pandal["type"];
  isBonedi: boolean;
  isVisited: boolean;
}

function PandalMarkerComponent({ isSelected, pandalType, isBonedi, isVisited }: PandalMarkerProps) {
  const shadowId = `shadow-${pandalType}-${isBonedi ? 'bonedi' : 'normal'}`;

  if (pandalType === "metro") {
    const metroColor = "hsl(220 100% 50%)"; // A distinct blue for metro
    const size = 24;
    return (
        <div
            className={`relative flex items-center justify-center will-change-transform transition-transform duration-150 ${
              isSelected 
                ? "scale-125 -translate-y-1 drop-shadow-lg z-50" 
                : "hover:scale-110 hover:-translate-y-0.5"
            }`}
            style={{
                width: size,
                height: size,
            }}
        >
            <div 
                className="absolute w-full h-full rounded-full bg-background/80 border-2"
                style={{ borderColor: metroColor }}
            />
            <TramFront className="w-2/3 h-2/3 text-foreground relative z-10" style={{ color: metroColor }}/>
            {isSelected && (
                <div 
                    className="absolute inset-0 rounded-full animate-pulse will-change-transform"
                    style={{ backgroundColor: metroColor, opacity: 0.4, transform: "translateZ(0)" }} 
                />
            )}
        </div>
    );
  }

  const size = 36;
  const baseColor = isBonedi ? "hsl(var(--destructive))" : "hsl(var(--primary))";
  
  return (
    <div
      className={`relative will-change-transform transition-transform duration-150 animate-marker-pop ${
        isSelected 
          ? "scale-125 -translate-y-1 drop-shadow-lg z-50" 
          : "hover:scale-110 hover:-translate-y-0.5"
      }`}
      style={{
        width: size,
        height: size,
      }}
    >
      {isSelected && (
        <div className="absolute inset-0 bg-primary/50 rounded-full animate-pulse will-change-transform" style={{ transform: "translateZ(0)" }} />
      )}
      {isVisited && (
        <div
          className="absolute top-0 right-0 z-20 h-5 w-5 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center"
        >
          <Check className="h-3 w-3 text-white stroke-[3]" />
        </div>
      )}
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-lg"
      >
        <defs>
          <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.3"/>
          </filter>
        </defs>
        <g filter={`url(#${shadowId})`}>
            <path
            d="M24 48C24 48 40 32 40 18C40 8.05887 32.8366 1 24 1C15.1634 1 8 8.05887 8 18C8 32 24 48 24 48Z"
            fill={baseColor}
            stroke="hsl(var(--background))"
            strokeWidth="2"
            />
            <path
            d="M24 28C28.4183 28 32 24.4183 32 20C32 15.5817 28.4183 12 24 12C19.5817 12 16 15.5817 16 20C16 24.4183 19.5817 28 24 28Z"
            fill="hsl(var(--background))"
            opacity="0.8"
            />
        </g>
      </svg>
    </div>
  );
}

export const PandalMarker = memo(PandalMarkerComponent);
