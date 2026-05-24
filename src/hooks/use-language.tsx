
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { locales, Lang, Translations } from '@/lib/locales';

interface LanguageContextType {
  language: Lang;
  setLanguage: (language: Lang) => void;
  text: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Lang>('en');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedLang = localStorage.getItem('lang') as Lang;
    if (storedLang && locales[storedLang]) {
      setLanguageState(storedLang);
    }
  }, []);

  const setLanguage = (lang: Lang) => {
    setLanguageState(lang);
    if (isClient) {
      localStorage.setItem('lang', lang);
    }
  };

  const text = locales[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, text }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    // Provide default 'en' translations if context is not available
    return {
        language: 'en',
        setLanguage: () => console.warn("LanguageProvider not found"),
        text: locales.en
    }
  }
  return context;
};
