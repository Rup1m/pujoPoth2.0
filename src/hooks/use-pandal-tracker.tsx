"use client";

import { useMemo } from "react";
import type { Pandal } from "@/lib/types";

/** Total number of real pandals (excludes metro stations). */
export const TOTAL_PANDALS = 95;

/** Achievement tier definition. */
export interface Achievement {
  id: string;
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  threshold: number;
  emoji: string;
}

/** Ordered list of achievement tiers (ascending by threshold). */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_darshan",
    title: "First Darshan",
    titleBn: "প্রথম দর্শন",
    description: "Visit your first pandal",
    descriptionBn: "আপনার প্রথম প্যান্ডেল দেখুন",
    threshold: 1,
    emoji: "🪷",
  },
  {
    id: "pandal_curious",
    title: "Pandal Curious",
    titleBn: "প্যান্ডেল কৌতূহলী",
    description: "Visit 5 pandals",
    descriptionBn: "৫টি প্যান্ডেল দেখুন",
    threshold: 5,
    emoji: "🔱",
  },
  {
    id: "pujo_explorer",
    title: "Pujo Explorer",
    titleBn: "পুজো এক্সপ্লোরার",
    description: "Visit 10 pandals",
    descriptionBn: "১০টি প্যান্ডেল দেখুন",
    threshold: 10,
    emoji: "🏵️",
  },
  {
    id: "pandal_enthusiast",
    title: "Pandal Enthusiast",
    titleBn: "প্যান্ডেল উৎসাহী",
    description: "Visit 20 pandals",
    descriptionBn: "২০টি প্যান্ডেল দেখুন",
    threshold: 20,
    emoji: "🪘",
  },
  {
    id: "pandal_hopper",
    title: "Pandal Hopper",
    titleBn: "প্যান্ডেল হপার",
    description: "Visit 35 pandals",
    descriptionBn: "৩৫টি প্যান্ডেল দেখুন",
    threshold: 35,
    emoji: "🎭",
  },
  {
    id: "half_century",
    title: "Half Century",
    titleBn: "অর্ধশতক",
    description: "Visit 50 pandals",
    descriptionBn: "৫০টি প্যান্ডেল দেখুন",
    threshold: 50,
    emoji: "🏆",
  },
  {
    id: "pujo_veteran",
    title: "Pujo Veteran",
    titleBn: "পুজো ভেটেরান",
    description: "Visit 75 pandals",
    descriptionBn: "৭৫টি প্যান্ডেল দেখুন",
    threshold: 75,
    emoji: "👑",
  },
  {
    id: "pujo_champion",
    title: "Pujo Champion",
    titleBn: "পুজো চ্যাম্পিয়ন",
    description: "Visit all 95 pandals",
    descriptionBn: "সব ৯৫টি প্যান্ডেল দেখুন",
    threshold: 95,
    emoji: "🏅",
  },
];

/** Per-zone progress stats. */
export interface ZoneMastery {
  zone: "North" | "South" | "Central";
  visited: number;
  total: number;
  percent: number;
}

export interface TrackerState {
  /** Number of pandals visited (excludes metro). */
  visitedCount: number;
  /** Progress percentage 0-100. */
  progressPercent: number;
  /** Highest earned achievement, or null if none. */
  currentTitle: Achievement | null;
  /** Next achievement to unlock, or null if all unlocked. */
  nextTitle: Achievement | null;
  /** All earned achievements so far. */
  earnedAchievements: Achievement[];
  /** How many more pandals to reach the next tier. */
  pandalsToNextTier: number;
  /** Per-zone visited / total breakdown. */
  zoneMastery: ZoneMastery[];
}

/**
 * Derives the gamification state from a set of visited IDs.
 * Filters out any IDs that belong to metro stations using the pandals list.
 *
 * @param visitedIds — Set of visited pandal IDs (may include metro IDs)
 * @param allPandals — Full list of pandals including metros (used to filter)
 */
export function usePandalTracker(
  visitedIds: Set<string>,
  allPandals: Pandal[]
): TrackerState {
  return useMemo(() => {
    // Build a set of actual pandal IDs (not metro)
    const realPandals = allPandals.filter((p) => p.type !== "metro");
    const realPandalIds = new Set(realPandals.map((p) => p.id));

    // Only count visited IDs that correspond to real pandals
    const validVisitedIds = Array.from(visitedIds).filter((id) =>
      realPandalIds.has(id)
    );
    const validVisitedCount = validVisitedIds.length;
    const validVisitedSet = new Set(validVisitedIds);

    const progressPercent = Math.min(
      Math.round((validVisitedCount / TOTAL_PANDALS) * 100),
      100
    );

    const earnedAchievements = ACHIEVEMENTS.filter(
      (a) => validVisitedCount >= a.threshold
    );

    const currentTitle =
      earnedAchievements.length > 0
        ? earnedAchievements[earnedAchievements.length - 1]
        : null;

    const nextTitle =
      ACHIEVEMENTS.find((a) => validVisitedCount < a.threshold) ?? null;

    const pandalsToNextTier = nextTitle
      ? nextTitle.threshold - validVisitedCount
      : 0;

    // ── Zone mastery ──────────────────────────────────────────────────────
    const zones: ("North" | "South" | "Central")[] = ["North", "South", "Central"];
    const zoneMastery: ZoneMastery[] = zones.map((zone) => {
      const zonePandals = realPandals.filter((p) => p.zone === zone);
      const zoneVisited = zonePandals.filter((p) => validVisitedSet.has(p.id)).length;
      const total = zonePandals.length;
      return {
        zone,
        visited: zoneVisited,
        total,
        percent: total > 0 ? Math.round((zoneVisited / total) * 100) : 0,
      };
    });

    return {
      visitedCount: validVisitedCount,
      progressPercent,
      currentTitle,
      nextTitle,
      earnedAchievements,
      pandalsToNextTier,
      zoneMastery,
    };
  }, [visitedIds, allPandals]);
}
