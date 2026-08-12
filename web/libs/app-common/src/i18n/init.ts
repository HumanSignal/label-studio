import i18next from "i18next";
import { createI18nConfig } from "./config";

let initialized = false;

export function initI18n(): typeof i18next {
  if (initialized) return i18next;
  if (!i18next.isInitialized) {
    i18next.init(createI18nConfig());
  }
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
