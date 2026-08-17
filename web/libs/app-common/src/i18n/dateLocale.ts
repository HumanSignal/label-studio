import { enUS, zhCN } from "date-fns/locale";
import i18next from "i18next";

/**
 * Resolve the date-fns locale matching the current i18next language.
 * Pass as `{ locale: getDateFnsLocale() }` to format/formatDistance so
 * month names and relative-time phrases follow the UI language.
 */
export function getDateFnsLocale(): Locale {
  return i18next.language?.startsWith("zh") ? zhCN : enUS;
}
