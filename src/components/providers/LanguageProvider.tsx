'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { translate, locales, type Locale, type TranslationKey } from '@/lib/i18n';

const STORAGE_KEY = 'smmo:locale';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default to English on first render (server and client must match to
  // avoid a hydration mismatch); the real preference is applied right after
  // mount, from localStorage — see the effect below.
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate one-time hydration from localStorage, not a cascading-render bug
      if (isLocale(stored)) setLocaleState(stored);
    } catch {
      // Storage can be unavailable (private browsing, etc.) — English stays the default.
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal — the choice just won't persist across reloads on this device.
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** Access the current locale, a setter, and t() for translated strings. Must be used within LanguageProvider (mounted app-wide in the root layout). */
export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation() must be used within <LanguageProvider>');
  return ctx;
}
