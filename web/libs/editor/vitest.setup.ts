/**
 * Vitest setup: Jest API compat + same env as jest.setup.js (ResizeObserver, matchMedia, canvas, HTMLMediaElement, fetch).
 */
import React from "react";
import * as matchers from "@testing-library/jest-dom/matchers";
import { expect, vi } from "vitest";
(globalThis as unknown as { jest: typeof vi }).jest = vi;
expect.extend(matchers);

// So components and deps that expect global React (e.g. classic JSX) work in tests
vi.stubGlobal("React", React);
if (typeof window !== "undefined") {
  (window as unknown as { React: typeof React }).React = React;
}

vi.stubGlobal("fetch", vi.fn());

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

globalThis.IntersectionObserver = class IntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    (this as unknown as { _callback: IntersectionObserverCallback })._callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

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

const canvas2dMock = {
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

HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextType: string) => {
  if (contextType === "2d" || (contextType && String(contextType).toLowerCase() === "2d")) {
    return canvas2dMock;
  }
  return null;
});

if (typeof HTMLCanvasElement.prototype.toDataURL === "undefined") {
  HTMLCanvasElement.prototype.toDataURL = function () {
    return "data:image/png;base64,stub";
  };
}

const mediaMock = {
  paused: true,
  duration: Number.NaN,
  _loaded: false,
  _load(media: HTMLMediaElement) {
    media.dispatchEvent(new Event("loadedmetadata"));
    media.dispatchEvent(new Event("loadeddata"));
    media.dispatchEvent(new Event("canplaythrough"));
  },
  _resetMock(media: HTMLMediaElement) {
    (media as unknown as { _mock: typeof mediaMock })._mock = { ...mediaMock };
  },
  _supportsTypes: ["video/mp4", "video/webm", "video/ogg", "audio/mp3", "audio/webm", "audio/ogg", "audio/wav"],
};

(window.HTMLMediaElement.prototype as unknown as { _mock: typeof mediaMock })._mock = mediaMock;

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
    (window.HTMLMediaElement.prototype as unknown as { _mock: { _resetMock: (m: HTMLMediaElement) => void } })._mock._resetMock(this);
    (this as unknown as { _mock: { duration: number } })._mock.duration = value;
  },
  configurable: true,
});

window.HTMLMediaElement.prototype.load = function loadMock(this: HTMLMediaElement) {
  const m = (this as unknown as { _mock: { _loaded: boolean; _load: (x: HTMLMediaElement) => void } })._mock;
  if (!m._loaded) m._load(this);
  this.dispatchEvent(new Event("load"));
};

window.HTMLMediaElement.prototype.play = function playMock(this: HTMLMediaElement) {
  const m = (this as unknown as { _mock: { _loaded: boolean; _load: (x: HTMLMediaElement) => void; paused: boolean } })._mock;
  if (!m._loaded) m._load(this);
  m.paused = false;
  this.dispatchEvent(new Event("play"));
};

window.HTMLMediaElement.prototype.pause = function pauseMock(this: HTMLMediaElement) {
  (this as unknown as { _mock: { paused: boolean } })._mock.paused = true;
  this.dispatchEvent(new Event("pause"));
};

window.HTMLMediaElement.prototype.canPlayType = function canPlayTypeMock(this: HTMLMediaElement, type: string) {
  return (window.HTMLMediaElement.prototype as unknown as { _mock: { _supportsTypes: string[] } })._mock._supportsTypes.includes(type) ? "maybe" : "";
};

// Global Konva mock — konva requires native `canvas` which isn't available in jsdom.
// This provides stub classes so that `LSTransformer extends Konva.Transformer` etc. work.
vi.mock("konva", () => {
  const noop = () => {};
  class KonvaNode {
    on = noop; off = noop; destroy = noop;
    getLayer() { return null; }
    getStage() { return null; }
    getParent() { return null; }
    remove = noop;
  }
  class Transformer extends KonvaNode {
    nodes() { return []; }
    forceUpdate = noop;
  }
  class Transform {
    m = [1, 0, 0, 1, 0, 0];
    copy() { return new Transform(); }
    point(p: any) { return p; }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
    invert() { return this; }
    getMatrix() { return this.m; }
    multiply() { return this; }
  }
  const konva = {
    Transformer,
    Transform,
    Node: KonvaNode,
    Group: class extends KonvaNode {},
    Layer: class extends KonvaNode {},
    Stage: class extends KonvaNode {},
    Rect: class extends KonvaNode {},
    Circle: class extends KonvaNode {},
    Line: class extends KonvaNode {},
    Image: class extends KonvaNode {},
    Text: class extends KonvaNode {},
    Shape: class extends KonvaNode {},
    Arrow: class extends KonvaNode {},
    Path: class extends KonvaNode {},
    Label: class extends KonvaNode {},
    Tag: class extends KonvaNode {},
    Ring: class extends KonvaNode {},
    getAngle: (a: number) => a,
    showWarnings: false,
  };
  return { default: konva, ...konva };
});
