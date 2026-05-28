"use client";

import { useState, useEffect, useMemo } from "react";
import type { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LogOut, MapPinCheck, Compass, Crown, Star, Trophy, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { getVisitedPandalDetails, type VisitedPandalDoc } from "@/services/visitedPandalsService";
import type { Pandal } from "@/lib/types";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  visitedIds: Set<string>;
  allPandals: Pandal[];
}

interface Badge {
  id: string;
  label: string;
  icon: React.ElementType;
  unlocked: boolean;
  color: string;
}

// ── Achievement tier helper ────────────────────────────────────────────────────

function getAchievementTier(percentage: number): { label: string; emoji: string } {
  if (percentage === 0) return { label: "Explorer — start your journey!", emoji: "🧭" };
  if (percentage <= 25) return { label: "Pathfinder — you've begun!", emoji: "🥾" };
  if (percentage <= 50) return { label: "Navigator — halfway there!", emoji: "🗺️" };
  if (percentage <= 75) return { label: "Pilgrim — almost done!", emoji: "🙏" };
  if (percentage < 100) return { label: "Champion — incredible!", emoji: "🏆" };
  return { label: "পুজোপথ Legend — you did it!", emoji: "👑" };
}

// ── Zone badge component ───────────────────────────────────────────────────────

function ZoneBadge({ zone }: { zone: string | null }) {
  if (!zone) return null;
  const colors: Record<string, string> = {
    North: "bg-blue-500/15 text-blue-600",
    South: "bg-emerald-500/15 text-emerald-600",
    Central: "bg-amber-500/15 text-amber-600",
  };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${colors[zone] ?? "bg-muted text-muted-foreground"}`}>
      {zone}
    </span>
  );
}

// ── Gamification badge component ───────────────────────────────────────────────

function GamificationBadge({ badge }: { badge: Badge }) {
  const Icon = badge.unlocked ? badge.icon : Lock;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`relative h-14 w-14 rounded-full border-2 flex items-center justify-center transition-all ${
          badge.unlocked
            ? `${badge.color} border-current shadow-sm`
            : "border-muted-foreground/20 bg-muted/50 opacity-40 grayscale"
        }`}
      >
        <Icon className={`h-6 w-6 ${badge.unlocked ? "" : "text-muted-foreground"}`} />
        {badge.unlocked && (
          <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-[9px] font-bold shadow-sm">
            ✓
          </div>
        )}
      </div>
      <span className={`text-[10px] font-medium text-center leading-tight max-w-[72px] ${badge.unlocked ? "text-foreground" : "text-muted-foreground"}`}>
        {badge.label}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ProfileSheet({
  open,
  onOpenChange,
  user,
  visitedIds,
  allPandals,
}: ProfileSheetProps) {
  const { signOut } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const [visitedDetails, setVisitedDetails] = useState<VisitedPandalDoc[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Total non-metro pandals — dynamically computed, not hardcoded
  const totalPandals = useMemo(
    () => allPandals.filter((p) => p.type !== "metro").length,
    [allPandals]
  );

  const visitedCount = visitedIds.size;
  const percentage = totalPandals > 0 ? Math.round((visitedCount / totalPandals) * 100) : 0;
  const tier = getAchievementTier(percentage);

  // ── Fetch visited details when sheet opens ───────────────────────────────
  useEffect(() => {
    if (open && user) {
      setIsLoadingDetails(true);
      getVisitedPandalDetails(user.uid)
        .then(setVisitedDetails)
        .catch((err) => console.error("[ProfileSheet] fetch details failed:", err))
        .finally(() => setIsLoadingDetails(false));
    }
  }, [open, user, visitedIds]); // re-fetch when visitedIds changes (user toggled)

  // ── Compute badge unlock states ──────────────────────────────────────────

  const badges: Badge[] = useMemo(() => {
    // Zone Explorer: need ≥1 visited pandal in each of North, South, Central
    const visitedPandalObjects = allPandals.filter((p) => visitedIds.has(p.id));
    const visitedZones = new Set(visitedPandalObjects.map((p) => p.zone).filter(Boolean));
    const hasAllZones = visitedZones.has("North") && visitedZones.has("South") && visitedZones.has("Central");

    // Bonedi Collector: ≥5 bonedi bari pujos visited
    const bonediVisitedCount = visitedPandalObjects.filter((p) => p.bonedi).length;

    return [
      {
        id: "first-visit",
        label: "First Visit",
        icon: MapPinCheck,
        unlocked: visitedCount >= 1,
        color: "text-primary",
      },
      {
        id: "zone-explorer",
        label: "Zone Explorer",
        icon: Compass,
        unlocked: hasAllZones,
        color: "text-blue-500",
      },
      {
        id: "bonedi-collector",
        label: "Bonedi Collector",
        icon: Crown,
        unlocked: bonediVisitedCount >= 5,
        color: "text-amber-500",
      },
      {
        id: "pujo-legend",
        label: "পুজো Legend",
        icon: Trophy,
        unlocked: visitedCount >= totalPandals && totalPandals > 0,
        color: "text-emerald-500",
      },
    ];
  }, [visitedIds, visitedCount, totalPandals, allPandals]);

  // ── Sign out ─────────────────────────────────────────────────────────────

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
    router.replace("/");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8">
        <SheetHeader className="sr-only">
          <SheetTitle>Profile</SheetTitle>
          <SheetDescription>Your Puja journey stats and visited pandals.</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 pt-2">
          {/* ── A. User Header ───────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? "Profile"}
                  className="h-11 w-11 rounded-full ring-2 ring-primary/30"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-11 w-11 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {(user.displayName ?? "U")[0]}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-foreground leading-tight">
                  {user.displayName ?? "Explorer"}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-semibold"
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              Sign out
            </Button>
          </div>

          <Separator />

          {/* ── B. Progress Section ──────────────────────────────────── */}
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-3xl font-extrabold text-foreground tracking-tight">
                {visitedCount}{" "}
                <span className="text-lg font-semibold text-muted-foreground">/ {totalPandals}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pandals visited this Puja
              </p>
            </div>

            <Progress value={percentage} className="h-3" />

            <p className="text-center text-sm font-semibold text-primary">
              {tier.emoji} {tier.label}
            </p>
          </div>

          <Separator />

          {/* ── D. Gamification Badges ───────────────────────────────── */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground tracking-wide text-center">
              Achievements
            </h4>
            <div className="flex justify-center gap-4">
              {badges.map((badge) => (
                <GamificationBadge key={badge.id} badge={badge} />
              ))}
            </div>
          </div>

          <Separator />

          {/* ── C. Visited Pandals List ──────────────────────────────── */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground tracking-wide px-1">
              Visited Pandals
            </h4>

            {isLoadingDetails ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : visitedDetails.length === 0 ? (
              <div className="text-center py-6 px-4">
                <Star className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Tap the 📍 pin on any pandal to mark it visited
                </p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-hide">
                {visitedDetails.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPinCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <p className="text-sm font-medium text-foreground truncate">
                        {language === "bn" && v.name_bengali ? v.name_bengali : v.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <ZoneBadge zone={v.zone} />
                      {v.bonedi && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                          Bonedi
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
