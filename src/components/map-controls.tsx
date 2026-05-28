/**
 * @fileoverview MapControls — the floating action-button overlay rendered
 * on top of the map.
 *
 * Responsibilities:
 *  - Recenter button (triggers parent callback, no map access here)
 *  - FilterPanel trigger
 *  - LanguageSwitcher
 *  - About panel trigger
 *  - Profile sheet trigger (when authenticated)
 *
 * No map instance, no directions, no pandal state — purely UI controls.
 */

"use client";

import { memo, useState } from "react";
import { Navigation, Info, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterPanel, type Filters } from "@/components/filter-panel";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AboutPanel } from "@/components/about-panel";
import { ProfileSheet } from "@/components/profile-sheet";
import { useLanguage } from "@/hooks/use-language";
import type { User } from "firebase/auth";
import type { Pandal } from "@/lib/types";

export interface MapControlsProps {
  /** Called when the user taps the recenter button. */
  onRecenter: () => void;
  /** Called whenever the filter state changes. */
  onFilterChange: (filters: Filters) => void;
  /** Controlled open state for the About panel. */
  isAboutOpen: boolean;
  onAboutOpenChange: (open: boolean) => void;
  /** Profile props — only provided when user is authenticated. */
  user?: User | null;
  visitedIds?: Set<string>;
  allPandals?: Pandal[];
}

export const MapControls = memo(function MapControls({
  onRecenter,
  onFilterChange,
  isAboutOpen,
  onAboutOpenChange,
  user,
  visitedIds,
  allPandals,
}: MapControlsProps) {
  const { text } = useLanguage();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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

        {user && (
          <Button
            onClick={() => setIsProfileOpen(true)}
            variant="outline"
            size="icon"
            className="bg-background/80 backdrop-blur-sm shadow-lg h-12 w-12 rounded-full border border-foreground/20"
            aria-label="Profile"
          >
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt="Profile"
                className="h-8 w-8 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <UserCircle className="h-5 w-5 text-primary" />
            )}
            <span className="sr-only">Profile</span>
          </Button>
        )}
      </div>

      {/* Profile sheet — rendered outside the button column */}
      {user && visitedIds && allPandals && (
        <ProfileSheet
          open={isProfileOpen}
          onOpenChange={setIsProfileOpen}
          user={user}
          visitedIds={visitedIds}
          allPandals={allPandals}
        />
      )}
    </>
  );
});

