require('jest-fetch-mock').enableMocks();

// Mock HTMLMediaElement data and methods not implemented by jsdom.
window.HTMLMediaElement.prototype._mock = {
  paused: true,
  duration: NaN,
  _loaded: false,
  // Emulates the media file loading
  _load: function mediaInit(media) {
    media.dispatchEvent(new Event('loadedmetadata'));
    media.dispatchEvent(new Event('loadeddata'));
    media.dispatchEvent(new Event('canplaythrough'));
  },
  // Reset to the initial state
  _resetMock: function resetMock(media) {
    media._mock = Object.assign(
      {},
      window.HTMLMediaElement.prototype._mock,
    );
  },
  _supportsTypes: [
    'video/mp4', 'video/webm', 'video/ogg',
    'audio/mp3', 'audio/webm', 'audio/ogg', 'audio/wav',
  ],
};

// Get "paused" value, it is automatically set to true / false when we play / pause the media.
Object.defineProperty(window.HTMLMediaElement.prototype, 'paused', {
  get() {
    return this._mock.paused;
  },
});

// Get and set media duration
Object.defineProperty(window.HTMLMediaElement.prototype, 'duration', {
  get() {
    return this._mock.duration;
  },
  set(value) {
    // Reset the mock state to initial (paused) when we set the duration.
    this._mock._resetMock(this);
    this._mock.duration = value;
  },
});

// Load the media file
window.HTMLMediaElement.prototype.load = function loadMock() {
  if (!this._mock._loaded) {
    // emulate the media file load and metadata initialization
    this._mock._load(this);
  }
  this.dispatchEvent(new Event('load'));
};

// Start the playback.
window.HTMLMediaElement.prototype.play = function playMock() {
  if (!this._mock._loaded) {
    // emulate the media file load and metadata initialization
    this._mock._load(this);
  }
  this._mock.paused = false;
  this.dispatchEvent(new Event('play'));
};

// Pause the playback
window.HTMLMediaElement.prototype.pause = function pauseMock() {
  this._mock.paused = true;
  this.dispatchEvent(new Event('pause'));
};

// Can play the media file
window.HTMLMediaElement.prototype.canPlayType = function canPlayTypeMock(type) {
  return this._mock._supportsTypes.includes(type) ? 'maybe' : '';
};
