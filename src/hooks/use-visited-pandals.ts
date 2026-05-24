"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  getVisitedPandals,
  markVisited,
  unmarkVisited,
} from "@/services/visitedPandalsService";
import type { Pandal } from "@/lib/types";

export function useVisitedPandals(userId: string | null | undefined) {
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // ── Fetch visited pandals on mount / userId change ────────────────────────
  useEffect(() => {
    if (!userId) {
      setVisitedIds(new Set());
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getVisitedPandals(userId)
      .then((ids) => {
        if (!cancelled) setVisitedIds(new Set(ids));
      })
      .catch((err) => {
        console.error("[useVisitedPandals] fetch failed:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ── Toggle visited/unvisited with optimistic UI ───────────────────────────
  const toggleVisited = useCallback(
    async (pandal: Pandal) => {
      if (!userId) return;

      const wasVisited = visitedIds.has(pandal.id);

      // Optimistic update
      setVisitedIds((prev) => {
        const next = new Set(prev);
        if (wasVisited) {
          next.delete(pandal.id);
        } else {
          next.add(pandal.id);
        }
        return next;
      });

      try {
        if (wasVisited) {
          await unmarkVisited(userId, pandal.id);
        } else {
          await markVisited(userId, pandal);
        }
      } catch (err) {
        console.error("[useVisitedPandals] toggle failed:", err);

        // Revert optimistic update
        setVisitedIds((prev) => {
          const reverted = new Set(prev);
          if (wasVisited) {
            reverted.add(pandal.id);
          } else {
            reverted.delete(pandal.id);
          }
          return reverted;
        });

        toast({
          title: "Could not update visited status",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    },
    [userId, visitedIds, toast]
  );

  return { visitedIds, toggleVisited, isLoading };
}
