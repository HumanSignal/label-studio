/**
 * Reusable test setup for feature flags. Use in Bun (or Vitest) so tests use the real
 * feature-flag implementation (editor/datamanager utils/feature-flags) without mocking.
 *
 * In your vitest.setup.ts:
 *   import "@humansignal/frontend-test/feature-flag-test-setup";
 *
 * In tests that need specific flags on/off:
 *   import { withFeatureFlags, setFeatureFlag, clearFeatureFlag } from "@humansignal/frontend-test/feature-flag-test-setup";
 *   withFeatureFlags({ [FF_LSDV_4583]: true }, () => { ... });
 *   // or
 *   beforeEach(() => setFeatureFlag(FF_LSDV_4583, true));
 *   afterEach(() => clearFeatureFlag(FF_LSDV_4583));
 */

declare global {
  interface Window {
    APP_SETTINGS?: {
      feature_flags?: Record<string, boolean>;
      feature_flags_default_value?: boolean;
      [key: string]: unknown;
    };
  }
}

const FLAGS_KEY = "feature_flags";

/**
 * Ensures window.APP_SETTINGS.feature_flags exists so the real feature-flags module
 * (editor/datamanager utils/feature-flags) does not throw. Call once in test setup.
 */
export function ensureFeatureFlagsReady(): void {
  if (typeof window === "undefined") return;
  if (!window.APP_SETTINGS) {
    window.APP_SETTINGS = {};
  }
  if (typeof window.APP_SETTINGS[FLAGS_KEY] !== "object" || window.APP_SETTINGS[FLAGS_KEY] === null) {
    window.APP_SETTINGS[FLAGS_KEY] = {};
  }
}

/**
 * Set a single feature flag for the duration of the test (or until cleared).
 */
export function setFeatureFlag(id: string, value: boolean): void {
  ensureFeatureFlagsReady();
  (window.APP_SETTINGS!.feature_flags as Record<string, boolean>)[id] = value;
}

/**
 * Remove a feature flag so the real isFF() will fall back to default.
 */
export function clearFeatureFlag(id: string): void {
  if (window.APP_SETTINGS?.feature_flags && id in window.APP_SETTINGS.feature_flags) {
    delete window.APP_SETTINGS.feature_flags[id];
  }
}

/**
 * Run a function with the given flags set, then restore the previous state.
 * Use for tests that need specific flags on without affecting other tests.
 */
export function withFeatureFlags<T>(flags: Record<string, boolean>, fn: () => T): T {
  ensureFeatureFlagsReady();
  const prev: Record<string, boolean> = {};
  const target = window.APP_SETTINGS!.feature_flags as Record<string, boolean>;
  for (const id of Object.keys(flags)) {
    if (id in target) prev[id] = target[id];
    target[id] = flags[id];
  }
  try {
    return fn();
  } finally {
    for (const id of Object.keys(flags)) {
      if (id in prev) {
        target[id] = prev[id];
      } else {
        delete target[id];
      }
    }
  }
}

/**
 * Clear all feature flags. Useful in afterEach when tests set flags in beforeEach.
 */
export function resetFeatureFlags(): void {
  if (window.APP_SETTINGS?.feature_flags && typeof window.APP_SETTINGS.feature_flags === "object") {
    for (const k of Object.keys(window.APP_SETTINGS.feature_flags)) {
      delete (window.APP_SETTINGS.feature_flags as Record<string, boolean>)[k];
    }
  }
}

// Run once on load so any test file that imports this gets a ready window
if (typeof window !== "undefined") {
  ensureFeatureFlagsReady();
}
