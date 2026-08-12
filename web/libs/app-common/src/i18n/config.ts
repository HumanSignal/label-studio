import type i18next from "i18next";
import enMenubar from "./locales/en/menubar.json";
import zhCnMenubar from "./locales/zh-CN/menubar.json";
import { resolveBrowserLocale } from "./detection";
import { getStoredLanguage } from "./persistence";
import { APP_LOCALES, FALLBACK_LOCALE, type SupportedLocale } from "./types";

export const MENUBAR_NAMESPACE = "menubar";
export const NAMESPACES = [MENUBAR_NAMESPACE] as const;

export function resolveInitialLanguage(browserLanguages: readonly string[]): SupportedLocale {
  const stored = getStoredLanguage();
  if (stored) return stored;
  return resolveBrowserLocale(browserLanguages);
}

export interface I18nConfigOptions {
  initialLanguage?: SupportedLocale;
  browserLanguages?: readonly string[];
}

export function createI18nConfig(options: I18nConfigOptions = {}): i18next.InitOptions {
  const initialLanguage = options.initialLanguage ?? resolveInitialLanguage(options.browserLanguages ?? []);

  return {
    lng: initialLanguage,
    fallbackLng: FALLBACK_LOCALE,
    supportedLngs: [...APP_LOCALES],
    ns: [...NAMESPACES],
    defaultNS: MENUBAR_NAMESPACE,
    resources: {
      en: { [MENUBAR_NAMESPACE]: enMenubar },
      "zh-CN": { [MENUBAR_NAMESPACE]: zhCnMenubar },
    },
    interpolation: {
      escapeValue: false,
    },
    returnEmptyString: false,
    appendNamespaceToMissingKey: true,
    parseMissingKeyHandler: (key) => key,
  };
}
