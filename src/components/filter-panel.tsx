
"use client";

import { useState } from 'react';
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

export function FilterPanel({ onFilterChange }: FilterPanelProps) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [isOpen, setIsOpen] = useState(false);

  const applyFilters = (newFilters: Filters) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
    // Track which filters are active
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

    // Logic for exclusive zone/type selection
    if (['north', 'south', 'central', 'metro'].includes(filterName)) {
        newFilters.north = false;
        newFilters.south = false;
        newFilters.central = false;
        newFilters.metro = false;
        if (isChecking) {
            newFilters[filterName as 'north' | 'south' | 'central' | 'metro'] = true;
            newFilters.bonedi = false; // Bonedi doesn't apply to metro
        }
    } else if (filterName === 'bonedi') {
        newFilters.bonedi = isChecking;
        if (isChecking) {
          newFilters.metro = false; // Can't be bonedi and metro
        }
    }

    applyFilters(newFilters);
  };

  const handleClearFilters = () => {
      applyFilters(initialFilters);
      setIsOpen(false);
  }

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
        <Button variant="outline" size="icon" className="bg-background/80 backdrop-blur-sm shadow-lg h-12 w-12 rounded-full border border-foreground/20">
          <Filter className="h-5 w-5 text-primary" />
          <span className="sr-only">Open Filters</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="mb-4 text-center">
          <SheetTitle className="text-2xl font-bold">Filter Pandals</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4">
          <FilterCheckbox id="north" label="North Kolkata" />
          <FilterCheckbox id="south" label="South Kolkata" />
          <FilterCheckbox id="central" label="Central Kolkata" />
          <FilterCheckbox id="bonedi" label="Bonedi Bari" />
          <div className="col-span-2 border-t -mx-4 my-2"></div>
           <div className="col-span-2 flex items-center justify-center">
             <div className="flex items-center space-x-3 py-1">
                <Checkbox
                    id="metro"
                    checked={filters.metro}
                    onCheckedChange={() => handleCheckboxChange("metro")}
                    className="h-6 w-6"
                />
                <Label htmlFor="metro" className="text-lg font-medium text-foreground cursor-pointer flex items-center gap-2">
                    <TramFront className="h-5 w-5"/> Nearest Metro
                </Label>
            </div>
          </div>
        </div>
        <SheetFooter className="mt-6 px-4">
          <Button onClick={() => setIsOpen(false)} className="w-full h-12 text-lg">
              Apply
          </Button>
          <Button onClick={handleClearFilters} variant="ghost" className="w-full h-12 text-lg text-destructive">
              <X className="mr-2 h-5 w-5" />
              Clear Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
