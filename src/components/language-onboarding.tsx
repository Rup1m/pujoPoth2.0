
"use client";

import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';

interface LanguageOnboardingProps {
  onLanguageSelect: () => void;
}

export function LanguageOnboarding({ onLanguageSelect }: LanguageOnboardingProps) {
  const { setLanguage } = useLanguage();

  const handleSelect = (lang: 'en' | 'bn') => {
    setLanguage(lang);
    onLanguageSelect();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-background p-8">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-5xl font-bold text-primary tracking-tight">
            <span className="font-calligraphy">Pujo</span><span className="font-extrabold text-6xl">পথ</span>
        </h1>
        <p className="text-muted-foreground">Your smart puja guide</p>
      </div>
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Which language would you like to use?</h1>
        <h2 className="text-xl font-bold text-foreground">আপনি কোন ভাষা ব্যবহার করতে চান?</h2>
      </div>
      <div className="mt-12 space-y-6 w-full max-w-xs">
        <Button
          onClick={() => handleSelect('en')}
          className="w-full h-16 text-xl"
          variant="outline"
        >
          English
        </Button>
        <Button
          onClick={() => handleSelect('bn')}
          className="w-full h-16 text-xl"
          variant="outline"
        >
          বাংলা
        </Button>
      </div>
    </div>
  );
}
