
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { usePandalTracker, ACHIEVEMENTS, TOTAL_PANDALS } from "@/hooks/use-pandal-tracker";
import type { Pandal } from "@/lib/types";
import { calculateWalkingTime, haversineDistance, formatDistance } from "@/lib/utils";
import type { DirectionsOutput } from "@/ai/flows/get-directions-flow";
import { Navigation, Footprints, Car, Loader2, X, TramFront, MapPin, MapPinCheck, Share2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { ConfettiBurst } from "@/components/confetti-burst";

interface PandalHubProps {
    pandal: Pandal | null;
    location: { lat: number; lng: number } | null;
    directions: DirectionsOutput | null;
    isFetchingDirections: boolean;
    suggestions: (Pandal & { distance: number })[];
    onSuggestionSelect: (pandal: Pandal) => void;
    onClose: () => void;
    visitedIds: Set<string>;
    onToggleVisited: (pandal: Pandal) => void;
}

const TravelModeDisplay = ({ icon: Icon, time, label }: { icon: React.ElementType, time: string | null | undefined, label: string }) => {
    if (!time) return null;
    return (
        <div className="flex flex-col items-center justify-center p-1 rounded-lg text-center">
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
            <div className="flex items-center gap-1.5 mt-1">
                <Icon className="w-4 h-4 text-foreground" />
                <p className="text-sm font-bold text-foreground">
                    {time}
                </p>
            </div>
        </div>
    );
}

export function PandalHub({
  pandal,
  location,
  directions,
  isFetchingDirections,
  suggestions,
  onSuggestionSelect,
  onClose,
  visitedIds,
  onToggleVisited,
}: PandalHubProps) {
  const { language, text } = useLanguage();
  const { toast } = useToast();
  const isBn = language === "bn";

  // Confetti state
  const [showConfetti, setShowConfetti] = useState(false);

  // Track visited bounce animation
  const [bounceKey, setBounceKey] = useState(0);

  // Track the previous earned count to detect new achievement unlocks
  const prevEarnedCountRef = useRef<number | null>(null);

  const handleShare = async () => {
    if (!pandal) return;
    const url = `${window.location.origin}/app?pandal=${pandal.id}`;
    const shareData = {
      title: `PujoPoth — ${pandal.name}`,
      text: `Visit ${pandal.name} this Durga Puja! Navigate with PujoPoth.`,
      url: url,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (_error) {
        // User cancelled share — do nothing
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied!", description: "Share it on WhatsApp or anywhere." });
      } catch {
        toast({ title: "Could not copy link", variant: "destructive" });
      }
    }
  };

  const handleNavigate = () => {
    if (pandal) {
      trackEvent('directions_requested', { pandal_name: pandal.name, type: pandal.type, zone: pandal.zone ?? 'unknown' });
      const url = `https://www.google.com/maps/dir/?api=1&destination=${pandal.latitude},${pandal.longitude}&travelmode=driving`;
      window.open(url, '_blank');
    }
  };

  const [displayPandal, setDisplayPandal] = useState<Pandal | null>(pandal);

  // Persist pandal data during exit animation
  useEffect(() => {
    if (pandal) setDisplayPandal(pandal);
  }, [pandal]);

  const activePandal = pandal || displayPandal;
  
  const displayName = (p: Pandal) => (language === 'bn' && p.name_bengali) ? p.name_bengali : p.name;

  const distanceToPandal = location && activePandal ? haversineDistance(location, { lat: activePandal.latitude, lng: activePandal.longitude }) : null;

  // ── Enhanced visited toggle with achievement detection ──────────────────
  const handleToggleVisited = useCallback(
    (p: Pandal) => {
      if (p.type === "metro") return;

      const wasVisited = visitedIds.has(p.id);

      // Capture current earned count BEFORE the toggle
      const currentEarnedCount = ACHIEVEMENTS.filter(
        (a) => visitedIds.size >= a.threshold
      ).length;

      // Perform the toggle (optimistic update happens in parent)
      onToggleVisited(p);

      // Trigger bounce animation
      setBounceKey((k) => k + 1);

      if (wasVisited) {
        // Unmarking
        trackEvent("pandal_unvisited", { pandal_name: p.name });
        toast({
          title: text.removedFromVisited,
        });
      } else {
        // Marking as visited
        const newVisitedCount = visitedIds.size + 1;
        trackEvent("pandal_visited", {
          pandal_name: p.name,
          visited_count: newVisitedCount,
          zone: p.zone ?? "unknown",
        });

        // Check if a new achievement is being unlocked
        const newEarnedCount = ACHIEVEMENTS.filter(
          (a) => newVisitedCount >= a.threshold
        ).length;

        if (newEarnedCount > currentEarnedCount) {
          // New achievement unlocked!
          const newAchievement = ACHIEVEMENTS.filter(
            (a) => newVisitedCount >= a.threshold
          ).pop();

          if (newAchievement) {
            trackEvent("achievement_unlocked", {
              achievement: newAchievement.id,
              visited_count: newVisitedCount,
            });

            // Show confetti
            setShowConfetti(true);

            // Show achievement toast
            toast({
              title: `${text.achievementUnlocked}`,
              description: `${newAchievement.emoji} ${
                isBn ? newAchievement.titleBn : newAchievement.title
              }`,
            });
          }
        } else {
          // Normal visited toast with progress
          toast({
            title: text.markedVisited,
            description: `${p.name} · ${newVisitedCount}/${TOTAL_PANDALS}`,
          });
        }
      }
    },
    [visitedIds, onToggleVisited, toast, text, isBn]
  );

  return (
    <>
      {/* Confetti overlay */}
      {showConfetti && (
        <ConfettiBurst onComplete={() => setShowConfetti(false)} />
      )}

      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] flex justify-center sm:justify-end sm:px-4 sm:bottom-4 pointer-events-none ${
          pandal ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
        style={{ willChange: pandal ? 'transform' : 'auto' }}
      >
        <div className="relative w-full sm:w-[calc(100vw-2rem)] sm:max-w-sm max-h-[80vh] overflow-hidden pointer-events-auto flex flex-col justify-end">
          <Card className="w-full bg-background/90 backdrop-blur-sm border-t-2 sm:border-2 border-primary/20 shadow-2xl overflow-hidden rounded-t-2xl rounded-b-none sm:rounded-2xl">
            
            {/* Decorative Drag Handle */}
            <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-[36px] h-[4px] rounded-full bg-muted-foreground/30" />
            </div>

            {activePandal && (
              <>
                <CardContent className="p-2.5 pb-1 pt-0">
                  {/* Main Pandal Info */}
                  <div className="relative">
                     <div className="space-y-1 pr-28">
                      <h3 className="text-base font-bold text-foreground tracking-tight break-words line-clamp-2">{displayName(activePandal)}</h3>
                      <div className="flex items-center space-x-2 text-xs text-primary font-semibold flex-wrap">
                          {activePandal.bonedi && <p>Bonedi Bari Pujo</p>}
                          {activePandal.bonedi && distanceToPandal !== null && <span className="text-muted-foreground/50">|</span>}
                          {distanceToPandal !== null && <p className="text-muted-foreground">{formatDistance(distanceToPandal)}</p>}
                      </div>
                    </div>

                    <div className="absolute top-0 right-1 flex items-center gap-0.5">
                      {activePandal.type !== "metro" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleVisited(activePandal)}
                          className="h-11 w-11 rounded-full hover:bg-muted/50 active:scale-90 transition-all duration-200"
                        >
                          {visitedIds.has(activePandal.id) ? (
                            <MapPinCheck
                              key={bounceKey}
                              className="h-5 w-5 text-emerald-500 animate-scale-bounce drop-shadow-sm"
                              aria-label="Mark as not visited"
                            />
                          ) : (
                            <MapPin className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" aria-label="Mark as visited" />
                          )}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={handleShare} className="h-11 w-11 rounded-full hover:bg-muted/50 active:scale-90 transition-all duration-200">
                          <Share2 className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" aria-label="Share pandal" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={onClose} className="h-11 w-11 rounded-full hover:bg-muted/50 active:scale-90 transition-all duration-200">
                          <X className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                      </Button>
                    </div>
                    
                    <div className="mt-2.5 min-h-[52px] flex items-center justify-center">
                      {isFetchingDirections ? (
                        <div className="flex items-center justify-center text-muted-foreground p-1 text-xs">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {text.calculating}
                        </div>
                      ) : directions && (directions.driving || directions.walking || directions.transit) ? (
                        <div className="grid grid-cols-3 gap-2 text-center py-1 w-full">
                          <TravelModeDisplay icon={Car} time={directions.driving} label="Car" />
                          <TravelModeDisplay icon={Footprints} time={directions.walking} label="Walking" />
                          <TravelModeDisplay icon={TramFront} time={directions.transit} label="Train" />
                        </div>
                      ) : directions && !directions.driving && !directions.walking && !directions.transit ? (
                        <p className="text-xs text-muted-foreground text-center p-1">Directions unavailable</p>
                      ) : null}
                    </div>
                     <Button onClick={handleNavigate} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-9 text-sm rounded-lg mt-1.5 active:scale-[0.98] transition-all duration-200 shadow-sm hover:shadow" disabled={!location}>
                        <Navigation className="mr-2 h-4 w-4" />
                        {text.getDirections}
                    </Button>
                  </div>

                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div>
                      <Separator className="my-1.5"/>
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-muted-foreground tracking-wide px-1">Nearby Pandals</h4>
                        <div className="max-h-20 overflow-y-auto space-y-1 pr-1 scrollbar-hide">
                          {suggestions.map((suggestion) => (
                            <div
                              key={suggestion.id}
                              onClick={() => onSuggestionSelect(suggestion)}
                              className="flex justify-between items-center p-1 rounded-lg hover:bg-muted cursor-pointer"
                            >
                              <div>
                                <p className="font-semibold text-foreground text-xs">{displayName(suggestion)}</p>
                                {suggestion.bonedi && <p className="text-xs text-primary">Bonedi Bari</p>}
                              </div>
                              <div className="text-right flex-shrink-0 ml-2">
                                 <p className="text-xs text-muted-foreground">{formatDistance(suggestion.distance)}</p>
                                 <p className="text-xs text-muted-foreground">{calculateWalkingTime(suggestion.distance)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="px-3 pb-1.5 pt-0 flex justify-between items-center">
                   <div className="text-foreground/60 text-[10px] leading-tight">
                        <p className="font-semibold">A Rupam Banerjee Production</p>
                        <p>rupamiem@gmail.com</p>
                    </div>
                    <p className="text-foreground/60 font-bold text-xs tracking-tight">
                      <span className="font-calligraphy">Pujo</span><span className="font-extrabold text-sm">পথ</span>
                    </p>
                </CardFooter>
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
