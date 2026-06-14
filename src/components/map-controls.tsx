/**
 * @fileoverview MapControls — the floating action-button overlay rendered
 * on top of the map.
 *
 * Responsibilities:
 *  - User account avatar + UserAccountPanel (progress, achievements, sign-out)
 *  - Recenter button (triggers parent callback, no map access here)
 *  - FilterPanel trigger
 *  - LanguageSwitcher
 *  - About panel trigger
 *
 * No map instance, no directions, no pandal state — purely UI controls.
 */

"use client";

import { memo, useState, useCallback } from "react";
import { Navigation, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterPanel, type Filters } from "@/components/filter-panel";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AboutPanel } from "@/components/about-panel";
import { UserAccountPanel } from "@/components/user-account-panel";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import type { Pandal } from "@/lib/types";

export interface MapControlsProps {
  /** Called when the user taps the recenter button. */
  onRecenter: () => void;
  /** Called whenever the filter state changes. */
  onFilterChange: (filters: Filters) => void;
  /** Controlled open state for the About panel. */
  isAboutOpen: boolean;
  onAboutOpenChange: (open: boolean) => void;
  /** Set of visited pandal IDs (for the account panel tracker). */
  visitedIds: Set<string>;
  /** Full pandal list (for filtering metro vs pandal in tracker). */
  allPandals: Pandal[];
}

export const MapControls = memo(function MapControls({
  onRecenter,
  onFilterChange,
  isAboutOpen,
  onAboutOpenChange,
  visitedIds,
  allPandals,
}: MapControlsProps) {
  const { text, language } = useLanguage();
  const { user, signOut } = useAuth();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      setIsAccountOpen(false);
    } catch {
      // Sign-out errors are non-critical — the auth listener
      // will still reflect the correct state on next page load.
    } finally {
      setIsSigningOut(false);
    }
  }, [signOut]);

  // Build initials fallback for the avatar
  const displayName = user?.displayName ?? "";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div className="absolute top-20 right-4 z-10 flex flex-col items-end gap-y-3">
        <FilterPanel onFilterChange={onFilterChange} isBn={language === 'bn'} text={text as unknown as Record<string, string>} />

        <LanguageSwitcher />

        <Button
          onClick={onRecenter}
          variant="outline"
          size="icon"
          className="bg-background/80 backdrop-blur-sm shadow-lg h-12 w-12 rounded-full border border-foreground/20 hover:bg-background transition-all duration-200 active:scale-95"
          aria-label={text.recenter}
        >
          <Navigation className="h-5 w-5 text-primary" />
          <span className="sr-only">{text.recenter}</span>
        </Button>

        <AboutPanel open={isAboutOpen} onOpenChange={onAboutOpenChange}>
          <Button
            variant="outline"
            size="icon"
            className="bg-background/80 backdrop-blur-sm shadow-lg h-12 w-12 rounded-full border border-foreground/20 hover:bg-background transition-all duration-200 active:scale-95"
            aria-label="About this App"
          >
            <Info className="h-5 w-5 text-primary" />
            <span className="sr-only">About this App</span>
          </Button>
        </AboutPanel>

        {/* ── Account avatar → opens full UserAccountPanel ── */}
        {user && (
          <UserAccountPanel
            open={isAccountOpen}
            onOpenChange={setIsAccountOpen}
            visitedIds={visitedIds}
            allPandals={allPandals}
            onSignOut={handleSignOut}
            isSigningOut={isSigningOut}
          >
            <button
              id="account-avatar-button"
              className="h-12 w-12 rounded-full border border-foreground/20 bg-background/80 backdrop-blur-sm shadow-lg overflow-hidden flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={text.account}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={displayName}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-sm font-bold text-primary">
                  {initials || "?"}
                </span>
              )}
            </button>
          </UserAccountPanel>
        )}
      </div>
    </>
  );
});
