/**
 * @fileoverview MapControls — the floating action-button overlay rendered
 * on top of the map.
 *
 * Responsibilities:
 *  - Recenter button (triggers parent callback, no map access here)
 *  - FilterPanel trigger
 *  - LanguageSwitcher
 *  - About panel trigger
 *
 * No map instance, no directions, no pandal state — purely UI controls.
 */

"use client";

import { memo } from "react";
import { Navigation, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterPanel, type Filters } from "@/components/filter-panel";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AboutPanel } from "@/components/about-panel";
import { useLanguage } from "@/hooks/use-language";

export interface MapControlsProps {
  /** Called when the user taps the recenter button. */
  onRecenter: () => void;
  /** Called whenever the filter state changes. */
  onFilterChange: (filters: Filters) => void;
  /** Controlled open state for the About panel. */
  isAboutOpen: boolean;
  onAboutOpenChange: (open: boolean) => void;
}

export const MapControls = memo(function MapControls({
  onRecenter,
  onFilterChange,
  isAboutOpen,
  onAboutOpenChange,
}: MapControlsProps) {
  const { text } = useLanguage();

  return (
    <>
      <div className="absolute top-20 right-4 z-10 flex flex-col items-end gap-y-3">
        <FilterPanel onFilterChange={onFilterChange} />

        <LanguageSwitcher />

        <Button
          onClick={onRecenter}
          variant="outline"
          size="icon"
          className="bg-background/80 backdrop-blur-sm shadow-lg h-12 w-12 rounded-full border border-foreground/20"
          aria-label={text.recenter}
        >
          <Navigation className="h-5 w-5 text-primary" />
          <span className="sr-only">{text.recenter}</span>
        </Button>

        <AboutPanel open={isAboutOpen} onOpenChange={onAboutOpenChange}>
          <Button
            variant="outline"
            size="icon"
            className="bg-background/80 backdrop-blur-sm shadow-lg h-12 w-12 rounded-full border border-foreground/20"
            aria-label="About this App"
          >
            <Info className="h-5 w-5 text-primary" />
            <span className="sr-only">About this App</span>
          </Button>
        </AboutPanel>
      </div>
    </>
  );
});

