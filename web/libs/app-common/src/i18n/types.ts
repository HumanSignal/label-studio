export const APP_LOCALES = ["en", "zh-CN"] as const;
export type SupportedLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";
export const FALLBACK_LOCALE: SupportedLocale = "en";

export const LANGUAGE_STORAGE_KEY = "label-studio.lang";

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === "string" && (APP_LOCALES as readonly string[]).includes(value);
}
