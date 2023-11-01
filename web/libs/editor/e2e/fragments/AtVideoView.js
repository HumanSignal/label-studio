const { I } = inject();

const Helpers = require('../tests/helpers');

/**
 * @typedef BoundingClientRect
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

module.exports = {
  _rootSelector: '.lsf-video-segmentation',
  _videoRootSelector: '.lsf-video__main',
  _trackSelector: '.lsf-seeker__track',
  _indicatorSelector: '.lsf-seeker__indicator',
  _positionSelector: '.lsf-seeker__position',
  _seekStepForwardSelector: '.lsf-timeline-controls__main-controls > div:nth-child(2) > button:nth-child(4)',
  _seekStepBackwardSelector: '.lsf-timeline-controls__main-controls > div:nth-child(2) > button:nth-child(2)',
  _playButtonSelector: '.lsf-timeline-controls__main-controls > .lsf-timeline-controls__group:nth-child(2) > button:nth-child(2)',

  locateRootSelector() {
    return locate(this._rootSelector);
  },

  locateVideoContainer() {
    return locate(this._videoRootSelector);
  },

  videoLocate(locator) {
    return locator ? locate(locator).inside(this.locateVideoContainer()) : this.locateVideoContainer();
  },

  seekStepForwardSelector() {
    return locate(this._seekStepForwardSelector).inside(this.locateRootSelector());
  },

  seekStepBackwardSelector() {
    return locate(this._seekStepBackwardSelector).inside(this.locateRootSelector());
  },

  playButtonSelector() {
    return locate(this._playButtonSelector).inside(this.locateRootSelector());
  },

  getCurrentVideo() {
    return I.executeScript(Helpers.getCurrentMedia, 'video');
  },

  /**
   * Grab the bounding rect of the video track
   * @returns {Promise<BoundingClientRect>}
   */
  async grabTrackBoundingRect() {
    return I.grabElementBoundingRect(this._trackSelector);
  },

  /**
   * Grab the bounding rect of the video indicator (the slider that outlines the viewable region)
   * @returns {Promise<BoundingClientRect>}
   */
  async grabIndicatorBoundingRect() {
    return I.grabElementBoundingRect(this._indicatorSelector);
  },

  /**
   * Grab the bounding rect of the video position (the playhead/cursor element).
   * @returns {Promise<BoundingClientRect>}
   */
  async grabPositionBoundingRect() {
    return I.grabElementBoundingRect(this._positionSelector);
  },

  /**
   * Drag the element to the given position
   * @param {BoundingClientRect} bbox
   * @param {number} x
   * @param {number} [y=undefined]
   * @returns {Promise<void>}
   */
  async drag(bbox, x, y) {
    const from = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
    const to = { x, y: y || from.y };

    return I.dragAndDropMouse(from, to);
  },

  /**
   * Seek forward steps
   * @param {number} steps
   * @returns {Promise<void>}
   */
  async clickSeekStepForward(steps = 1) {
    for (let i = 0; i < steps; i++) {
      I.click(this.seekStepForwardSelector());
    }
  },

  /**
   * Seek backward steps
   * @param {number} steps
   * @returns {Promise<void>}
   */
  async clickSeekStepBackward(steps = 2) {
    for (let i = 0; i < steps; i++) {
      I.click(this.seekStepBackwardSelector());
    }
  },

  /**
   * Click the video controls play button.
   * @returns {Promise<void>}
   */
  async clickPlayButton() {
    I.click(this.playButtonSelector());
  },

  /**
   * Click the video controls pause button.
   * @returns {Promise<void>}
   */
  async clickPauseButton() {
    I.click(this.playButtonSelector());
  },
};
