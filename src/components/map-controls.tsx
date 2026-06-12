/**
 * @fileoverview MapControls — the floating action-button overlay rendered
 * on top of the map.
 *
 * Responsibilities:
 *  - User account avatar + sign-out dropdown
 *  - Recenter button (triggers parent callback, no map access here)
 *  - FilterPanel trigger
 *  - LanguageSwitcher
 *  - About panel trigger
 *
 * No map instance, no directions, no pandal state — purely UI controls.
 */

"use client";

import { memo, useState, useCallback } from "react";
import { Navigation, Info, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterPanel, type Filters } from "@/components/filter-panel";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AboutPanel } from "@/components/about-panel";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

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

        {/* ── Account / Sign-out button ── */}
        {user && (
          <Sheet open={isAccountOpen} onOpenChange={setIsAccountOpen}>
            <SheetTrigger asChild>
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
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="rounded-t-2xl max-h-[50vh] overflow-y-auto"
            >
              <SheetHeader className="mb-4 text-center">
                <SheetTitle className="text-xl font-bold">
                  {text.account}
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-col items-center gap-4 px-4 pb-6">
                {/* User info */}
                <div className="flex flex-col items-center gap-2">
                  {user.photoURL && (
                    <img
                      src={user.photoURL}
                      alt={displayName}
                      className="w-16 h-16 rounded-full border-2 border-primary/30 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  {displayName && (
                    <p className="text-lg font-semibold text-foreground">
                      {displayName}
                    </p>
                  )}
                  {user.email && (
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Sign out button */}
                <Button
                  id="sign-out-button"
                  variant="destructive"
                  className="w-full max-w-xs flex items-center justify-center gap-2 font-semibold"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{text.signingOut}</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      <span>{text.signOut}</span>
                    </>
                  )}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </>
  );
});
