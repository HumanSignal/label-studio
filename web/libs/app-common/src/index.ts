import * as pages from "./pages";

export { pages };

// Hooks
export { useStateHistory, type StateHistoryItem, type StateHistoryResponse } from "./hooks/useStateHistory";

// Components
export * from "./components/state-chips";

// i18n
export { I18nProvider, type I18nProviderProps } from "./i18n/I18nProvider";
export { useLanguage, type UseLanguageResult } from "./i18n/useLanguage";
export {
  APP_LOCALES,
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  isSupportedLocale,
  type SupportedLocale,
} from "./i18n/types";
export { resolveBrowserLocale } from "./i18n/detection";
export { resolveInitialLanguage } from "./i18n/config";
