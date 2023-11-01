const { I } = inject();
const assert = require('assert');

const Helpers = require('../tests/helpers');

module.exports = {
  _stageSelector: '#waveform-layer-main',
  _progressBarSelector: 'loading-progress-bar',
  _controlMenuSelector: '.lsf-audio-control',
  _settingsMenuSelector: '.lsf-audio-config',
  _volumeSliderSelector: '.lsf-audio-slider__range',
  _volumeInputSelector: '.lsf-audio-slider__input',
  _muteButtonSelector: '.lsf-audio-control__mute-button',
  _playbackSpeedSliderSelector: '.lsf-audio-config__modal > .lsf-audio-slider:nth-child(1) .lsf-audio-slider__range',
  _playbackSpeedInputSelector: '.lsf-audio-config__modal > .lsf-audio-slider:nth-child(1) .lsf-audio-slider__input',
  _amplitudeSliderSelector: '.lsf-audio-config__modal > .lsf-audio-slider:nth-child(2) .lsf-audio-slider__range',
  _amplitudeInputSelector: '.lsf-audio-config__modal > .lsf-audio-slider:nth-child(2) .lsf-audio-slider__input',
  _hideTimelineButtonSelector: '.lsf-audio-config__buttons > .lsf-audio-config__menu-button:nth-child(1)',
  _hideWaveformButtonSelector: '.lsf-audio-config__buttons > .lsf-audio-config__menu-button:nth-child(2)',
  _audioElementSelector: '[data-testid="waveform-audio"]',
  _seekBackwardButtonSelector: '.lsf-audio-tag .lsf-timeline-controls__main-controls > .lsf-timeline-controls__group:nth-child(2) > button:nth-child(1)',
  _playButtonSelector: '.lsf-audio-tag .lsf-timeline-controls__main-controls > .lsf-timeline-controls__group:nth-child(2) > button:nth-child(2)',
  _seekForwardButtonSelector: '.lsf-audio-tag .lsf-timeline-controls__main-controls > .lsf-timeline-controls__group:nth-child(2) > button:nth-child(3)',
  _errorSelector: '[data-testid="error:audio"]',
  _httpErrorSelector: '[data-testid="error:http"]',

  _stageBbox: { x: 0, y: 0, width: 0, height: 0 },

  async lookForStage() {
    I.scrollPageToTop();
    const bbox = await I.grabElementBoundingRect(this._stageSelector);

    this._stageBbox = bbox;
  },
  async waitForAudio() {
    await I.executeScript(Helpers.waitForAudio);
    I.waitForInvisible(this._progressBarSelector);
    I.waitForDetached('loading-progress-bar', 10);
  },
  getCurrentAudio() {
    return I.executeScript(Helpers.getCurrentMedia, 'audio');
  },
  /**
   * Mousedown - mousemove - mouseup drawing on the AudioView. Works in couple of lookForStage.
   * @example
   * await AtAudioView.lookForStage();
   * AtAudioView.dragAudioElement(50, 200);
   * @param x {number}
   * @param shiftX {number}
   */
  dragAudioElement(x, shiftX, shouldRelease = true) {
    I.scrollPageToTop();
    I.moveMouse(this._stageBbox.x + x, this._stageBbox.y + this._stageBbox.height / 2);
    I.pressMouseDown();
    I.moveMouse(this._stageBbox.x + x + shiftX, this._stageBbox.y + this._stageBbox.height / 2, 3);
    if (shouldRelease === false) return;
    I.pressMouseUp();
    I.wait(1);
  },

  /**
   * Click on the Audio waveform at the given x coordinate, and optional y coordinate.
   * @example
   * await AtAudioView.lookForStage();
   * AtAudioView.clickAt(50);
   * @param {number} x
   * @param {number} [y=undefined] - if not provided, will click at the center of the waveform
   */
  clickAt(x, y) {
    y = y !== undefined ? y : this._stageBbox.height / 2;
    I.scrollPageToTop();
    I.clickAt(this._stageBbox.x + x, this._stageBbox.y + y);
    I.wait(1); // We gotta  wait here because clicks on the canvas are not processed immediately
  },

  clickAtBeginning() {
    this.clickAt(0);
  },

  clickAtEnd() {
    // Clicking on the end of the canvas doesn't quite work, so we click a bit before the end
    // to make sure we're it is not clicking outside the canvas, and move the cursor over.
    this.clickAt(this._stageBbox.width - 1);
    this.dragAudioElement(this._stageBbox.width - 1, 1);
  },

  async createRegion(tagName, start, length) {
    const { x, y, height } = await this.getWrapperPosition(tagName);

    return I.dragAndDropMouse({
      x: x + start,
      y: y + height / 2,
    }, {
      x: x + start + length,
      y: y + height / 2,
    });
  },

  async getWrapperPosition(tagName) {
    const wrapperPosition = await I.executeScript((tagName) => {
      const _ws = Htx.annotationStore.selected.names.get(tagName)._ws;
      // `visualizer.wrapper` is for Audio v3
      const wrapper = _ws.visualizer?.wrapper ?? _ws.container;
      const bbox = wrapper.getBoundingClientRect();

      return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
      };
    }, tagName);

    return wrapperPosition;
  },

  async moveRegion(regionId, offset = 30) {
    const regionPosition = await I.executeScript((regionId) => {
      const region = Htx.annotationStore.selected.regions.find(r => r.cleanId === regionId);
      const element = region.getRegionElement();
      const rect = element.getBoundingClientRect();

      return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      };
    }, regionId);

    return I.dragAndDropMouse(regionPosition, {
      x: regionPosition.x + offset,
      y: regionPosition.y,
    });
  },

  async moveRegionV3(regionId, offset = 30) {
    const regionPosition = await I.executeScript(({ regionId, stageBbox }) => {
      const region = Htx.annotationStore.selected.regions.find(r => r.cleanId === regionId);

      const wsRegion = region._ws_region;

      if (!wsRegion.inViewport) {
        return null;
      }
      const { height } = wsRegion.visualizer;

      return {
        x: (wsRegion.xStart + wsRegion.xEnd) / 2 + stageBbox.x,
        y: height / 2 + stageBbox.y,
      };
    }, { regionId, stageBbox: this._stageBbox });

    if (!regionPosition) return;

    return I.dragAndDropMouse(regionPosition, {
      x: regionPosition.x + offset,
      y: regionPosition.y,
    });
  },

  /**
   * Toggle the audio control menu. This houses the volume slider and mute button.
   */
  toggleControlsMenu() {
    I.click(this._controlMenuSelector);
  },

  /**
   * Toggle the audio settings menu. This houses the playback speed slider, amplitude slider, and interface visibility toggles.
   */
  toggleSettingsMenu() {
    I.click(this._settingsMenuSelector);
  },

  /**
   * Zooms in the Audio Waveform by using the mouse wheel at the given relative position.
   * @param {number} deltaY
   * @param {Object} [atPoint] - Point where the wheel action will be called 
   * @param {number} [atPoint.x=0.5] - relative X coordinate
   * @param {number} [atPoint.y=0.5] - relative Y coordinate
   * @returns {Promise<void>}
   *
   * @example
   * // zoom in
   * await AtAudioView.zoomToPoint(-100, { x: .01 });
   * // zoom out
   * await AtAudioView.zoomToPoint(100);
   */
  async zoomToPoint(deltaY, atPoint = { x: 0.5, y: 0.5 }) {
    const { x = 0.5, y = 0.5 } = atPoint;

    I.scrollPageToTop();

    const stageBBox = await I.grabElementBoundingRect(this._stageSelector);

    I.clickAt(stageBBox.x + stageBBox.width * x, stageBBox.y + stageBBox.height * y); // click to focus the canvas

    I.pressKeyDown('Control');
    I.mouseWheel({ deltaY });
    I.pressKeyUp('Control');
  },

  /**
   * Asserts the current volume of the audio player the slider, input and the audio player.
   * @param {number} value - volume in the range [0, 100]
   * @returns {Promise<void>}
   *
   * @example
   * await AtAudioView.seeVolume(50);
   */
  async seeVolume(value) {
    this.toggleControlsMenu();
    I.seeInField(this._volumeInputSelector, value);
    I.seeInField(this._volumeSliderSelector, value);
    const volume = await I.grabAttributeFrom(this._audioElementSelector, 'volume');
    const muted = await I.grabAttributeFrom(this._audioElementSelector, 'muted');

    if (muted) {
      assert.equal(volume, null, 'Volume doesn\'t match in audio element');
    } else {
      assert.equal(volume, value / 100, 'Volume doesn\'t match in audio element');
    }
    this.toggleControlsMenu();
  },

  /**
   * Sets the volume of the audio player via the input.
   * @param {number} value - volume in the range [0, 100]
   *
   * @example
   * AtAudioView.setVolumeInput(50);
   */
  setVolumeInput(value) {
    this.toggleControlsMenu();
    I.clearField(this._volumeInputSelector);
    I.fillField(this._volumeInputSelector, value);
    this.toggleControlsMenu();
  },

  /**
   * Asserts the current playback speed of the audio player the slider, input and the audio player.
   * @param {number} value - speed in the range [0.5, 2.5]
   * @returns {Promise<void>}
   *
   * @example
   * await AtAudioView.seePlaybackSpeed(1.5);
   */
  async seePlaybackSpeed(value) {
    this.toggleSettingsMenu();

    I.seeInField(this._playbackSpeedInputSelector, value);
    I.seeInField(this._playbackSpeedSliderSelector, value);

    const playbackSpeed = await I.grabAttributeFrom(this._audioElementSelector, 'playbackRate');

    assert.equal(playbackSpeed, value, 'Playback speed doesn\'t match in audio element');

    this.toggleSettingsMenu();
  },

  /**
   * Sets the playback speed of the audio player via the input.
   * @param {number} value - speed in the range [0.5, 2.5]
   *
   * @example
   * AtAudioView.setPlaybackSpeedInput(1.5);
   */
  setPlaybackSpeedInput(value) {
    this.toggleSettingsMenu();
    // it was not easy to set this field, so we have to carefully remove value and put it
    I.doubleClick(locate(this._playbackSpeedInputSelector));
    I.pressKey('Backspace');
    I.fillField(this._playbackSpeedInputSelector, value);
    this.toggleSettingsMenu();
  },

  /**
   * Asserts the current amplitude of the audio player the slider, and the input.
   * @param {number} value - amplitude (y-axis zoom) in the range [1, 150]
   * @returns {Promise<void>}
   *
   * @example
   * await AtAudioView.seeAmplitude(10);
   */
  async seeAmplitude(value) {
    this.toggleSettingsMenu();

    I.seeInField(this._amplitudeInputSelector, value);
    I.seeInField(this._amplitudeSliderSelector, value);

    this.toggleSettingsMenu();
  },

  /**
   * Sets the amplitude of the audio player via the input.
   * @param {number} value - speed in the range [1, 150]
   *
   * @example
   * AtAudioView.setAmplitudeInput(10);
   */
  setAmplitudeInput(value) {
    this.toggleSettingsMenu();
    I.clearField(this._amplitudeInputSelector);
    I.fillField(this._amplitudeInputSelector, value);
    this.toggleSettingsMenu();
  },

  clickMuteButton() {
    this.toggleControlsMenu();
    I.click(this._muteButtonSelector);
    this.toggleControlsMenu();
  },

  clickPlayButton() {
    I.click(this._playButtonSelector);
  },

  clickPauseButton() {
    I.click(this._playButtonSelector);
  },

  async seeErrorHandler(value, selector = null) {
    selector = selector ? this[selector] : this._errorSelector;
    const error = await I.grabTextFrom(selector);
    const matcher = new RegExp(value);

    assert.match(error, matcher);
  },
  
  /**
   * Asserts whether the audio player is reporting as paused.
   * @returns {Promise<void>}
   */
  async seeIsPlaying(playing) {
    const isPaused = await I.grabAttributeFrom(this._audioElementSelector, 'paused');

    assert.equal(!isPaused, playing, playing ? 'Audio is not playing' : 'Audio is playing');
  },
};
