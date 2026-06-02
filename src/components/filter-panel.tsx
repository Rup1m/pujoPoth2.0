
"use client";

import { useState, memo } from 'react';
import { Filter, X, TramFront } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger } from '@/components/ui/sheet';
import { trackEvent } from '@/lib/analytics';

export interface Filters {
  north: boolean;
  south: boolean;
  central: boolean;
  bonedi: boolean;
  metro: boolean;
}

interface FilterPanelProps {
  onFilterChange: (filters: Filters) => void;
}

const initialFilters: Filters = {
    north: false,
    south: false,
    central: false,
    bonedi: false,
    metro: false,
};

const STORAGE_KEY = 'pujopoth_filters';

/**
 * Retrieves saved filters from localStorage, with fallback to initial state
 */
function getSavedFilters(): Filters {
  if (typeof window === 'undefined') return initialFilters;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...initialFilters, ...parsed };
    }
  } catch {
    // Ignore parse errors
  }
  return initialFilters;
}

/**
 * Saves filters to localStorage
 */
function saveFilters(filters: Filters): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Count active filters for UI indicator
 */
function countActiveFilters(filters: Filters): number {
  return Object.values(filters).filter(Boolean).length;
}

function FilterPanelComponent({ onFilterChange }: FilterPanelProps) {
  const [filters, setFilters] = useState<Filters>(() => getSavedFilters());
  const [isOpen, setIsOpen] = useState(false);

  const applyFilters = (newFilters: Filters) => {
    setFilters(newFilters);
    saveFilters(newFilters);
    onFilterChange(newFilters);

    // Track analytics
    const activeFilters = Object.entries(newFilters)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(',');
    if (activeFilters) {
      trackEvent('filter_applied', { filters: activeFilters });
    }
  };

  const handleCheckboxChange = (filterName: keyof Filters) => {
    const newFilters = { ...filters };
    const isChecking = !newFilters[filterName];

    // Zone filters are mutually exclusive with each other and metro
    if (['north', 'south', 'central'].includes(filterName)) {
      // Clear all zone filters
      newFilters.north = false;
      newFilters.south = false;
      newFilters.central = false;
      newFilters.metro = false;
      
      // Set the selected zone if checking
      if (isChecking) {
        newFilters[filterName as 'north' | 'south' | 'central'] = true;
        // Bonedi can coexist with zone filters
        // (don't reset bonedi here)
      }
    } else if (filterName === 'bonedi') {
      // Bonedi is compatible with zones but not metro
      newFilters.bonedi = isChecking;
      if (isChecking && filters.metro) {
        newFilters.metro = false; // Can't be bonedi and metro
      }
    } else if (filterName === 'metro') {
      // Metro is exclusive - clears zone filters and bonedi
      if (isChecking) {
        newFilters.north = false;
        newFilters.south = false;
        newFilters.central = false;
        newFilters.bonedi = false;
      }
      newFilters.metro = isChecking;
    }

    applyFilters(newFilters);
  };

  const handleClearFilters = () => {
    applyFilters(initialFilters);
    setIsOpen(false);
    trackEvent('filter_cleared');
  };

  const activeFilterCount = countActiveFilters(filters);
  const hasActiveFilters = activeFilterCount > 0;

  const FilterCheckbox = ({ id, label }: { id: keyof Filters; label: string }) => (
    <div className="flex items-center space-x-3 py-3">
      <Checkbox
        id={id}
        checked={filters[id]}
        onCheckedChange={() => handleCheckboxChange(id)}
        className="h-6 w-6"
      />
      <Label htmlFor={id} className="text-lg font-medium text-foreground cursor-pointer">
        {label}
      </Label>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="bg-background/80 backdrop-blur-sm shadow-lg h-12 w-12 rounded-full border border-foreground/20 relative"
          aria-label={`Filter pandals${hasActiveFilters ? ` (${activeFilterCount} active)` : ''}`}
        >
          <Filter className="h-5 w-5 text-primary" />
          
          {/* Active filter indicator badge */}
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              {activeFilterCount}
            </span>
          )}
          
          <span className="sr-only">
            Open Filters
            {hasActiveFilters && ` - ${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''} active`}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="mb-4 text-center">
          <SheetTitle className="text-2xl font-bold">
            Filter Pandals
            {hasActiveFilters && (
              <span className="text-base font-normal text-muted-foreground ml-2">
                ({activeFilterCount} active)
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4">
          {/* Zone Filters */}
          <fieldset>
            <legend className="sr-only">Filter by zone</legend>
            <FilterCheckbox id="north" label="North Kolkata" />
            <FilterCheckbox id="south" label="South Kolkata" />
            <FilterCheckbox id="central" label="Central Kolkata" />
          </fieldset>

          {/* Bonedi Filter */}
          <FilterCheckbox id="bonedi" label="Bonedi Bari" />

          <div className="col-span-2 border-t -mx-4 my-2"></div>

          {/* Metro Filter (Exclusive) */}
          <div className="col-span-2 flex items-center justify-center">
            <div className="flex items-center space-x-3 py-1">
              <Checkbox
                id="metro"
                checked={filters.metro}
                onCheckedChange={() => handleCheckboxChange("metro")}
                className="h-6 w-6"
              />
              <Label htmlFor="metro" className="text-lg font-medium text-foreground cursor-pointer flex items-center gap-2">
                <TramFront className="h-5 w-5" /> Nearest Metro
              </Label>
            </div>
          </div>

          {/* Info text */}
          <p className="col-span-2 text-xs text-muted-foreground text-center mt-2 px-1">
            Zone filters are mutually exclusive. Metro overrides all other filters.
          </p>
        </div>

        <SheetFooter className="mt-6 px-4 gap-2">
          <Button onClick={() => setIsOpen(false)} className="w-full h-12 text-lg">
            Apply
          </Button>
          {hasActiveFilters && (
            <Button onClick={handleClearFilters} variant="ghost" className="w-full h-12 text-lg text-destructive">
              <X className="mr-2 h-5 w-5" />
              Clear Filters
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export const FilterPanel = memo(FilterPanelComponent);
