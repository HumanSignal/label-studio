import { LANGUAGE_STORAGE_KEY, isSupportedLocale, type SupportedLocale } from "./types";

export function getStoredLanguage(): SupportedLocale | null {
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setStoredLanguage(locale: SupportedLocale): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
  } catch {
    /* localStorage may be unavailable (private mode, quota) — swallow */
  }
}

export function clearStoredLanguage(): void {
  try {
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
  } catch {
    /* same as above */
  }
}
