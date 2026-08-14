import i18next from "i18next";
import { setI18n } from "react-i18next";
import { createI18nConfig } from "./config";

let initialized = false;

export function initI18n(): typeof i18next {
  if (initialized) return i18next;
  if (!i18next.isInitialized) {
    i18next.init(createI18nConfig());
  }
  // Also make this instance react-i18next's default, so useTranslation() works
  // in trees rendered without an <I18nProvider> (tests, standalone Data Manager).
  setI18n(i18next);
  initialized = true;
  return i18next;
}

export function getI18n(): typeof i18next {
  if (!initialized) {
    return initI18n();
  }
  return i18next;
}

// Side-effectful import for use in main.tsx: `import "@humansignal/app-common/i18n/init";`
initI18n();
