
"use client";

import { Languages } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trackEvent } from '@/lib/analytics';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div>
       <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background/80 backdrop-blur-sm shadow-lg h-12 w-12 rounded-full border border-foreground/20">
                <Languages className="h-5 w-5 text-primary" />
                <span className="sr-only">Change Language</span>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => { setLanguage('en'); trackEvent('language_switched', { to: 'en' }); }}
              disabled={language === 'en'}
            >
              English
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => { setLanguage('bn'); trackEvent('language_switched', { to: 'bn' }); }}
              disabled={language === 'bn'}
            >
              বাংলা
            </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
}
