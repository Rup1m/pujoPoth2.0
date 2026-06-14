
"use client";

import type { Pandal } from "@/lib/types";
import { memo } from "react";
import { TramFront } from "lucide-react";

interface PandalMarkerProps {
  isSelected: boolean;
  pandalType: Pandal["type"];
  isBonedi: boolean;
  isVisited: boolean;
}

function PandalMarkerComponent({ isSelected, pandalType, isBonedi, isVisited }: PandalMarkerProps) {
  const shadowId = `shadow-${pandalType}-${isBonedi ? 'bonedi' : 'normal'}`;
  const visitedShadowId = `shadow-visited-${pandalType}`;

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
  
  // Vibrant gamification design for visited markers
  const visitedColor = "#fbbf24"; // Bright amber/gold
  const activeColor = isVisited ? visitedColor : baseColor;
  
  const showVisitedBadge = isVisited && !isSelected;
  
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
      
      {/* Premium Visited Checkmark Badge */}
      {showVisitedBadge && (
        <div className="absolute -bottom-1 -right-1 z-20 w-[18px] h-[18px] bg-green-500 rounded-full border-2 border-background flex items-center justify-center shadow-md animate-scale-bounce">
          <span className="text-white text-[10px] font-extrabold leading-none">✓</span>
        </div>
      )}
      
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full transition-opacity duration-300 ${showVisitedBadge ? 'opacity-90' : 'opacity-100 drop-shadow-lg'}`}
      >
        <defs>
          <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.3"/>
          </filter>
          {/* Enhanced glow filter for visited markers */}
          <filter id={visitedShadowId} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor={visitedColor} floodOpacity="0.6"/>
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.4"/>
          </filter>
        </defs>
        <g filter={`url(#${isVisited ? visitedShadowId : shadowId})`}>
            {/* Outer Drop shape */}
            <path
            d="M24 48C24 48 40 32 40 18C40 8.05887 32.8366 1 24 1C15.1634 1 8 8.05887 8 18C8 32 24 48 24 48Z"
            fill={activeColor}
            stroke={isVisited ? "#fef3c7" : "hsl(var(--background))"}
            strokeWidth={isVisited ? "3" : "2"}
            />
            {/* Inner Circle / Eye */}
            <path
            d="M24 28C28.4183 28 32 24.4183 32 20C32 15.5817 28.4183 12 24 12C19.5817 12 16 15.5817 16 20C16 24.4183 19.5817 28 24 28Z"
            fill={isVisited ? "#fffbeb" : "hsl(var(--background))"}
            opacity={isVisited ? "1" : "0.8"}
            />
        </g>
      </svg>
    </div>
  );
}

export const PandalMarker = memo(PandalMarkerComponent);
