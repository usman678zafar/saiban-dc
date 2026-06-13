'use client';

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Languages } from 'lucide-react';

export type ViewerLanguage = 'en' | 'ur';

type ViewerLanguageContextValue = {
  language: ViewerLanguage;
  setLanguage: (language: ViewerLanguage) => void;
  toggleLanguage: () => void;
};

const ViewerLanguageContext = createContext<ViewerLanguageContextValue | null>(null);
const STORAGE_KEY = 'saiban-viewer-language';

export function ViewerLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<ViewerLanguage>('en');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'ur') setLanguageState(stored);
  }, []);

  const value = useMemo<ViewerLanguageContextValue>(() => {
    const setLanguage = (nextLanguage: ViewerLanguage) => {
      setLanguageState(nextLanguage);
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    };

    return {
      language,
      setLanguage,
      toggleLanguage: () => setLanguage(language === 'en' ? 'ur' : 'en'),
    };
  }, [language]);

  return <ViewerLanguageContext.Provider value={value}>{children}</ViewerLanguageContext.Provider>;
}

export function useViewerLanguage() {
  const context = useContext(ViewerLanguageContext);
  if (!context) {
    throw new Error('useViewerLanguage must be used inside ViewerLanguageProvider');
  }
  return context;
}

export function ViewerLanguageButton() {
  const { language, toggleLanguage } = useViewerLanguage();
  const nextLabel = language === 'en' ? 'اردو' : 'English';

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dbe4ef] bg-white px-3 text-xs font-semibold text-[#0f1f33] shadow-sm transition hover:bg-[#f6f9fd]"
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      {nextLabel}
    </button>
  );
}

export function ViewerLocalizedText({
  en,
  ur,
  as: Component = 'span',
  className,
}: {
  en: string;
  ur: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
}) {
  const { language } = useViewerLanguage();
  const isBlockElement = Component !== 'span';
  const shouldAutoAlign = isBlockElement && !/\btext-(left|right|center|justify)\b/.test(className ?? '');
  const blockClass = isBlockElement ? 'block w-full' : '';
  const alignmentClass = shouldAutoAlign ? (language === 'ur' ? 'text-right' : 'text-left') : '';

  return (
    <Component className={[className, blockClass, alignmentClass].filter(Boolean).join(' ')} dir={language === 'ur' ? 'rtl' : 'ltr'}>
      {language === 'ur' ? ur : en}
    </Component>
  );
}
