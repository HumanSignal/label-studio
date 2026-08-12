# Frontend i18n

Label Studio's frontend is being migrated incrementally to support multiple languages. This README describes how to add or update translations.

## Supported Locales

| Code    | Language                    |
|---------|-----------------------------|
| `en`    | English (default, fallback) |
| `zh-CN` | Simplified Chinese          |

## Architecture

```
libs/app-common/src/i18n/
├── config.ts           # i18next config factory (createI18nConfig, resolveInitialLanguage)
├── init.ts             # idempotent init() — imported once at app boot
├── I18nProvider.tsx    # React provider mounted in App.jsx
├── useLanguage.ts      # hook: { language, setLanguage, t }
├── persistence.ts      # localStorage layer (key: `label-studio.lang`)
├── detection.ts        # browser-locale → supported-locale resolver
├── types.ts            # SupportedLocale, APP_LOCALES, helpers
└── locales/
    ├── en/<namespace>.json
    └── zh-CN/<namespace>.json
```

The i18next instance is a module-level singleton, initialized exactly once via the side-effectful `init.ts` import (see `apps/labelstudio/src/main.tsx`).

## Translating a new surface

1. **Pick a namespace.** Each migrated surface (e.g. `menubar`, `account-settings`, `data-manager`) gets its own JSON file under `locales/<lang>/`. The filename is the namespace.

2. **Extract strings in the component:**
   ```tsx
   import { useTranslation } from "react-i18next";
   // ...
   const { t } = useTranslation();
   // Before:  <Menu.Item label="Projects" />
   // After:   <Menu.Item label={t("menubar:projects")} />
   ```

3. **Add keys to `locales/en/<namespace>.json`** (canonical source of truth).
4. **Add the same keys to `locales/zh-CN/<namespace>.json`** (and any other supported locale).
5. **Register the namespace** in `config.ts`:
   ```ts
   import enFoo from "./locales/en/foo.json";
   import zhCnFoo from "./locales/zh-CN/foo.json";

   export const NAMESPACES = ["menubar", "foo"] as const;
   // ...and inside createI18nConfig:
   resources: {
     en: { ..., foo: enFoo },
     "zh-CN": { ..., foo: zhCnFoo },
   }
   ```

6. **Write a unit test** asserting the component renders in `en` and `zh-CN` (see `useLanguage.test.tsx` and `apps/labelstudio/src/components/Menubar/Menubar.test.jsx` for the pattern).

## Missing-key behavior

- If a key is missing in the active locale, i18next falls back to `en`.
- If the key is also missing in `en`, the **namespaced key string itself** is returned (e.g. `"menubar:some.unknown.key"`). This is configured via `appendNamespaceToMissingKey: true` + `parseMissingKeyHandler` in `config.ts`, which makes missing keys obvious during development without breaking production.

## Language selection

- **First visit:** Browser language (`navigator.languages`) is resolved via `detection.ts`. Unmapped locales fall back to `en`.
- **Explicit choice:** Stored in `localStorage` under key `label-studio.lang`. The `useLanguage().setLanguage(locale)` hook updates both i18next and `localStorage`.
- **A visible UI selector is intentionally deferred** to a follow-up PR (see [Issue #9878](https://github.com/HumanSignal/label-studio/issues/9878)).

## Adding a new locale

1. Add the code to `APP_LOCALES` in `types.ts` (this is the single source of truth — `SupportedLocale` is derived from it).
2. Create `locales/<new-locale>/` mirroring the English structure (one JSON file per namespace).
3. Add an entry to `resources` in `createI18nConfig` (in `config.ts`).
4. Add unit tests in `detection.test.ts` covering the new locale's browser variants (e.g. `zh-TW` → `zh-CN` style mappings).

## Key naming conventions

- Use **camelCase** for keys: `slackCommunity`, not `slack_community` or `Slack Community`.
- Group related keys under a single namespace file — do not create one file per component.
- Avoid HTML entities in values; store plain text (`"Account & Settings"`, not `"Account &amp; Settings"`). React escapes as needed.

## Out of scope for the foundation PR

- antd `ConfigProvider` locale (Phase 2)
- date-fns locale wiring (Phase 2)
- Django server-rendered templates
- Editor and Data Manager surfaces (separate PRs)
- Backend language preference on the User model

## Source

- Original PRD: [HumanSignal/label-studio#9878](https://github.com/HumanSignal/label-studio/issues/9878)
- Implementation plan: `docs/superpowers/plans/2026-08-12-frontend-i18n-foundation.md`
