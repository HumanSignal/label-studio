import { APP_LOCALES, DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from "./types";

/**
 * Resolve the user's preferred browser locale to one of our supported locales.
 *
 * Strategy (first match wins, in order):
 *   1. Exact match (e.g. "zh-CN" → "zh-CN")
 *   2. Primary subtag match (e.g. "zh-TW" → "zh-CN"; "en-GB" → "en")
 *   3. Fall back to default (en)
 *
 * @param browserLanguages typically `navigator.languages`
 */
export function resolveBrowserLocale(browserLanguages: readonly string[]): SupportedLocale {
  for (const tag of browserLanguages) {
    if (!tag) continue;
    if (isSupportedLocale(tag)) return tag;
    const primary = tag.split("-")[0];
    if (!primary) continue;
    const match = (APP_LOCALES as readonly string[]).find(
      (supported) => supported === primary || supported.startsWith(`${primary}-`),
    );
    if (match && isSupportedLocale(match)) return match;
  }
  return DEFAULT_LOCALE;
}
