# Frontend translations

The shared frontend internationalization layer uses `i18next` and `react-i18next`. English (`en`) is the canonical and fallback language. Locale resources live in `locales/<locale>.ts` under the `app` namespace.

## Add or update a locale

1. Add the locale resource in `locales/`, matching the nested key structure in `locales/en.ts`.
2. Register the locale in `SUPPORTED_LANGUAGES` and `resources` in `index.ts`.
3. Keep user-provided values out of translation resources and pass dynamic application values with i18next interpolation.
4. Add unit coverage for locale matching, English fallback, interpolation, and any plural forms introduced by the locale.

Use stable, semantic keys grouped by frontend surface, for example `navigation.projects`. A missing key intentionally falls back to English. Explicit choices are stored under `label-studio.language`; when there is no saved choice, the first supported browser locale is used.
