"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  getVisitedPandals,
  markVisited,
  unmarkVisited,
} from "@/services/visitedPandalsService";
import type { Pandal } from "@/lib/types";

export function useVisitedPandals() {
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    getVisitedPandals().then((ids) => {
      if (!cancelled) {
        setVisitedIds(new Set(ids));
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleVisited = useCallback(
    async (pandal: Pandal) => {
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
          await unmarkVisited(pandal.id);
        } else {
          await markVisited(pandal);
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
    [visitedIds, toast]
  );

  return { visitedIds, toggleVisited, isLoading };
}
