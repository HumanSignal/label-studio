import type i18next from "i18next";
import enMenubar from "./locales/en/menubar.json";
import zhCnMenubar from "./locales/zh-CN/menubar.json";
import enProjects from "./locales/en/projects.json";
import zhCnProjects from "./locales/zh-CN/projects.json";
import enDataManager from "./locales/en/dataManager.json";
import zhCnDataManager from "./locales/zh-CN/dataManager.json";
import enSettings from "./locales/en/settings.json";
import zhCnSettings from "./locales/zh-CN/settings.json";
import { resolveBrowserLocale } from "./detection";
import { getStoredLanguage } from "./persistence";
import { APP_LOCALES, FALLBACK_LOCALE, type SupportedLocale } from "./types";

export const MENUBAR_NAMESPACE = "menubar";
export const PROJECTS_NAMESPACE = "projects";
export const DATA_MANAGER_NAMESPACE = "dataManager";
export const SETTINGS_NAMESPACE = "settings";
export const NAMESPACES = [
  MENUBAR_NAMESPACE,
  PROJECTS_NAMESPACE,
  DATA_MANAGER_NAMESPACE,
  SETTINGS_NAMESPACE,
] as const;

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
      en: {
        [MENUBAR_NAMESPACE]: enMenubar,
        [PROJECTS_NAMESPACE]: enProjects,
        [DATA_MANAGER_NAMESPACE]: enDataManager,
        [SETTINGS_NAMESPACE]: enSettings,
      },
      "zh-CN": {
        [MENUBAR_NAMESPACE]: zhCnMenubar,
        [PROJECTS_NAMESPACE]: zhCnProjects,
        [DATA_MANAGER_NAMESPACE]: zhCnDataManager,
        [SETTINGS_NAMESPACE]: zhCnSettings,
      },
    },
    interpolation: {
      escapeValue: false,
    },
    returnEmptyString: false,
    appendNamespaceToMissingKey: true,
    parseMissingKeyHandler: (key) => key,
  };
}
