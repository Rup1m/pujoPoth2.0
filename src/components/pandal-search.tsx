
"use client";

import { useState, useCallback, useEffect, useRef, memo } from "react";
import { X, Loader2, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Pandal } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { useLanguage } from "@/hooks/use-language";
import { trackEvent } from "@/lib/analytics";

/** Maximum number of search results to display for performance */
const MAX_RESULTS = 8;

/** Keyboard key constants for better readability */
const KEYS = {
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ENTER: "Enter",
  ESCAPE: "Escape",
} as const;

function PandalSearchComponent({ pandals }: { pandals: Pandal[] }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Pandal[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const suggestionsListRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { language, text } = useLanguage();
  
  const debouncedQuery = useDebounce(query, 200);

  const fetchSuggestions = useCallback((searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setTotalMatches(0);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      return;
    }

    setIsLoading(true);
    setShowSuggestions(true);
    setSelectedIndex(-1);
    
    const lowerCaseQuery = searchQuery.toLowerCase();
    trackEvent('search_performed', { query: searchQuery, length: searchQuery.length });

    const filtered = pandals
      .filter((p) => {
        const searchableName = p.name_lowercase || p.name.toLowerCase();
        const searchableBengaliName = p.name_bengali_lowercase || p.name_bengali?.toLowerCase() || "";
        return (
          searchableName.includes(lowerCaseQuery) ||
          searchableBengaliName.includes(lowerCaseQuery)
        );
      });

    setTotalMatches(filtered.length);

    const results = filtered
      .sort((a, b) => {
        const aNameLower = a.name_lowercase || a.name.toLowerCase();
        const bNameLower = b.name_lowercase || b.name.toLowerCase();
        const aStartsWithQuery = aNameLower.startsWith(lowerCaseQuery);
        const bStartsWithQuery = bNameLower.startsWith(lowerCaseQuery);

        if (aStartsWithQuery !== bStartsWithQuery) {
          return aStartsWithQuery ? -1 : 1;
        }

        // Prioritize popular pandals
        if (a.type !== b.type) {
          return a.type === "popular" ? -1 : b.type === "popular" ? 1 : 0;
        }

        // Bonedi Baris come next
        if (a.bonedi !== b.bonedi) {
          return a.bonedi ? -1 : 1;
        }

        return 0;
      })
      // Limit results to prevent performance issues
      .slice(0, MAX_RESULTS);

    setSuggestions(results);
    setIsLoading(false);
  }, [pandals]);

  // Instant clear: no debounce delay when query is too short
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setTotalMatches(0);
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  }, [query]);

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    fetchSuggestions(debouncedQuery);
  }, [debouncedQuery, fetchSuggestions]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsListRef.current) {
      const selectedItem = suggestionsListRef.current.children[selectedIndex];
      if (selectedItem instanceof HTMLElement) {
        selectedItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const displayName = (pandal: Pandal) =>
    language === "bn" && pandal.name_bengali ? pandal.name_bengali : pandal.name;

  const handleSelect = (pandal: Pandal | null) => {
    if (!pandal) return;

    setQuery(displayName(pandal));
    setShowSuggestions(false);
    setSelectedIndex(-1);
    trackEvent("pandal_clicked", {
      pandal_name: pandal.name,
      type: pandal.type,
      zone: pandal.zone ?? "unknown",
      source: "search",
    });

    // Fire a custom event for the map to listen to
    window.dispatchEvent(new CustomEvent("pandalSelected", { detail: pandal }));
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setTotalMatches(0);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === KEYS.ESCAPE) {
        setShowSuggestions(false);
      }
      return;
    }

    switch (e.key) {
      case KEYS.ARROW_DOWN:
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case KEYS.ARROW_UP:
        e.preventDefault();
        setSelectedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
        break;
      case KEYS.ENTER:
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case KEYS.ESCAPE:
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={searchContainerRef} className="absolute top-4 left-4 w-[90%] max-w-sm z-20">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center pointer-events-none">
          <MapPin className="h-6 w-6 text-primary/80" />
        </div>
        <Input
          ref={inputRef}
          type="text"
          placeholder={text.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query) setShowSuggestions(true);
          }}
          aria-label="Search pandals"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          className="w-full pl-12 pr-10 h-14 text-base rounded-full shadow-lg bg-background/80 backdrop-blur-sm focus-visible:ring-primary border border-foreground/20"
        />
        {query && (
          <button
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {showSuggestions && (
        <div
          className="absolute top-full mt-2 w-full bg-background rounded-2xl shadow-lg overflow-hidden border border-border/50 animate-fade-in"
          role="listbox"
        >
          {isLoading ? (
            <div className="p-4 flex items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {text.searching}
            </div>
          ) : suggestions.length > 0 ? (
            <>
              <ul
                ref={suggestionsListRef}
                className="py-2 max-h-60 overflow-y-auto"
                role="listbox"
              >
                {suggestions.map((pandal, index) => (
                  <li
                    key={pandal.id}
                    onClick={() => handleSelect(pandal)}
                    role="option"
                    aria-selected={index === selectedIndex}
                    className={`px-4 py-3 cursor-pointer transition-colors text-base ${
                      index === selectedIndex
                        ? "bg-primary/20 text-foreground font-semibold"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    {displayName(pandal)}
                    {pandal.type === "popular" && (
                      <span className="ml-2 text-xs text-primary font-semibold">★</span>
                    )}
                  </li>
                ))}
              </ul>
              {totalMatches > MAX_RESULTS && (
                <p className="text-xs text-muted-foreground text-center py-2 px-4">
                  Showing {MAX_RESULTS} of {totalMatches} results
                </p>
              )}
            </>
          ) : (
            !isLoading &&
            debouncedQuery && (
              <p className="p-4 text-center text-muted-foreground">
                {text.noPandalsFound}
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}

export const PandalSearch = memo(PandalSearchComponent);
