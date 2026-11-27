/// <reference types="bun-types/test-globals" />

/**
 * Supplementary globals for the Bun test preload.
 *
 * bun-types/test-globals covers describe, it, expect, etc.
 * This file adds:
 *  - `mock` and `spyOn` (exposed as globals by preload.ts)
 *  - Timer helpers: useFakeTimers, useRealTimers, advanceTimersByTime, etc.
 *  - `mockFF` (feature-flag helper from preload.ts)
 *  - `APP_SETTINGS` window property
 *  - @testing-library/jest-dom matchers on expect()
 */

// ---------------------------------------------------------------------------
// Global `mock` and `spyOn` — preload exposes these from bun:test
// ---------------------------------------------------------------------------

declare var mock: typeof import("bun:test").mock;
declare var spyOn: typeof import("bun:test").spyOn;

// ---------------------------------------------------------------------------
// Timer globals — preload wraps bun:test jest.* timer APIs as bare globals
// ---------------------------------------------------------------------------

declare var useFakeTimers: (opts?: { now?: number | Date }) => unknown;
declare var useRealTimers: () => unknown;
declare var advanceTimersByTime: (ms: number) => unknown;
declare var runAllTimers: () => unknown;
declare var setSystemTime: (now?: number | Date) => void;

// ---------------------------------------------------------------------------
// Module mocking & mock lifecycle — preload wraps bun:test compat layer
// ---------------------------------------------------------------------------

declare var mockModule: (id: string, factory?: () => Record<string, unknown>) => void;
declare var requireActual: (specifier: string) => unknown;
declare var clearAllMocks: () => void;
declare var resetAllMocks: () => void;
declare var restoreAllMocks: () => void;
declare var resetModules: () => void;

// ---------------------------------------------------------------------------
// Global `mockFF` — feature-flag helper (preload.ts)
// ---------------------------------------------------------------------------

interface MockFFControls {
  setup(): void;
  set(kv: Record<string, boolean>): void;
  reset(): void;
}

declare var mockFF: () => MockFFControls;

// ---------------------------------------------------------------------------
// APP_SETTINGS on window (initialised in preload.ts)
// ---------------------------------------------------------------------------

interface AppSettings {
  hostname?: string;
  feature_flags?: Record<string, boolean>;
  user?: { id?: number; [key: string]: unknown };
  [key: string]: unknown;
}

interface Window {
  APP_SETTINGS: AppSettings;
}

declare var APP_SETTINGS: AppSettings;

// ---------------------------------------------------------------------------
// @testing-library/jest-dom matchers — extend Bun's expect()
// ---------------------------------------------------------------------------

declare module "bun:test" {
  interface Matchers<T> {
    toBeInTheDocument(): void;
    toBeVisible(): void;
    toBeEmptyDOMElement(): void;
    toBeDisabled(): void;
    toBeEnabled(): void;
    toBeInvalid(): void;
    toBeRequired(): void;
    toBeValid(): void;
    toContainElement(element: Element | null): void;
    toContainHTML(html: string): void;
    toHaveAccessibleDescription(description?: string | RegExp): void;
    toHaveAccessibleName(name?: string | RegExp): void;
    toHaveAttribute(attr: string, value?: string | RegExp): void;
    toHaveClass(...classNames: string[]): void;
    toHaveFocus(): void;
    toHaveFormValues(values: Record<string, unknown>): void;
    toHaveStyle(css: string | Record<string, unknown>): void;
    toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace?: boolean }): void;
    toHaveValue(value?: string | string[] | number | null): void;
    toHaveDisplayValue(value: string | RegExp | Array<string | RegExp>): void;
    toBeChecked(): void;
    toBePartiallyChecked(): void;
    toHaveErrorMessage(message?: string | RegExp): void;
    toHaveRole(role: string): void;
  }
}
