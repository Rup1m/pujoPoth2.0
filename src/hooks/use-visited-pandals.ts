"use client";

import { useState, useEffect, useCallback } from "react";

import {
  getVisitedPandals,
  markVisited,
  unmarkVisited,
} from "@/services/visitedPandalsService";
import type { Pandal } from "@/lib/types";

export function useVisitedPandals() {
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Read synchronously on mount to avoid hydration mismatch while preventing async microtask delay
    setVisitedIds(new Set(getVisitedPandals()));
    setIsLoading(false);
  }, []);

  const toggleVisited = useCallback(
    (pandal: Pandal) => {
      const wasVisited = visitedIds.has(pandal.id);

      if (wasVisited) {
        unmarkVisited(pandal.id);
      } else {
        markVisited(pandal);
      }
      
      // Update state synchronously
      setVisitedIds(new Set(getVisitedPandals()));
    },
    [visitedIds]
  );

  return { visitedIds, toggleVisited, isLoading };
}
