
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { X, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Pandal } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { useLanguage } from "@/hooks/use-language";
import { trackEvent } from "@/lib/analytics";

export function PandalSearch({ pandals }: { pandals: Pandal[] }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Pandal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { language, text } = useLanguage();
  
  const debouncedQuery = useDebounce(query, 200);

  const fetchSuggestions = useCallback((searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsLoading(true);
    setShowSuggestions(true);
    
    const lowerCaseQuery = searchQuery.toLowerCase();
    trackEvent('search_performed', { query: searchQuery });
    const results = pandals.filter(p => {
        const searchableName = p.name_lowercase || p.name.toLowerCase();
        const searchableBengaliName = p.name_bengali_lowercase || p.name_bengali?.toLowerCase();
        return searchableName.includes(lowerCaseQuery) || (searchableBengaliName && searchableBengaliName.includes(lowerCaseQuery));
    });
    setSuggestions(results);
    
    setIsLoading(false);
  }, [pandals]);

  useEffect(() => {
    fetchSuggestions(debouncedQuery);
  }, [debouncedQuery, fetchSuggestions]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = (pandal: Pandal) => (language === 'bn' && pandal.name_bengali) ? pandal.name_bengali : pandal.name;

  const handleSelect = (pandal: Pandal) => {
    setQuery(displayName(pandal));
    setShowSuggestions(false);
    trackEvent('pandal_clicked', { pandal_name: pandal.name, type: pandal.type, zone: pandal.zone ?? 'unknown', source: 'search' });
    // Fire a custom event for the map to listen to.
    // This is more robust than prop drilling for this kind of interaction.
    window.dispatchEvent(new CustomEvent('pandalSelected', { detail: pandal }));
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={searchContainerRef} className="absolute top-4 left-4 w-[90%] max-w-sm z-20">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center transition-transform duration-300">
            <MapPin className="h-6 w-6 text-primary/80" />
        </div>
        <Input
          type="text"
          placeholder={text.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {if(query) setShowSuggestions(true)}}
          className="w-full pl-12 pr-10 h-14 text-base rounded-full shadow-lg bg-background/80 backdrop-blur-sm focus-visible:ring-primary border border-foreground/20"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {showSuggestions && (
        <div className="absolute top-full mt-2 w-full bg-background rounded-2xl shadow-lg overflow-hidden border border-border/50 animate-fade-in">
          {isLoading ? (
            <div className="p-4 flex items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {text.searching}
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="py-2 max-h-60 overflow-y-auto">
              {suggestions.map((pandal) => (
                <li
                  key={pandal.id}
                  onClick={() => handleSelect(pandal)}
                  className="px-4 py-3 cursor-pointer hover:bg-muted text-foreground text-base"
                >
                  {displayName(pandal)}
                </li>
              ))}
            </ul>
          ) : (
             !isLoading && debouncedQuery && <p className="p-4 text-center text-muted-foreground">{text.noPandalsFound}</p>
          )}
        </div>
      )}
    </div>
  );
}
