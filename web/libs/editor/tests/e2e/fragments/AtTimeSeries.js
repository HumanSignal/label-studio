const { I } = inject();

module.exports = {
  _rootSelector: '.htx-timeseries',
  _channelSelector: '.htx-timeseries-channel .overlay',
  _overviewSelector: '.htx-timeseries-overview .overlay',
  _westHandleSelector: '.htx-timeseries-overview .handle--w',
  _eastHandleSelector: '.htx-timeseries-overview .handle--e',
  _stickSelector: '[text-anchor="start"]',

  get _channelStageSelector() {
    return `${this._rootSelector} .htx-timeseries-channel .new_brush`;
  },
  get _channelStickSelector() {
    return `${this._rootSelector} .htx-timeseries-channel [text-anchor="start"]`;
  },
  _stageBBox: { x: 0, y: 0, width: 0, height: 0 },

  WEST: 'west',
  EAST: 'east',

  async lookForStage() {
    I.scrollPageToTop();
    const bbox = await I.grabElementBoundingRect(this._channelStageSelector);

    this._stageBBox = bbox;
  },

  /**
   * Retrieves timestamp value from a text element of timeseries' stick (cursor).
   * **should be used inside async with `await`** operator.
   *
   * ```js
   * let timestamp = await I.grabStickTime();
   * ```
   * @returns timestamp value
   *
   * {{ react }}
   */
  grabStickTime() {
    // xPath cannot find `text` tag so we exchange it with `*`
    return I.grabTextFrom(locate(this._channelStickSelector).find('*').at(2));
  },

  /**
   * Select range on overview to zoom in
   * **should be used inside async with `await`** operator.
   * @param {number} from - relative position of start between 0 and 1
   * @param {number} to - relative position of finish between 0 and 1
   * @returns {Promise<void>}
   *
   * @example
   * await AtTimeSeries.selectOverviewRange(.25, .75);
   */
  async selectOverviewRange(from, to) {
    I.scrollPageToTop();
    const overviewBBox = await I.grabElementBoundingRect(this._overviewSelector);

    I.moveMouse(overviewBBox.x + overviewBBox.width * from, overviewBBox.y + overviewBBox.height / 2);
    I.pressMouseDown();
    I.moveMouse(overviewBBox.x + overviewBBox.width * to, overviewBBox.y + overviewBBox.height / 2, 3);
    I.pressMouseUp();
  },

  /**
   * Move range on overview to another position
   * @param {number} where - position between 0 and 1
   * @returns {Promise<void>}
   */
  async clickOverview(where) {
    I.scrollPageToTop();
    const overviewBBox = await I.grabElementBoundingRect(this._overviewSelector);

    I.clickAt(overviewBBox.x + overviewBBox.width * where, overviewBBox.y + overviewBBox.height / 2);
  },

  /**
   * Move overview handle by mouse drag
   * **should be used inside async with `await`** operator.
   * @param {number} where - position between 0 and 1
   * @param {"west"|"east"} [which="west"] - handler name
   * @returns {Promise<void>}
   *
   * @example
   * await AtTimeSeries.moveHandle(.5, AtTimeSeries.WEST);
   */
  async moveHandle(where, which = this.WEST) {
    I.scrollPageToTop();
    const handlerBBox = await I.grabElementBoundingRect(this[`_${which}HandleSelector`]);
    const overviewBBox = await I.grabElementBoundingRect(this._overviewSelector);

    I.moveMouse(handlerBBox.x + handlerBBox.width / 2, handlerBBox.y + handlerBBox.height / 2);
    I.pressMouseDown();
    I.moveMouse(overviewBBox.x + overviewBBox.width * where, overviewBBox.y + overviewBBox.height / 2, 3);
    I.pressMouseUp();
  },

  /**
   *  Zoom by mouse wheel over the channel
   *  **should be used inside async with `await`** operator.
   * @param {number} deltaY
   * @param {Object} [atPoint] - Point where will be called wheel action
   * @param {number} [atPoint.x=0.5] - relative X coordinate
   * @param {number} [atPoint.y=0.5] - relative Y coordinate
   * @returns {Promise<void>}
   *
   * @example
   * // zoom in
   * await AtTimeSeries.zoomByMouse(-100, { x: .01 });
   * // zoom out
   * await AtTimeSeries.zoomByMouse(100);
   */
  async zoomByMouse(deltaY, atPoint) {
    const { x = 0.5, y = 0.5 } = atPoint;

    I.scrollPageToTop();
    const channelBBox = await I.grabElementBoundingRect(this._channelSelector);

    I.moveMouse(channelBBox.x + channelBBox.width * x, channelBBox.y + channelBBox.height * y);
    I.pressKeyDown('Control');
    I.mouseWheel({ deltaY });
    I.pressKeyUp('Control');
  },

  /**
   * Move mouse over the channel
   * **should be used inside async with `await`** operator.
   * @param {Object} [atPoint] - Point where will be called wheel action
   * @param {number} [atPoint.x=0.5] - relative X coordinate
   * @param {number} [atPoint.y=0.5] - relative Y coordinate
   * @returns {Promise<void>}
   *
   * @example
   * await AtTimeSeries.moveMouseOverChannel({ x: .01 });
   */
  async moveMouseOverChannel(atPoint) {
    const { x = 0.5, y = 0.5 } = atPoint;

    I.scrollPageToTop();
    const channelBBox = await I.grabElementBoundingRect(this._channelSelector);

    I.moveMouse(channelBBox.x + channelBBox.width * x, channelBBox.y + channelBBox.height * y);
  },

  /**
   * Mousedown - mousemove - mouseup drawing a region on the first Channel. Works in conjunction with lookForStage.
   * @example
   * await AtTimeSeries.lookForStage();
   * AtTimeseries.drawByDrag(50, 200);
   * @param x
   * @param shiftX
   */
  drawByDrag(x,shiftX) {
    I.scrollPageToTop();
    I.moveMouse(this._stageBBox.x + x, this._stageBBox.y + this._stageBBox.height / 2);
    I.pressMouseDown();
    I.moveMouse(this._stageBBox.x + x + shiftX, this._stageBBox.y + this._stageBBox.height / 2, 3);
    I.pressMouseUp();
  },
};
