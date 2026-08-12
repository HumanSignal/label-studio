# Frontend Internationalization (i18n) Foundation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce an incremental frontend internationalization layer for Label Studio, with English fallback and Simplified Chinese (`zh-CN`) as the first validation locale, and migrate the `Menubar` (app-shell surface) as the proof of concept.

**Architecture:** Add a shared `i18n` module under `libs/app-common/src/i18n/` built on `i18next` + `react-i18next` + `i18next-browser-languagedetector`. Initialize once at app boot, mount an `I18nextProvider` inside `App.jsx`'s `MultiProvider`, persist explicit language choice in `localStorage`, and migrate one self-contained surface (`Menubar.jsx`) using the `useTranslation` hook. No backend / DB / API changes.

**Tech Stack:**
- `i18next` (core) + `react-i18next` (React binding) + `i18next-browser-languagedetector` (browser-language detection)
- `bun` (package manager) + `rolldown-vite` (bundler)
- `bun:test` (unit) + `cypress` (e2e)
- React 18.3.1 + antd 4.3.3 + date-fns 2.20.1 (locale-ready for later phases)

**Source PRD:** [HumanSignal/label-studio#9878](https://github.com/HumanSignal/label-studio/issues/9878)

---

## Scope Boundaries (Phase 1: Foundation PR)

**In scope:**
- New shared `i18n` module in `libs/app-common`
- English resources (canonical) + a small `zh-CN` resource set for the migrated surface only
- Browser-language detection + explicit user selection persisted in `localStorage`
- Safe fallback to English for unsupported locales and missing keys
- Migrate `apps/labelstudio/src/components/Menubar/Menubar.jsx` only
- Unit tests + one focused e2e test
- Contributor documentation

**Out of scope (future PRs):**
- Migrating Editor / Data Manager / other app-shell surfaces
- antd `ConfigProvider` locale wiring (Phase 2 candidate)
- date-fns locale wiring
- Django server-rendered templates
- Backend language preference field on User model
- Translating user-generated content (project names, label values, task data)

**File Structure:**

```
web/libs/app-common/src/
├── i18n/
│   ├── config.ts              # i18next instance creation + init options
│   ├── init.ts                # side-effectful init() called at app boot
│   ├── I18nProvider.tsx        # React provider wrapper, exposed to App.jsx
│   ├── types.ts                # AppLocales, SupportedLocale, LanguageKey
│   ├── persistence.ts          # localStorage get/set + key constant
│   ├── detection.ts            # browser-locale → supported-locale resolution
│   ├── useLanguage.ts          # useLanguage() hook: { language, setLanguage, t }
│   ├── locales/
│   │   ├── en/
│   │   │   └── menubar.json    # English resources for Menubar surface
│   │   └── zh-CN/
│   │       └── menubar.json    # Simplified Chinese resources for Menubar surface
│   ├── config.test.ts          # init contract + fallback
│   ├── persistence.test.ts     # localStorage round-trip
│   ├── detection.test.ts       # browser locale resolution matrix
│   └── useLanguage.test.tsx    # hook: switch language, persist, fallback
├── index.ts                    # re-export i18n public API (MODIFY)
└── ...

web/apps/labelstudio/src/
├── app/App.jsx                 # add <I18nProvider/> to MultiProvider (MODIFY)
├── main.tsx                    # import " @humansignal/app-common/i18n/init" before App (MODIFY)
└── components/Menubar/
    ├── Menubar.jsx             # useTranslation() — replace hardcoded strings (MODIFY)
    └── Menubar.test.jsx        # NEW: render + translation assertions

web/apps/labelstudio-e2e/src/
└── e2e/i18n.cy.ts              # NEW: language switch + reload persistence

web/libs/app-common/src/i18n/README.md                          # contributor docs (NEW)
```

---

## Chunk 1: Foundation — Dependencies & Initialization Layer

This chunk delivers a working i18next instance, configured and exported but **not yet mounted** in the React tree. It can be unit-tested in isolation.

### Task 1: Install i18next dependencies

**Files:**
- Modify: `web/package.json` (add to `dependencies`)
- Modify: `web/bunfig.toml` (temporary exclude for fresh packages)

- [ ] **Step 1: Check npm registry release dates**

i18next ecosystem publishes frequently. The project's `bunfig.toml` sets `minimumReleaseAge = 604800` (7 days), which blocks installing packages younger than 7 days.

Run:
```bash
npm view i18next time --json | tail -5
npm view react-i18next time --json | tail -5
npm view i18next-browser-languagedetector time --json | tail -5
```

Verify the latest version of each was published **≥ 7 days ago**. If yes, no `bunfig.toml` change is needed. If no, add to `minimumReleaseAgeExcludes`:

```toml
minimumReleaseAgeExcludes = ["@types/bun", "typescript", "@humansignal/audio-file-decoder", "i18next", "react-i18next", "i18next-browser-languagedetector"]
```

- [ ] **Step 2: Install the three dependencies**

Run from `web/`:
```bash
bun add i18next react-i18next i18next-browser-languagedetector
```

Expected: `package.json` gains three entries under `dependencies`. `bun.lock` updates.

- [ ] **Step 3: Verify installation succeeded**

Run:
```bash
bun --bun run biome check --write package.json
ls node_modules/i18next/package.json node_modules/react-i18next/package.json node_modules/i18next-browser-languagedetector/package.json
```

Expected: all three paths exist; `package.json` passes biome formatting.

- [ ] **Step 4: Commit**

```bash
git add web/package.json web/bun.lock web/bunfig.toml
git commit -m "chore(web): add i18next, react-i18next, and browser language detector

Foundation for incremental frontend internationalization (see Issue #9878)."
```

---

### Task 2: Define locale types and constants

**Files:**
- Create: `web/libs/app-common/src/i18n/types.ts`
- Test: `web/libs/app-common/src/i18n/types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `types.test.ts`:
```typescript
import { expect, it } from "bun:test";
import {
  APP_LOCALES,
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  isSupportedLocale,
  type SupportedLocale,
} from "./types";

it("exports English as both default and fallback locale", () => {
  expect(DEFAULT_LOCALE).toBe("en");
  expect(FALLBACK_LOCALE).toBe("en");
});

it("includes en and zh-CN in APP_LOCALES", () => {
  expect(APP_LOCALES).toContain("en");
  expect(APP_LOCALES).toContain("zh-CN");
});

it("isSupportedLocale narrows unknown strings back to false", () => {
  expect(isSupportedLocale("en")).toBe(true);
  expect(isSupportedLocale("zh-CN")).toBe(true);
  expect(isSupportedLocale("fr")).toBe(false);
  expect(isSupportedLocale("zh")).toBe(false);
  expect(isSupportedLocale("")).toBe(false);
});

it("SupportedLocale type accepts the two known values at compile time", () => {
  const a: SupportedLocale = "en";
  const b: SupportedLocale = "zh-CN";
  expect([a, b]).toEqual(["en", "zh-CN"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `web/`:
```bash
bun test --dom libs/app-common/src/i18n/types.test.ts
```
Expected: FAIL with `Cannot find module './types'`.

- [ ] **Step 3: Write the implementation**

Create `types.ts`:
```typescript
export const APP_LOCALES = ["en", "zh-CN"] as const;
export type SupportedLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";
export const FALLBACK_LOCALE: SupportedLocale = "en";

export const LANGUAGE_STORAGE_KEY = "label-studio.lang";

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === "string" && (APP_LOCALES as readonly string[]).includes(value);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
bun test --dom libs/app-common/src/i18n/types.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add web/libs/app-common/src/i18n/types.ts web/libs/app-common/src/i18n/types.test.ts
git commit -m "feat(i18n): add SupportedLocale type and locale constants"
```

---

### Task 3: Implement localStorage persistence layer

**Files:**
- Create: `web/libs/app-common/src/i18n/persistence.ts`
- Test: `web/libs/app-common/src/i18n/persistence.test.ts`

- [ ] **Step 1: Write the failing test**

Create `persistence.test.ts`:
```typescript
import { afterEach, beforeEach, expect, it, mock } from "bun:test";
import { clearStoredLanguage, getStoredLanguage, setStoredLanguage } from "./persistence";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

it("returns null when no language is stored", () => {
  expect(getStoredLanguage()).toBeNull();
});

it("round-trips a supported language through localStorage", () => {
  setStoredLanguage("zh-CN");
  expect(getStoredLanguage()).toBe("zh-CN");
  expect(localStorage.getItem("label-studio.lang")).toBe("zh-CN");
});

it("overwrites the previous value on subsequent writes", () => {
  setStoredLanguage("zh-CN");
  setStoredLanguage("en");
  expect(getStoredLanguage()).toBe("en");
});

it("clearStoredLanguage removes the entry", () => {
  setStoredLanguage("en");
  clearStoredLanguage();
  expect(getStoredLanguage()).toBeNull();
});

it("silently ignores quota / disabled localStorage", () => {
  const original = globalThis.localStorage;
  const throwing = {
    ...original,
    getItem: () => {
      throw new Error("disabled");
    },
    setItem: () => {
      throw new Error("quota");
    },
    removeItem: () => {
      throw new Error("disabled");
    },
  } as Storage;
  Object.defineProperty(globalThis, "localStorage", { value: throwing, configurable: true });

  expect(getStoredLanguage()).toBeNull();
  expect(() => setStoredLanguage("en")).not.toThrow();
  expect(() => clearStoredLanguage()).not.toThrow();

  Object.defineProperty(globalThis, "localStorage", { value: original, configurable: true });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test --dom libs/app-common/src/i18n/persistence.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `persistence.ts`:
```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test --dom libs/app-common/src/i18n/persistence.test.ts
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add web/libs/app-common/src/i18n/persistence.ts web/libs/app-common/src/i18n/persistence.test.ts
git commit -m "feat(i18n): add localStorage-backed language persistence with safe failure"
```

---

### Task 4: Implement browser-locale detection

**Files:**
- Create: `web/libs/app-common/src/i18n/detection.ts`
- Test: `web/libs/app-common/src/i18n/detection.test.ts`

- [ ] **Step 1: Write the failing test**

Create `detection.test.ts`:
```typescript
import { expect, it } from "bun:test";
import { resolveBrowserLocale } from "./detection";

it("maps exact zh-CN match", () => {
  expect(resolveBrowserLocale(["zh-CN"])).toBe("zh-CN");
});

it("maps zh-TW / zh-HK / plain zh to zh-CN as the closest supported locale", () => {
  expect(resolveBrowserLocale(["zh-TW"])).toBe("zh-CN");
  expect(resolveBrowserLocale(["zh-HK"])).toBe("zh-CN");
  expect(resolveBrowserLocale(["zh"])).toBe("zh-CN");
});

it("returns en for English variants", () => {
  expect(resolveBrowserLocale(["en-US"])).toBe("en");
  expect(resolveBrowserLocale(["en-GB"])).toBe("en");
  expect(resolveBrowserLocale(["en"])).toBe("en");
});

it("falls back to en when no language matches", () => {
  expect(resolveBrowserLocale(["fr", "de-DE", "ja-JP"])).toBe("en");
});

it("falls back to en when the list is empty", () => {
  expect(resolveBrowserLocale([])).toBe("en");
});

it("respects order: prefers earlier languages when multiple match", () => {
  expect(resolveBrowserLocale(["zh-CN", "en"])).toBe("zh-CN");
  expect(resolveBrowserLocale(["en", "zh-CN"])).toBe("en");
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test --dom libs/app-common/src/i18n/detection.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `detection.ts`:
```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test --dom libs/app-common/src/i18n/detection.test.ts
```
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add web/libs/app-common/src/i18n/detection.ts web/libs/app-common/src/i18n/detection.test.ts
git commit -m "feat(i18n): add browser-locale resolver with primary-subtag fallback"
```

---

### Task 5: Add English and zh-CN resource bundles for `menubar` namespace

**Files:**
- Create: `web/libs/app-common/src/i18n/locales/en/menubar.json`
- Create: `web/libs/app-common/src/i18n/locales/zh-CN/menubar.json`

These resources cover every user-visible string currently hardcoded in `apps/labelstudio/src/components/Menubar/Menubar.jsx` (see Task 10 for the call-site mapping).

- [ ] **Step 1: Create English resource bundle**

`locales/en/menubar.json`:
```json
{
  "logoAlt": "Label Studio Logo",
  "keyboardShortcuts": "Keyboard Shortcuts",
  "keyboardShortcutsTooltip": "Keyboard Shortcuts",
  "account": "Account & Settings",
  "logOut": "Log Out",
  "newsletterNotice": "Please check new notification settings in the Account & Settings page",
  "home": "Home",
  "projects": "Projects",
  "organization": "Organization",
  "api": "API",
  "docs": "Docs",
  "github": "GitHub",
  "slackCommunity": "Slack Community",
  "pinMenu": "Pin menu",
  "unpinMenu": "Unpin menu"
}
```

- [ ] **Step 2: Create Simplified Chinese resource bundle**

`locales/zh-CN/menubar.json`:
```json
{
  "logoAlt": "Label Studio 标志",
  "keyboardShortcuts": "快捷键",
  "keyboardShortcutsTooltip": "快捷键",
  "account": "账户与设置",
  "logOut": "退出登录",
  "newsletterNotice": "请在账户与设置页面查看新的通知设置",
  "home": "首页",
  "projects": "项目",
  "organization": "组织",
  "api": "API",
  "docs": "文档",
  "github": "GitHub",
  "slackCommunity": "Slack 社区",
  "pinMenu": "固定菜单",
  "unpinMenu": "取消固定菜单"
}
```

- [ ] **Step 3: Validate JSON syntax**

```bash
node -e "console.log(require('./web/libs/app-common/src/i18n/locales/en/menubar.json'))" && \
node -e "console.log(require('./web/libs/app-common/src/i18n/locales/zh-CN/menubar.json'))"
```

Expected: both objects printed without error.

- [ ] **Step 4: Commit**

```bash
git add web/libs/app-common/src/i18n/locales/
git commit -m "feat(i18n): add menubar resource bundles for en and zh-CN"
```

---

### Task 6: Build the i18next configuration module

**Files:**
- Create: `web/libs/app-common/src/i18n/config.ts`
- Test: `web/libs/app-common/src/i18n/config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `config.test.ts`:
```typescript
import { afterEach, beforeEach, expect, it } from "bun:test";
import { clearStoredLanguage } from "./persistence";
import { createI18nConfig, resolveInitialLanguage } from "./config";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

it("resolveInitialLanguage prefers explicit user selection over browser locale", () => {
  localStorage.setItem("label-studio.lang", "zh-CN");
  expect(resolveInitialLanguage(["en"])).toBe("zh-CN");
});

it("resolveInitialLanguage falls back to browser detection when no selection stored", () => {
  expect(resolveInitialLanguage(["zh-CN", "en"])).toBe("zh-CN");
  expect(resolveInitialLanguage(["en-US"])).toBe("en");
});

it("resolveInitialLanguage falls back to en when nothing matches", () => {
  expect(resolveInitialLanguage(["fr", "de"])).toBe("en");
});

it("createI18nConfig produces a config with en as fallback", () => {
  const config = createI18nConfig({ initialLanguage: "zh-CN" });
  expect(config.fallbackLng).toBe("en");
  expect(config.lng).toBe("zh-CN");
  expect(config.supportedLngs).toEqual(["en", "zh-CN"]);
  expect(config.resources.en.menubar).toBeDefined();
  expect(config.resources["zh-CN"].menubar).toBeDefined();
  expect(config.resources.en.menubar.home).toBe("Home");
  expect(config.resources["zh-CN"].menubar.home).toBe("首页");
  expect(config.ns).toEqual(["menubar"]);
  expect(config.defaultNS).toBe("menubar");
  expect(config.interpolation.escapeValue).toBe(false);
});

it("createI18nConfig defaults initialLanguage to en when omitted", () => {
  const config = createI18nConfig();
  expect(config.lng).toBe("en");
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test --dom libs/app-common/src/i18n/config.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `config.ts`:
```typescript
import i18next from "i18next";
import enMenubar from "./locales/en/menubar.json";
import zhCnMenubar from "./locales/zh-CN/menubar.json";
import { resolveBrowserLocale } from "./detection";
import { getStoredLanguage } from "./persistence";
import { APP_LOCALES, DEFAULT_LOCALE, FALLBACK_LOCALE, type SupportedLocale } from "./types";

export const MENUBAR_NAMESPACE = "menubar";
export const NAMESPACES = [MENUBAR_NAMESPACE] as const;

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
  const initialLanguage =
    options.initialLanguage ?? resolveInitialLanguage(options.browserLanguages ?? []);

  return {
    lng: initialLanguage,
    fallbackLng: FALLBACK_LOCALE,
    supportedLngs: [...APP_LOCALES],
    ns: [...NAMESPACES],
    defaultNS: MENUBAR_NAMESPACE,
    resources: {
      en: { [MENUBAR_NAMESPACE]: enMenubar },
      "zh-CN": { [MENUBAR_NAMESPACE]: zhCnMenubar },
    },
    interpolation: {
      // React already escapes; double-escaping breaks markup inside translations.
      escapeValue: false,
    },
    returnEmptyString: false,
    parseMissingKeyHandler: (key) => key,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test --dom libs/app-common/src/i18n/config.test.ts
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add web/libs/app-common/src/i18n/config.ts web/libs/app-common/src/i18n/config.test.ts
git commit -m "feat(i18n): add createI18nConfig factory with en fallback and zh-CN resources"
```

---

### Task 7: Add side-effectful `init()` module

**Files:**
- Create: `web/libs/app-common/src/i18n/init.ts`

This module is imported once at app boot from `main.tsx`. It exists as a separate file so the import order can be controlled precisely (must run before any `useTranslation` consumer mounts).

- [ ] **Step 1: Write the implementation**

Create `init.ts`:
```typescript
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
```

- [ ] **Step 2: Add a smoke test**

Create `init.test.ts`:
```typescript
import { expect, it } from "bun:test";
import { getI18n, initI18n } from "./init";

it("initI18n is idempotent and returns the shared i18next instance", () => {
  const a = initI18n();
  const b = initI18n();
  expect(a).toBe(b);
  expect(a.isInitialized).toBe(true);
});

it("getI18n auto-initializes if not yet initialized", () => {
  const instance = getI18n();
  expect(instance.isInitialized).toBe(true);
});

it("falls back to English key when translation is missing", () => {
  const instance = getI18n();
  // Switch to zh-CN then look up an unknown key
  instance.changeLanguage("zh-CN");
  expect(instance.t("does.not.exist")).toBe("does.not.exist");
  // Restore default
  instance.changeLanguage("en");
});

it("translates a known menubar key in both locales", () => {
  const instance = getI18n();
  instance.changeLanguage("en");
  expect(instance.t("menubar:home")).toBe("Home");
  instance.changeLanguage("zh-CN");
  expect(instance.t("menubar:home")).toBe("首页");
  instance.changeLanguage("en");
});
```

- [ ] **Step 3: Run tests**

```bash
bun test --dom libs/app-common/src/i18n/init.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 4: Commit**

```bash
git add web/libs/app-common/src/i18n/init.ts web/libs/app-common/src/i18n/init.test.ts
git commit -m "feat(i18n): add idempotent init() entrypoint for app boot"
```

---

## Chunk 2: React Integration — Provider and Hook

### Task 8: Add `I18nProvider` and `useLanguage` React bindings

**Files:**
- Create: `web/libs/app-common/src/i18n/I18nProvider.tsx`
- Create: `web/libs/app-common/src/i18n/useLanguage.ts`
- Test: `web/libs/app-common/src/i18n/useLanguage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `useLanguage.test.tsx`:
```typescript
import { expect, it, beforeEach, afterEach } from "bun:test";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider } from "./I18nProvider";
import { useLanguage } from "./useLanguage";

const Probe = () => {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="current">{language}</span>
      <span data-testid="home">{t("menubar:home")}</span>
      <button onClick={() => setLanguage("zh-CN")}>switch-zh</button>
      <button onClick={() => setLanguage("en")}>switch-en</button>
    </div>
  );
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

it("defaults to en when no preference is stored", () => {
  render(
    <I18nProvider browserLanguages={["en-US"]}>
      <Probe />
    </I18nProvider>,
  );
  expect(screen.getByTestId("current")).toHaveTextContent("en");
  expect(screen.getByTestId("home")).toHaveTextContent("Home");
});

it("switches to zh-CN and persists on button click", () => {
  render(
    <I18nProvider browserLanguages={["en"]}>
      <Probe />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByText("switch-zh"));
  expect(screen.getByTestId("current")).toHaveTextContent("zh-CN");
  expect(screen.getByTestId("home")).toHaveTextContent("首页");
  expect(localStorage.getItem("label-studio.lang")).toBe("zh-CN");
});

it("falls back to English when key is missing in zh-CN", () => {
  render(
    <I18nProvider browserLanguages={["zh-CN"]}>
      <Probe />
    </I18nProvider>,
  );
  // Probe renders "home" which exists in both; render a missing-key probe inline
  const MissingProbe = () => {
    const { t } = useLanguage();
    return <span data-testid="missing">{t("menubar:not.a.real.key")}</span>;
  };
  const { container } = render(
    <I18nProvider browserLanguages={["zh-CN"]}>
      <MissingProbe />
    </I18nProvider>,
  );
  // i18next returns the key itself when missing and returnEmptyString=false + parseMissingKeyHandler
  expect(container.querySelector('[data-testid="missing"]')).toHaveTextContent("menubar:not.a.real.key");
});

it("uses stored language on mount regardless of browser locale", () => {
  localStorage.setItem("label-studio.lang", "zh-CN");
  render(
    <I18nProvider browserLanguages={["en"]}>
      <Probe />
    </I18nProvider>,
  );
  expect(screen.getByTestId("current")).toHaveTextContent("zh-CN");
});

it("uses browser detection when nothing is stored", () => {
  render(
    <I18nProvider browserLanguages={["zh-TW", "en"]}>
      <Probe />
    </I18nProvider>,
  );
  expect(screen.getByTestId("current")).toHaveTextContent("zh-CN");
  expect(screen.getByTestId("home")).toHaveTextContent("首页");
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test --dom libs/app-common/src/i18n/useLanguage.test.tsx
```
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `I18nProvider.tsx`**

```tsx
import { useEffect, useMemo, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { getI18n } from "./init";
import { resolveInitialLanguage } from "./config";

export interface I18nProviderProps {
  children: ReactNode;
  /**
   * Override the browser language list. Defaults to `navigator.languages` at mount time.
   * Exposed primarily for tests.
   */
  browserLanguages?: readonly string[];
}

export function I18nProvider({ children, browserLanguages }: I18nProviderProps) {
  const instance = useMemo(() => getI18n(), []);

  useEffect(() => {
    const initial = resolveInitialLanguage(browserLanguages ?? navigator.languages ?? []);
    if (instance.language !== initial) {
      instance.changeLanguage(initial);
    }
  }, [instance, browserLanguages]);

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
```

- [ ] **Step 4: Write `useLanguage.ts`**

```typescript
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { setStoredLanguage, type SupportedLocale } from "./persistence";
import { isSupportedLocale } from "./types";

export interface UseLanguageResult {
  language: string;
  setLanguage: (locale: SupportedLocale) => void;
  t: ReturnType<typeof useTranslation>["t"];
}

export function useLanguage(): UseLanguageResult {
  const { t, i18n } = useTranslation();
  const setLanguage = useCallback(
    (locale: SupportedLocale) => {
      if (!isSupportedLocale(locale)) return;
      i18n.changeLanguage(locale);
      setStoredLanguage(locale);
    },
    [i18n],
  );

  return { language: i18n.language, setLanguage, t };
}
```

> **Note:** `setStoredLanguage` is exported from `persistence.ts`, which also exports its `SupportedLocale` type re-exported via `import type`. Update `persistence.ts` to re-export the type if not already (it imports it but doesn't re-export). Adjust the import in `useLanguage.ts` accordingly:
>
> ```typescript
> import { setStoredLanguage } from "./persistence";
> import { isSupportedLocale, type SupportedLocale } from "./types";
> ```

- [ ] **Step 5: Run tests to verify they pass**

```bash
bun test --dom libs/app-common/src/i18n/useLanguage.test.tsx
```
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add web/libs/app-common/src/i18n/I18nProvider.tsx \
        web/libs/app-common/src/i18n/useLanguage.ts \
        web/libs/app-common/src/i18n/useLanguage.test.tsx
git commit -m "feat(i18n): add I18nProvider and useLanguage React bindings"
```

---

### Task 9: Export i18n public API from `app-common`

**Files:**
- Modify: `web/libs/app-common/src/index.ts`

- [ ] **Step 1: Read current contents for context**

Current `web/libs/app-common/src/index.ts`:
```typescript
import * as pages from "./pages";

export { pages };

// Hooks
export { useStateHistory, type StateHistoryItem, type StateHistoryResponse } from "./hooks/useStateHistory";

// Components
export * from "./components/state-chips";
```

- [ ] **Step 2: Add i18n re-exports**

Append (do not replace):
```typescript

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
```

- [ ] **Step 3: Verify type-check passes**

```bash
bun --bun tsc --noEmit -p web/libs/app-common/tsconfig.json
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add web/libs/app-common/src/index.ts
git commit -m "feat(app-common): export i18n public API"
```

---

## Chunk 3: Wire Into the Application

### Task 10: Initialize i18n at app boot

**Files:**
- Modify: `web/apps/labelstudio/src/main.tsx`

- [ ] **Step 1: Re-read current `main.tsx`**

Current contents (8 lines):
```typescript
import { registerAnalytics } from "@humansignal/core";
registerAnalytics();

// Must import before ./app/App — ESM evaluates imports before module body, and App calls render() at top level.
import "@humansignal/app-common/pages/AccountSettings/hotkeys/bootstrapHotkeys";
import "./app/App";
import "./utils/service-worker";
import "./utils/state-registry-lso";
```

- [ ] **Step 2: Add the i18n init import before `./app/App`**

Insert one import. Order matters: i18n must initialize before any `useTranslation` consumer mounts (which happens inside `App`):

```typescript
import { registerAnalytics } from "@humansignal/core";
registerAnalytics();

// Must import before ./app/App — ESM evaluates imports before module body, and App calls render() at top level.
import "@humansignal/app-common/pages/AccountSettings/hotkeys/bootstrapHotkeys";
import "@humansignal/app-common/i18n/init";
import "./app/App";
import "./utils/service-worker";
import "./utils/state-registry-lso";
```

- [ ] **Step 3: Verify the build still compiles**

```bash
cd web && bun --bun run vite build --mode development
```

Expected: build succeeds without errors; `dist/apps/labelstudio/` contains `index.html` + JS.

- [ ] **Step 4: Commit**

```bash
git add web/apps/labelstudio/src/main.tsx
git commit -m "feat(app): initialize i18n before App mount"
```

---

### Task 11: Mount `I18nProvider` in `App.jsx`

**Files:**
- Modify: `web/apps/labelstudio/src/app/App.jsx`

- [ ] **Step 1: Re-read current `App.jsx`** (see baseline at `web/apps/labelstudio/src/app/App.jsx:59-88`).

`MultiProvider` already wraps all providers. Add `I18nProvider` **after** `JotaiProvider` (so future atom-based locale state could coexist) and **before** `AppStoreProvider` (so app store can read language if needed in future).

- [ ] **Step 2: Add the import**

Add to the import block at the top of `App.jsx`:
```javascript
import { I18nProvider } from "@humansignal/app-common";
```

- [ ] **Step 3: Insert the provider into `MultiProvider`**

Current (`App.jsx:64-77`):
```jsx
<MultiProvider
  providers={[
    <QueryClientProvider client={queryClient} key="query" />,
    <JotaiProvider key="jotai" store={JotaiStore} />,
    <AuthProvider key="auth" />,
    <AppStoreProvider key="app-store" />,
    <ToastProvider key="toast" />,
    <ApiProvider key="api" />,
    <ConfigProvider key="config" />,
    <RoutesProvider key="rotes" />,
    <ProjectProvider key="project" />,
    ff.isActive(ff.FF_PRODUCT_TOUR) && <TourProvider useAPI={useAPI} />,
  ].filter(Boolean)}
>
```

Change to:
```jsx
<MultiProvider
  providers={[
    <QueryClientProvider client={queryClient} key="query" />,
    <JotaiProvider key="jotai" store={JotaiStore} />,
    <I18nProvider key="i18n" />,
    <AuthProvider key="auth" />,
    <AppStoreProvider key="app-store" />,
    <ToastProvider key="toast" />,
    <ApiProvider key="api" />,
    <ConfigProvider key="config" />,
    <RoutesProvider key="rotes" />,
    <ProjectProvider key="project" />,
    ff.isActive(ff.FF_PRODUCT_TOUR) && <TourProvider useAPI={useAPI} />,
  ].filter(Boolean)}
>
```

- [ ] **Step 4: Smoke-test by running the dev server briefly**

```bash
cd web && timeout 20 bun run dev || true
```

Expected: server starts without crashing (look for `ready in` log). The `timeout` ensures we don't hang.

- [ ] **Step 5: Commit**

```bash
git add web/apps/labelstudio/src/app/App.jsx
git commit -m "feat(app): mount I18nProvider in MultiProvider"
```

---

## Chunk 4: Migrate the First Surface (`Menubar`)

### Task 12: Migrate hardcoded strings in `Menubar.jsx` to `useTranslation`

**Files:**
- Modify: `web/apps/labelstudio/src/components/Menubar/Menubar.jsx`

The hardcoded strings to migrate are listed below with their key mapping. Each is currently a literal string in JSX or attribute.

| Line | Current literal | New expression |
|---|---|---|
| `App.jsx:155` (Menubar) | `tooltip="Keyboard Shortcuts"` | `tooltip={t("menubar:keyboardShortcutsTooltip")}` |
| `App.jsx:184` | `label="Account &amp; Settings"` | `label={t("menubar:account")}` |
| `App.jsx:188` | `label="Log Out"` | `label={t("menubar:logOut")}` |
| `App.jsx:196` | `Please check new notification settings in the Account & Settings page` | `{t("menubar:newsletterNotice")}` |
| `App.jsx:224` | `label="Home"` | `label={t("menubar:home")}` |
| `App.jsx:225` | `label="Projects"` | `label={t("menubar:projects")}` |
| `App.jsx:226` | `label="Organization"` | `label={t("menubar:organization")}` |
| `App.jsx:233` | `label="API"` | `label={t("menubar:api")}` |
| `App.jsx:238` | `label="Docs"` | `label={t("menubar:docs")}` |
| `App.jsx:240` | `label="GitHub"` | `label={t("menubar:github")}` |
| `App.jsx:247` | `label="Slack Community"` | `label={t("menubar:slackCommunity")}` |
| `App.jsx:264` | `{sidebarPinned ? "Unpin menu" : "Pin menu"}` | `{sidebarPinned ? t("menubar:unpinMenu") : t("menubar:pinMenu")}` |
| `App.jsx:140` (logo) | `alt="Label Studio Logo"` | `alt={t("menubar:logoAlt")}` |

- [ ] **Step 1: Add the import and hook call**

At the top of `Menubar.jsx`, add to existing imports:
```javascript
import { useTranslation } from "react-i18next";
```

Inside the `Menubar` function body (`Menubar.jsx:55`), add as the first line after the existing hook calls:
```javascript
const { t } = useTranslation();
```

- [ ] **Step 2: Replace each hardcoded literal**

Apply each replacement from the table above. For the `Account &amp; Settings` case, the literal currently uses an HTML entity inside a string prop; after migration the translated string is a plain string with no entity needed (`"账户与设置"` / `"Account & Settings"`), so the `&amp;` should be removed.

- [ ] **Step 3: Verify no hardcoded user-visible strings remain**

```bash
rg '"(Home|Projects|Organization|API|Docs|GitHub|Slack Community|Log Out|Account .* Settings|Pin menu|Unpin menu|Keyboard Shortcuts|Label Studio Logo)"' \
   web/apps/labelstudio/src/components/Menubar/Menubar.jsx
```

Expected: no matches.

- [ ] **Step 4: Verify the dev server renders Menubar correctly**

```bash
cd web && timeout 25 bun run dev || true
```

In a separate terminal (or browser), load `http://localhost:8010/`. Verify the sidebar shows "Home", "Projects", "Organization" (English is the default — nothing visually changes yet).

- [ ] **Step 5: Commit**

```bash
git add web/apps/labelstudio/src/components/Menubar/Menubar.jsx
git commit -m "feat(menubar): migrate hardcoded strings to useTranslation"
```

---

### Task 13: Add a unit test for `Menubar` rendering in both locales

**Files:**
- Create: `web/apps/labelstudio/src/components/Menubar/Menubar.test.jsx`

This test asserts the migration is wired correctly: switching language re-renders the sidebar.

- [ ] **Step 1: Write the test**

```jsx
import { beforeEach, afterEach, expect, it } from "bun:test";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider } from "@humansignal/app-common";
import { useLanguage } from "@humansignal/app-common";
import { Menubar } from "./Menubar";

// Mock heavy providers not relevant to this test
mockModule("react-router-dom", () => ({
  ...requireActual("react-router-dom"),
  useHistory: () => ({ listen: () => () => {}, push: () => {}, replace: () => {} }),
  useLocation: () => ({ pathname: "/", search: "", hash: "", state: undefined }),
}));

mockModule("@humansignal/core/providers/AuthProvider", () => ({
  useAuth: () => ({ user: { email: "tester@example.com" }, isLoading: false }),
}));

const LanguageSwitch = ({ to }) => {
  const { setLanguage } = useLanguage();
  return <button onClick={() => setLanguage(to)}>switch-{to}</button>;
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

const renderMenubar = () =>
  render(
    <I18nProvider browserLanguages={["en"]}>
      <Menubar enabled={true} />
      <LanguageSwitch to="zh-CN" />
      <LanguageSwitch to="en" />
    </I18nProvider>,
  );

it("renders sidebar items in English by default", () => {
  renderMenubar();
  expect(screen.getByText("Home")).toBeInTheDocument();
  expect(screen.getByText("Projects")).toBeInTheDocument();
  expect(screen.getByText("Organization")).toBeInTheDocument();
});

it("re-renders in zh-CN after language switch", () => {
  renderMenubar();
  fireEvent.click(screen.getByText("switch-zh-CN"));
  expect(screen.getByText("首页")).toBeInTheDocument();
  expect(screen.getByText("项目")).toBeInTheDocument();
  expect(screen.getByText("组织")).toBeInTheDocument();
});
```

> **Note:** `Menubar` is a large component that pulls in many providers (ConfigProvider, RoutesProvider, etc.). If full rendering is too brittle, narrow the test to just the sidebar by extracting a `<MenubarSidebar>` subcomponent during the migration in Task 12. That refactor is optional — only do it if the test fails to mount.

- [ ] **Step 2: Run the test**

```bash
cd web && bun test --dom apps/labelstudio/src/components/Menubar/Menubar.test.jsx
```
Expected: PASS (2 tests).

- [ ] **Step 3: If test fails due to missing providers, mock them**

Refer to `web/libs/app-common/src/pages/AccountSettings/sections/PersonalInfo.test.tsx` for the project's established `mockModule` pattern. Mock additional providers as needed; do not disable the test.

- [ ] **Step 4: Commit**

```bash
git add web/apps/labelstudio/src/components/Menubar/Menubar.test.jsx
git commit -m "test(menubar): assert Menubar renders in en and zh-CN"
```

---

## Chunk 5: E2E Test and Contributor Docs

### Task 14: Add a Cypress e2e test for language persistence

**Files:**
- Create: `web/apps/labelstudio-e2e/src/e2e/i18n.cy.ts`

- [ ] **Step 1: Write the test**

```typescript
describe("i18n language selection", () => {
  const STORAGE_KEY = "label-studio.lang";

  beforeEach(() => {
    cy.window().then((win) => win.localStorage.removeItem(STORAGE_KEY));
    cy.visit("/");
  });

  it("persists explicit language selection across reload", () => {
    // sanity check default English
    cy.contains("Projects").should("exist");

    // Switch to zh-CN via localStorage (UI selector is intentionally out of scope for the foundation PR)
    cy.window().then((win) => {
      win.localStorage.setItem(STORAGE_KEY, "zh-CN");
    });
    cy.reload();

    cy.contains("项目").should("exist");
    cy.contains("组织").should("exist");

    // Switch back
    cy.window().then((win) => {
      win.localStorage.setItem(STORAGE_KEY, "en");
    });
    cy.reload();

    cy.contains("Projects").should("exist");
  });

  it("falls back to English when an unsupported language is stored", () => {
    cy.window().then((win) => {
      win.localStorage.setItem(STORAGE_KEY, "klingon");
    });
    cy.reload();

    cy.contains("Projects").should("exist");
    cy.contains("项目").should("not.exist");
  });
});
```

> **Why localStorage-driven and not UI-driven:** PRD §Out of Scope explicitly defers the visible language selector to a follow-up PR. Testing persistence via `localStorage` exercises the same code path (`resolveInitialLanguage` reads from `localStorage`) without coupling the test to a UI that does not yet exist.

- [ ] **Step 2: Start the dev server in one shell**

```bash
cd web && BUILD_NO_SERVER=true bun run dev &
DEV_PID=$!
# wait for server
sleep 8
```

- [ ] **Step 3: Run cypress headlessly against it**

```bash
cd web && bun --bun run cypress run --project apps/labelstudio-e2e --spec src/e2e/i18n.cy.ts
```

Expected: both tests PASS.

- [ ] **Step 4: Stop the dev server**

```bash
kill $DEV_PID
```

- [ ] **Step 5: Commit**

```bash
git add web/apps/labelstudio-e2e/src/e2e/i18n.cy.ts
git commit -m "test(e2e): verify language selection persists across reload"
```

---

### Task 15: Write contributor documentation

**Files:**
- Create: `web/libs/app-common/src/i18n/README.md`

- [ ] **Step 1: Write the README**

````markdown
# Frontend i18n

Label Studio's frontend is being migrated incrementally to support multiple languages. This README describes how to add or update translations.

## Supported Locales

| Code    | Language          |
|---------|-------------------|
| `en`    | English (default, canonical fallback) |
| `zh-CN` | Simplified Chinese |

## Architecture

```
libs/app-common/src/i18n/
├── config.ts           # i18next config factory
├── init.ts             # called once at app boot (see apps/labelstudio/src/main.tsx)
├── I18nProvider.tsx    # React provider mounted in App.jsx
├── useLanguage.ts      # hook: { language, setLanguage, t }
├── persistence.ts      # localStorage layer (key: `label-studio.lang`)
├── detection.ts        # browser-locale → supported-locale
├── types.ts            # SupportedLocale, APP_LOCALES, helpers
└── locales/
    ├── en/<namespace>.json
    └── zh-CN/<namespace>.json
```

## Translating a new surface

1. **Identify the namespace.** Each migrated surface (e.g. `menubar`, `account-settings`, `data-manager`) gets its own JSON file under `locales/<lang>/`. The filename is the namespace.

2. **Extract English strings.** In the component file:
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
   // ...and in createI18nConfig:
   resources: {
     en: { ..., foo: enFoo },
     "zh-CN": { ..., foo: zhCnFoo },
   }
   ```

6. **Write a unit test** asserting the component renders in `en` and `zh-CN` (see `useLanguage.test.tsx` for the pattern).

## Missing-key behavior

- If a key is missing in the active locale, i18next falls back to `en`.
- If the key is also missing in `en`, the **key string itself** is returned (`parseMissingKeyHandler` in `config.ts`). This makes missing keys obvious during development without breaking production.

## Language selection

- **First visit:** Browser language (`navigator.languages`) is resolved via `detection.ts`. Unmapped locales fall back to `en`.
- **Explicit choice:** Stored in `localStorage` under key `label-studio.lang`. The `useLanguage().setLanguage(locale)` hook updates both i18next and `localStorage`.
- **A visible UI selector is intentionally deferred** to a follow-up PR (see PRD Issue #9878).

## Adding a new locale

1. Add the code to `APP_LOCALES` in `types.ts`.
2. Create `locales/<new-locale>/` mirroring the English structure.
3. Add an entry to `resources` in `createI18nConfig`.
4. Add unit tests in `detection.test.ts` covering the new locale's browser variants.

## Out of scope for the foundation PR

- antd `ConfigProvider` locale (Phase 2)
- date-fns locale wiring (Phase 2)
- Django server-rendered templates
- Editor and Data Manager surfaces (separate PRs)
- Backend language preference on the User model
````

- [ ] **Step 2: Commit**

```bash
git add web/libs/app-common/src/i18n/README.md
git commit -m "docs(i18n): contributor guide for adding and editing translations"
```

---

### Task 16: Final verification

- [ ] **Step 1: Run the full unit test suite**

```bash
cd web && bun run test:unit:app-common
cd web && bun run test:unit:labelstudio
```

Expected: all tests pass, including the new i18n tests and existing tests.

- [ ] **Step 2: Run lint and format**

```bash
cd web && bun --bun run biome check --write .
```

Expected: no errors.

- [ ] **Step 3: Run TypeScript type-check**

```bash
cd web && bun --bun tsc --noEmit -p apps/labelstudio/tsconfig.app.json
```

Expected: no errors. If `tsc` is not configured for app-wide type-check, run `bun --bun tsc --noEmit -p libs/app-common/tsconfig.json` at minimum.

- [ ] **Step 4: Run the production build**

```bash
cd web && bun run build:app
```

Expected: build completes successfully. `dist/apps/labelstudio/` contains the hashed JS bundles.

- [ ] **Step 5: Manual smoke test**

Start the dev server, open the browser console, run:
```javascript
localStorage.setItem("label-studio.lang", "zh-CN");
location.reload();
```

Verify the sidebar shows `首页 / 项目 / 组织`. Then:
```javascript
localStorage.setItem("label-studio.lang", "en");
location.reload();
```

Verify it returns to `Home / Projects / Organization`.

- [ ] **Step 6: Final commit (if any fixups)**

If any of the above steps surfaced issues, fix them in a new commit referencing this plan. If everything passed clean, no commit needed.

---

## Risk Register

| Risk | Mitigation |
|---|---|
| `bunfig.toml` blocks packages < 7 days old | Task 1 Step 1 checks registry dates; falls back to `minimumReleaseAgeExcludes` |
| `Menubar` test fails to mount due to deep provider graph | Task 13 Step 3 — mock additional providers following `PersonalInfo.test.tsx` pattern, or extract `<MenubarSidebar>` |
| `main.tsx` import order breaks analytics or hotkeys | i18n init is pure side-effect with no React render; safe to insert between existing side-effectful imports |
| antd internal strings remain English after locale switch | Out of scope for Phase 1. Document in README §"Out of scope". Phase 2 will wire antd `ConfigProvider` |
| i18next bundle size (~50KB gzipped) | Vite `manualChunks` already groups vendor libs; i18next will land in `vendor` chunk automatically via the existing `vendorLibs` regex if we add `i18next` to it. Optional optimization in Task 1 Step 2.5. |

## Open Questions for Maintainers (deferred from PRD)

These remain open and **do not block** this foundation PR:

1. Where should the visible language selector live? (Account Settings, user menu, or both)
2. Should language preference eventually move from `localStorage` to the User model?
3. Which surface should migrate next after Menubar?

Answering these shapes follow-up PRs, not this one.

## Summary of Deliverables

- 7 new i18n files under `libs/app-common/src/i18n/`
- 2 resource bundles (`en/menubar.json`, `zh-CN/menubar.json`)
- 1 migrated surface (`Menubar.jsx`)
- 1 modified app entry (`main.tsx`)
- 1 modified app shell (`App.jsx`)
- 9 new test files (unit + e2e + smoke)
- 1 contributor README
- Zero backend changes
- Zero API contract changes
- Zero DB migrations
