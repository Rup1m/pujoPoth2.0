"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getVisitedPandals,
  markVisited,
  unmarkVisited,
  syncVisitedWithFirestore,
} from "@/services/visitedPandalsService";
import { useAuth } from "@/hooks/use-auth";
import type { Pandal } from "@/lib/types";

/**
 * Manages the set of visited pandal IDs.
 *
 * - On mount: reads from localStorage (instant, no flash).
 * - On auth ready: merges localStorage ↔ Firestore (union of both).
 * - On toggle: optimistic localStorage update + background Firestore write.
 */
export function useVisitedPandals() {
  const { user } = useAuth();
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Read localStorage synchronously on mount
  useEffect(() => {
    setVisitedIds(new Set(getVisitedPandals()));
    setIsLoading(false);
  }, []);

  // Merge with Firestore when auth resolves
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    syncVisitedWithFirestore(user.uid).then((merged) => {
      if (!cancelled) {
        setVisitedIds(new Set(merged));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleVisited = useCallback(
    (pandal: Pandal) => {
      // Never track metro stations
      if (pandal.type === "metro") return;

      const wasVisited = visitedIds.has(pandal.id);
      const uid = user?.uid ?? null;

      if (wasVisited) {
        unmarkVisited(pandal.id, uid);
      } else {
        markVisited(pandal, uid);
      }

      // Optimistic UI update from localStorage
      setVisitedIds(new Set(getVisitedPandals()));
    },
    [visitedIds, user]
  );

  return { visitedIds, toggleVisited, isLoading };
}
