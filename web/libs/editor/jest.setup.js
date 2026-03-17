/* istanbul ignore file */
require("jest-fetch-mock").enableMocks();
require("@testing-library/jest-dom");

// ResizeObserver is not in JSDOM; required by many layout components.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// IntersectionObserver is not in JSDOM; required by visibility/lazy-load logic.
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// matchMedia is not in JSDOM; required by responsive hooks and Konva.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Canvas 2D context is not fully implemented in JSDOM; required by Konva/canvas usage.
HTMLCanvasElement.prototype.getContext = jest.fn().mockImplementation((contextType) => {
  if (contextType === "2d") {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Array(4) })),
      putImageData: jest.fn(),
      createImageData: jest.fn(() => []),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      transform: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
    };
  }
  return null;
});

// Mock HTMLMediaElement data and methods not implemented by jsdom.
window.HTMLMediaElement.prototype._mock = {
  paused: true,
  duration: Number.NaN,
  _loaded: false,
  // Emulates the media file loading
  _load: function mediaInit(media) {
    media.dispatchEvent(new Event("loadedmetadata"));
    media.dispatchEvent(new Event("loadeddata"));
    media.dispatchEvent(new Event("canplaythrough"));
  },
  // Reset to the initial state
  _resetMock: function resetMock(media) {
    media._mock = Object.assign({}, window.HTMLMediaElement.prototype._mock);
  },
  _supportsTypes: ["video/mp4", "video/webm", "video/ogg", "audio/mp3", "audio/webm", "audio/ogg", "audio/wav"],
};

// Get "paused" value, it is automatically set to true / false when we play / pause the media.
Object.defineProperty(window.HTMLMediaElement.prototype, "paused", {
  get() {
    return this._mock.paused;
  },
  configurable: true,
});

// Get and set media duration
Object.defineProperty(window.HTMLMediaElement.prototype, "duration", {
  get() {
    return this._mock.duration;
  },
  set(value) {
    // Reset the mock state to initial (paused) when we set the duration.
    this._mock._resetMock(this);
    this._mock.duration = value;
  },
  configurable: true,
});

// Load the media file
window.HTMLMediaElement.prototype.load = function loadMock() {
  if (!this._mock._loaded) {
    // emulate the media file load and metadata initialization
    this._mock._load(this);
  }
  this.dispatchEvent(new Event("load"));
};

// Start the playback.
window.HTMLMediaElement.prototype.play = function playMock() {
  if (!this._mock._loaded) {
    // emulate the media file load and metadata initialization
    this._mock._load(this);
  }
  this._mock.paused = false;
  this.dispatchEvent(new Event("play"));
};

// Pause the playback
window.HTMLMediaElement.prototype.pause = function pauseMock() {
  this._mock.paused = true;
  this.dispatchEvent(new Event("pause"));
};

// Can play the media file
window.HTMLMediaElement.prototype.canPlayType = function canPlayTypeMock(type) {
  return this._mock._supportsTypes.includes(type) ? "maybe" : "";
};
