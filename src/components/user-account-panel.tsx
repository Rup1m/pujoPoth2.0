"use client";

import { memo, useEffect, useRef } from "react";
import { LogOut, Loader2, Trophy, Star, Lock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import {
  usePandalTracker,
  TOTAL_PANDALS,
  ACHIEVEMENTS,
  type Achievement,
  type ZoneMastery,
} from "@/hooks/use-pandal-tracker";
import { trackEvent } from "@/lib/analytics";
import type { Pandal } from "@/lib/types";

// ── SVG Progress Ring ────────────────────────────────────────────────────────

const RING_SIZE = 128;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({
  percent,
  visitedCount,
  isBn,
}: {
  percent: number;
  visitedCount: number;
  isBn: boolean;
}) {
  const offset = RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE;
  const ringRef = useRef<SVGCircleElement>(null);

  // Animate the ring fill on mount
  useEffect(() => {
    const el = ringRef.current;
    if (!el) return;
    // Start from empty
    el.style.strokeDashoffset = String(RING_CIRCUMFERENCE);
    // Force reflow, then animate to target
    void el.getBoundingClientRect();
    requestAnimationFrame(() => {
      el.style.transition = "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)";
      el.style.strokeDashoffset = String(offset);
    });
  }, [offset]);

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={RING_STROKE}
        />
        {/* Animated fill */}
        <circle
          ref={ringRef}
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE}
          className={percent === 100 ? "animate-pulse-glow" : ""}
          style={{
            filter: percent >= 50 ? "drop-shadow(0 0 6px hsl(var(--primary) / 0.4))" : undefined,
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-foreground leading-none">
          {visitedCount}/{TOTAL_PANDALS}
        </span>
        <span className="text-xs text-muted-foreground mt-0.5">
          {percent}% {isBn ? "সম্পন্ন" : "complete"}
        </span>
      </div>
    </div>
  );
}

// ── Zone Mastery Bar ─────────────────────────────────────────────────────────

const ZONE_EMOJI: Record<string, string> = {
  North: "🧭",
  South: "🌊",
  Central: "🏛️",
};

function ZoneMasteryBar({
  zone,
  isBn,
  text,
}: {
  zone: ZoneMastery;
  isBn: boolean;
  text: Record<string, string>;
}) {
  const zoneLabel = isBn
    ? text[zone.zone.toLowerCase()]
    : zone.zone;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <span role="img" aria-label={zone.zone}>
            {ZONE_EMOJI[zone.zone]}
          </span>
          {zoneLabel}
        </span>
        <span className="text-muted-foreground font-medium tabular-nums">
          {zone.visited}/{zone.total}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/80 transition-all duration-700 ease-out"
          style={{ width: `${zone.percent}%` }}
        />
      </div>
    </div>
  );
}

// ── Achievement Badge ────────────────────────────────────────────────────────

function AchievementBadge({
  achievement,
  earned,
  isNewest,
  progressToward,
  isBn,
}: {
  achievement: Achievement;
  earned: boolean;
  /** True if this is the most recently earned achievement */
  isNewest: boolean;
  /** How many the user has visited (for showing progress on locked badges) */
  progressToward: number;
  isBn: boolean;
}) {
  const progressPercent = earned
    ? 100
    : Math.min(Math.round((progressToward / achievement.threshold) * 100), 99);

  return (
    <div
      className={`
        relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300
        ${
          earned
            ? isNewest
              ? "bg-primary/15 border-2 border-primary/40 animate-pulse-glow"
              : "bg-primary/10 border border-primary/20 animate-shimmer"
            : "bg-muted/30 border border-dashed border-muted-foreground/20"
        }
      `}
    >
      {/* Emoji or lock */}
      <div
        className={`
          text-2xl flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg
          ${earned ? "" : "grayscale opacity-40"}
        `}
      >
        {earned ? (
          <span role="img" aria-label={achievement.title}>
            {achievement.emoji}
          </span>
        ) : (
          <Lock className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-bold ${
            earned ? "text-foreground" : "text-muted-foreground/70"
          }`}
        >
          {isBn ? achievement.titleBn : achievement.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {isBn ? achievement.descriptionBn : achievement.description}
        </p>
        {/* Progress bar for locked achievements */}
        {!earned && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 rounded-full bg-muted/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/40 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
              {progressToward}/{achievement.threshold}
            </span>
          </div>
        )}
      </div>

      {/* Earned indicator */}
      {earned && (
        <Star
          className={`w-4 h-4 flex-shrink-0 ${
            isNewest ? "text-primary animate-scale-bounce" : "text-primary/70"
          }`}
          fill={isNewest ? "currentColor" : "none"}
        />
      )}
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────────────

interface UserAccountPanelProps {
  /** Trigger element (the avatar button). */
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitedIds: Set<string>;
  allPandals: Pandal[];
  onSignOut: () => Promise<void>;
  isSigningOut: boolean;
}

export const UserAccountPanel = memo(function UserAccountPanel({
  children,
  open,
  onOpenChange,
  visitedIds,
  allPandals,
  onSignOut,
  isSigningOut,
}: UserAccountPanelProps) {
  const { user } = useAuth();
  const { language, text } = useLanguage();
  const isBn = language === "bn";
  const tracker = usePandalTracker(visitedIds, allPandals);

  const displayName = user?.displayName ?? "";

  // Track panel open
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      trackEvent("account_panel_opened", {
        visited_count: tracker.visitedCount,
        progress_percent: tracker.progressPercent,
      });
    }
    prevOpenRef.current = open;
  }, [open, tracker.visitedCount, tracker.progressPercent]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8"
      >
        <SheetHeader className="mb-1 text-center">
          <SheetTitle className="text-xl font-bold">{text.account}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-2">
          {/* ── User Identity ── */}
          <div className="flex flex-col items-center gap-2 pt-1">
            {user?.photoURL && (
              <img
                src={user.photoURL}
                alt={displayName}
                className="w-16 h-16 rounded-full border-2 border-primary/30 shadow-lg"
                referrerPolicy="no-referrer"
              />
            )}
            {displayName && (
              <p className="text-lg font-bold text-foreground">{displayName}</p>
            )}
            {tracker.currentTitle && (
              <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <span>{tracker.currentTitle.emoji}</span>
                {isBn ? tracker.currentTitle.titleBn : tracker.currentTitle.title}
              </p>
            )}
            {user?.email && (
              <p className="text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>

          <Separator />

          {/* ── Progress Ring ── */}
          <div className="flex flex-col items-center gap-2">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-primary" />
              {text.pujoProgress}
            </h4>

            <ProgressRing
              percent={tracker.progressPercent}
              visitedCount={tracker.visitedCount}
              isBn={isBn}
            />

            {tracker.nextTitle && (
              <p className="text-xs text-muted-foreground text-center max-w-[250px]">
                {tracker.pandalsToNextTier} {text.moreToUnlock}{" "}
                <span className="font-bold text-foreground">
                  {tracker.nextTitle.emoji}{" "}
                  {isBn ? tracker.nextTitle.titleBn : tracker.nextTitle.title}
                </span>
              </p>
            )}
          </div>

          <Separator />

          {/* ── Zone Mastery ── */}
          <div className="space-y-2.5">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5 px-1">
              <MapPin className="w-4 h-4 text-primary" />
              {text.zoneMastery}
            </h4>
            <div className="space-y-2 px-1">
              {tracker.zoneMastery.map((z) => (
                <ZoneMasteryBar
                  key={z.zone}
                  zone={z}
                  isBn={isBn}
                  text={text as unknown as Record<string, string>}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* ── Achievements ── */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5 px-1">
              <Star className="w-4 h-4 text-primary" />
              {text.achievements}
              <span className="text-xs text-muted-foreground font-normal ml-auto">
                {tracker.earnedAchievements.length}/{ACHIEVEMENTS.length}
              </span>
            </h4>
            <div className="space-y-1.5">
              {ACHIEVEMENTS.map((a) => {
                const isEarned = tracker.earnedAchievements.some(
                  (e) => e.id === a.id
                );
                const isNewest =
                  isEarned &&
                  tracker.currentTitle?.id === a.id &&
                  tracker.earnedAchievements.length > 0;

                return (
                  <AchievementBadge
                    key={a.id}
                    achievement={a}
                    earned={isEarned}
                    isNewest={isNewest}
                    progressToward={tracker.visitedCount}
                    isBn={isBn}
                  />
                );
              })}
            </div>
          </div>

          <Separator />

          {/* ── Sign Out ── */}
          <Button
            id="sign-out-button"
            variant="destructive"
            className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 font-semibold"
            onClick={onSignOut}
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
  );
});
