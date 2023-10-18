const { I } = inject();

const assert = require('assert');
const Helpers = require('../tests/helpers');

module.exports = {
  _stageSelector: '.konvajs-content',
  _stageBBox: null,

  _toolBarSelector: '.lsf-toolbar',
  _zoomPresetsSelector: '[title^="Zoom presets"]',

  _rootSelector: '[class^="lsf-object wrapperComponent--"]',
  _paginationSelector: '[class^="pagination--"]',
  _paginationPrevBtnSelector: '.lsf-pagination__btn_arrow-left:not(.lsf-pagination__btn_arrow-left-double)',
  _paginationNextBtnSelector: '.lsf-pagination__btn_arrow-right:not(.lsf-pagination__btn_arrow-right-double)',


  locateRoot() {
    return locate(this._rootSelector);
  },

  locate(locator) {
    const rootLocator = this.locateRoot();

    return locator ? rootLocator.find(locator) : rootLocator;
  },

  locatePagination(locator) {
    const paginationLocator = this.locate(this._paginationSelector);

    return locator ? paginationLocator.find(locator) : paginationLocator;
  },

  percToX(xPerc) {
    return this._stageBBox.width * xPerc / 100;
  },

  percToY(yPerc) {
    return this._stageBBox.height * yPerc / 100;
  },

  async grabStageBBox() {
    const bbox = await I.grabElementBoundingRect(this._stageSelector);

    return bbox;
  },

  async lookForStage() {
    await I.scrollPageToTop();

    this._stageBBox = await this.grabStageBBox();
  },

  stageBBox() {
    if (!this._stageBBox) console.log('Stage bbox wasn\'t grabbed');
    return this._stageBBox ?? {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  },

  stageX() {
    if (!this._stageBBox) console.log('Stage bbox wasn\'t grabbed');
    return this._stageBBox?.x ?? 0;
  },

  stageY() {
    if (!this._stageBBox) console.log('Stage bbox wasn\'t grabbed');
    return this._stageBBox?.y ?? 0;
  },

  async waitForImage() {
    I.say('Waiting for image to be loaded');
    await I.executeScript(Helpers.waitForImage);
    I.waitForVisible('canvas', 5);
  },

  async getCanvasSize() {
    const sizes = await I.executeScript(Helpers.getCanvasSize);

    return sizes;
  },

  async getImageSize() {
    const sizes = await I.executeScript(Helpers.getImageSize);

    return sizes;
  },

  async getImageFrameSize() {
    const sizes = await I.executeScript(Helpers.getImageFrameSize);

    return sizes;
  },

  setZoom(scale, x, y) {
    I.executeScript(Helpers.setZoom, [scale, x, y]);
  },

  /**
   * Click once on the main Stage
   * @param {number} x
   * @param {number} y
   */
  clickKonva(x, y) {
    I.executeScript(Helpers.clickKonva, [x, y]);
  },
  /**
   * Click multiple times on the main Stage
   * @param {number[][]} points
   */
  clickPointsKonva(points) {
    I.executeScript(Helpers.clickMultipleKonva, points);
  },
  /**
   * Click multiple times on the main Stage then close Polygon
   * @param {number[][]} points
   * @deprecated Use drawByClickingPoints instead
   */
  clickPolygonPointsKonva(points) {
    I.executeScript(Helpers.polygonKonva, points);
  },
  /**
   * Dragging between two points
   * @param {number} x
   * @param {number} y
   * @param {number} shiftX
   * @param {number} shiftY
   * @deprecated Use drawByDrag instead
   */
  dragKonva(x, y, shiftX, shiftY) {
    I.executeScript(Helpers.dragKonva, [x, y, shiftX, shiftY]);
  },

  /**
   * Get pixel color at point
   * @param {number} x
   * @param {number} y
   * @param {number[]} rgbArray
   * @param {number} tolerance
   */
  async hasPixelColor(x, y, rgbArray, tolerance = 3) {
    const colorPixels = await I.executeScript(Helpers.getKonvaPixelColorFromPoint, [x, y]);
    const hasPixel = Helpers.areEqualRGB(rgbArray, colorPixels, tolerance);

    return hasPixel;
  },

  // Only for debugging
  async whereIsPixel(rgbArray, tolerance = 3) {
    const points = await I.executeScript(Helpers.whereIsPixel, [rgbArray, tolerance]);

    return points;
  },

  async countKonvaShapes() {
    const count = await I.executeScript(Helpers.countKonvaShapes);

    return count;
  },

  async isTransformerExist() {
    const isTransformerExist = await I.executeScript(Helpers.isTransformerExist);

    return isTransformerExist;
  },

  async isRotaterExist() {
    const isRotaterExist = await I.executeScript(Helpers.isRotaterExist);

    return isRotaterExist;
  },

  /**
   * Returns the bounding box of the first found shape
   * The coordinates are relative to the window
   * @returns {Promise<{x: number, y: number, width: number, height: number}>}
   */
  async getRegionAbsoultePosition(regionId, includeStage = true) {
    const [shapeId, coords] = await I.executeScript((regionId) => {
      const annotation = Htx.annotationStore.selected;
      const region = annotation.regions.find((r) => r.cleanId === regionId);

      console.log(region);

      return [region.shapeRef._id, region.bboxCoords];
    }, regionId);

    const position = coords ? {
      x: coords.left + ((coords.right - coords.left) / 2),
      y: coords.top + ((coords.bottom - coords.top) / 2),
      width: coords.right - coords.left,
      height: coords.bottom - coords.top,
    } : await I.executeScript(Helpers.getRegionAbsoultePosition, shapeId);

    return includeStage ? {
      ...position,
      x: position.x + this.stageX(),
      y: position.y + this.stageY(),
    } : position;
  },

  /**
   * Mousedown - mousemove - mouseup drawing on the ImageView. Works in couple of lookForStage.
   * @example
   * await  AtImageView.lookForStage();
   * AtImageView.drawByDrag(50, 30, 200, 200);
   * @param x
   * @param y
   * @param shiftX
   * @param shiftY
   */
  drawByDrag(x, y, shiftX, shiftY) {
    I.scrollPageToTop();
    I.moveMouse(this.stageBBox().x + x, this.stageBBox().y + y);
    I.pressMouseDown();
    I.moveMouse(this.stageBBox().x + x + shiftX, this.stageBBox().y + y + shiftY, 3);
    I.pressMouseUp();
  },
  /**
   * Click through the list of points on the ImageView. Works in couple of lookForStage.
   * @example
   * await  AtImageView.loolookkForStage();
   * AtImageView.drawByClickingPoints([[50,50],[100,50],[100,100],[50,100],[50,50]]);
   * @param {number[][]} points
   */
  drawByClickingPoints(points) {
    const lastPoint = points[points.length - 1];
    const prevPoints = points.slice(0, points.length - 1);

    I.scrollPageToTop();

    if (prevPoints.length) {
      for (const point of prevPoints) {
        I.clickAt(this.stageBBox().x + point[0], this.stageBBox().y + point[1]);
      }
      I.wait(0.5); // wait before last click to fix polygons creation
    }

    I.clickAt(this.stageBBox().x + lastPoint[0], this.stageBBox().y + lastPoint[1]);
  },
  /**
   * Mousedown - mousemove - mouseup drawing through the list of points on the ImageView. Works in couple of lookForStage.
   * @example
   * await  AtImageView.lookForStage();
   * AtImageView.drawThroughPoints([[50,50],[200,100],[50,200],[300,300]]);
   * @param {number[][]} points - list of pairs of coords
   * @param {"steps"|"rate"} mode - mode of firing mousemove event
   * @param {number} parameter - parameter for mode
   */
  drawThroughPoints(points, mode = 'steps', parameter = 1) {
    I.scrollPageToTop();
    const calcSteps = {
      steps: () => parameter,
      rate: (p1, p2) => Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2)) / parameter,
    }[mode];
    const startPoint = points[0];

    I.moveMouse(this.stageBBox().x + startPoint[0], this.stageBBox().y + startPoint[1]);
    I.pressMouseDown();
    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const curPoint = points[i];

      I.moveMouse(this.stageBBox().x + curPoint[0], this.stageBBox().y + curPoint[1], calcSteps(prevPoint, curPoint));
    }
    I.pressMouseUp();
  },
  clickAt(x, y) {
    I.scrollPageToTop();
    I.clickAt(this.stageBBox().x + x, this.stageBBox().y + y);
    I.wait(1); // We gotta  wait here because clicks on the canvas are not processed immediately
  },
  dblClickAt(x, y) {
    I.scrollPageToTop();
    I.dblClickAt(this.stageBBox().x + x, this.stageBBox().y + y);
  },
  drawByClick(x, y) {
    I.scrollPageToTop();
    this.clickAt(x, y);
  },
  async clickOnRegion(regionIndex) {
    const regionId = await I.executeScript((regionIndex) => {
      const regions = Htx.annotationStore.selected.regions;

      return regions[regionIndex]?.cleanId ?? undefined;
    }, regionIndex);

    assert.notEqual(regionId, undefined, 'Region not found');

    const position = await this.getRegionAbsoultePosition(regionId, false);

    I.say('Clicking on a region at', position.x + ' ' + position.y);

    this.clickAt(position.x, position.y);
  },

  async dragRegion(regions, findIndex, shiftX = 50, shiftY = 50) {
    const region = regions.find(findIndex);

    assert.notEqual(region, undefined, 'Region not found');

    const position = await this.getRegionAbsoultePosition(region.id);

    I.say('Drag region by ' + shiftX + ' ' + shiftY);
    await I.dragAndDropMouse(position, {
      x: position.x + shiftX,
      y: position.y + shiftY,
    });
  },

  selectPanTool() {
    I.say('Select pan tool');
    I.pressKey('H');
  },

  selectMoveTool() {
    I.say('Select move tool');
    I.pressKey('V');
  },

  async multiImageGoForwardWithHotkey() {
    I.say('Attempting to go to the next image');
    I.pressKey('Ctrl+d');

    await this.waitForImage();
  },

  async multiImageGoBackwardWithHotkey() {
    I.say('Attempting to go to the next image');
    I.pressKey('Ctrl+a');

    await this.waitForImage();
  },

  async multiImageGoForward() {
    I.click(this.locatePagination(this._paginationNextBtnSelector));

    await this.waitForImage();
  },

  async multiImageGoBackward() {
    I.click(this.locatePagination(this._paginationPrevBtnSelector));

    await this.waitForImage();
  },
};
