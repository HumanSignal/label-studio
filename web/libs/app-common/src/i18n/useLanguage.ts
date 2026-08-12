import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { setStoredLanguage } from "./persistence";
import { isSupportedLocale, type SupportedLocale } from "./types";

export interface UseLanguageResult {
  language: string;
  setLanguage: (locale: SupportedLocale) => void;
  t: ReturnType<typeof useTranslation>["t"];
}

export function useLanguage(): UseLanguageResult {
  const { t, i18n } = useTranslation();
  const setLanguage = useCallback(
    (locale: SupportedLocale) => {
      if (!isSupportedLocale(locale)) return;
      i18n.changeLanguage(locale);
      setStoredLanguage(locale);
    },
    [i18n],
  );

  return { language: i18n.language, setLanguage, t };
}
