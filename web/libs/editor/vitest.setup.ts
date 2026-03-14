/* vitest setup: globals and mocks for editor unit tests */
import * as matchers from "@testing-library/jest-dom/matchers";
import { expect, vi } from "vitest";

expect.extend(matchers);

// Jest compat: existing tests use jest.fn(), jest.mock(), jest.spyOn(), jest.isolateModules()
const jestCompat = {
  ...vi,
  isolateModules(fn: () => void): void {
    fn();
  },
  resetModules(): void {
    if (typeof (vi as { resetModules?: () => void }).resetModules === "function") {
      (vi as { resetModules: () => void }).resetModules();
    }
  },
};
(globalThis as unknown as { jest: typeof jestCompat }).jest = jestCompat;

// Reusable feature-flag test setup: ensures window.APP_SETTINGS.feature_flags exists so real utils/feature-flags works without mocks.
import "@humansignal/frontend-test/feature-flag-test-setup";

// Vitest fetch mock (replaces jest-fetch-mock)
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ResizeObserver is not in JSDOM; required by many layout components.
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// IntersectionObserver is not in JSDOM; required by visibility/lazy-load logic.
globalThis.IntersectionObserver = class IntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    (this as unknown as { _callback: IntersectionObserverCallback })._callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// matchMedia is not in JSDOM; required by responsive hooks and Konva.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Canvas 2D context is not fully implemented in JSDOM; required by Konva/canvas usage.
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextType: string) => {
  if (contextType === "2d") {
    return {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Array(4) })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => []),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    };
  }
  return null;
});

// JSDOM does not implement toDataURL; required by canvas utils and some regions/tools.
if (typeof HTMLCanvasElement.prototype.toDataURL === "undefined") {
  HTMLCanvasElement.prototype.toDataURL = function () {
    return "data:image/png;base64,stub";
  };
}

// getComputedStyle is required by some components (e.g. HtxParagraphs); JSDOM has it but ensure it returns a usable shape.
if (typeof window.getComputedStyle === "undefined") {
  window.getComputedStyle = () => ({ getPropertyValue: () => "" });
}

// Mock HTMLMediaElement data and methods not implemented by jsdom.
(window.HTMLMediaElement.prototype as unknown as { _mock: Record<string, unknown> })._mock = {
  paused: true,
  duration: Number.NaN,
  _loaded: false,
  _load(media: HTMLMediaElement) {
    media.dispatchEvent(new Event("loadedmetadata"));
    media.dispatchEvent(new Event("loadeddata"));
    media.dispatchEvent(new Event("canplaythrough"));
  },
  _resetMock(media: HTMLMediaElement) {
    (media as unknown as { _mock: Record<string, unknown> })._mock = {
      ...(window.HTMLMediaElement.prototype as unknown as { _mock: Record<string, unknown> })._mock,
    };
  },
  _supportsTypes: [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "audio/mp3",
    "audio/webm",
    "audio/ogg",
    "audio/wav",
  ],
};

Object.defineProperty(window.HTMLMediaElement.prototype, "paused", {
  get(this: HTMLMediaElement) {
    return (this as unknown as { _mock: { paused: boolean } })._mock.paused;
  },
  configurable: true,
});

Object.defineProperty(window.HTMLMediaElement.prototype, "duration", {
  get(this: HTMLMediaElement) {
    return (this as unknown as { _mock: { duration: number } })._mock.duration;
  },
  set(this: HTMLMediaElement, value: number) {
    const proto = window.HTMLMediaElement.prototype as unknown as { _mock: { _resetMock: (m: HTMLMediaElement) => void; duration: number } };
    proto._mock._resetMock(this);
    (this as unknown as { _mock: { duration: number } })._mock.duration = value;
  },
  configurable: true,
});

window.HTMLMediaElement.prototype.load = function loadMock(this: HTMLMediaElement) {
  const mock = (this as unknown as { _mock: { _loaded: boolean; _load: (m: HTMLMediaElement) => void } })._mock;
  if (!mock._loaded) {
    mock._load(this);
  }
  this.dispatchEvent(new Event("load"));
};

window.HTMLMediaElement.prototype.play = function playMock(this: HTMLMediaElement) {
  const mock = (this as unknown as { _mock: { _loaded: boolean; _load: (m: HTMLMediaElement) => void; paused: boolean } })._mock;
  if (!mock._loaded) {
    mock._load(this);
  }
  mock.paused = false;
  this.dispatchEvent(new Event("play"));
};

window.HTMLMediaElement.prototype.pause = function pauseMock(this: HTMLMediaElement) {
  (this as unknown as { _mock: { paused: boolean } })._mock.paused = true;
  this.dispatchEvent(new Event("pause"));
};

window.HTMLMediaElement.prototype.canPlayType = function canPlayTypeMock(this: HTMLMediaElement, type: string) {
  const supported = (window.HTMLMediaElement.prototype as unknown as { _mock: { _supportsTypes: string[] } })._mock._supportsTypes;
  return supported.includes(type) ? "maybe" : "";
};
