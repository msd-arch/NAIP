"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import en from "./messages/en.json";
import ur from "./messages/ur.json";

export type Locale = "en" | "ur";

const MESSAGES: Record<Locale, typeof en> = { en, ur };
const STORAGE_KEY = "naip-locale";

const LocaleContext = createContext<{ locale: Locale; setLocale: (l: Locale) => void }>({
  locale: "en",
  setLocale: () => {},
});

/** Read-only access to the current UI language, for components that need to
    pick between a bilingual pair of strings (e.g. layers.ts's label/labelUr)
    without going through next-intl's message catalog. */
export function useAppLocale() {
  return useContext(LocaleContext);
}

/** EN/UR is a client-side toggle, not a routed locale (no /en, /ur URL
    segments) -- this app is a single persistent map screen, not a set of
    locale-routed pages, so next-intl's App Router [locale] segment pattern
    would be structural churn this track wasn't scoped for. Locale lives in
    React state + localStorage instead, same pattern as any other per-viewer
    UI preference in this app. */
export default function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "ur") setLocaleState(saved);
    } catch {
      /* private browsing / blocked storage -- fall back to English */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore -- toggle still works for this page view */
    }
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
