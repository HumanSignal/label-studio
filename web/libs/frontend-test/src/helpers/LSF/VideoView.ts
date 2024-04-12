import TriggerOptions = Cypress.TriggerOptions;
import ObjectLike = Cypress.ObjectLike;
import ClickOptions = Cypress.ClickOptions;

type MouseInteractionOptions = Partial<TriggerOptions & ObjectLike & MouseEvent>;

// The width of the frame item on the timeline
const FRAME_WIDTH = 16;
// The height of the area on the timeline reserved to interactions
const FRAME_RESERVED_HEIGHT = 24;

export const VideoView = {
  get root() {
    cy.log("Get VideoView's root");
    return cy.get(".lsf-video-segmentation");
  },
  get drawingArea() {
    cy.log("Get VideoView's drawing area");
    return this.root.get(".konvajs-content");
  },
  get timelineContainer() {
    return this.root.get(".lsf-video-segmentation__timeline");
  },
  get timelineToolbar() {
    return this.root.get(".lsf-timeline__topbar");
  },
  get timeLineLabels() {
    return this.root.get(".lsf-timeline-frames__labels-bg");
  },
  get timeframesArea() {
    return this.root.get(".lsf-timeline-frames__scroll");
  },
  /**
   * Clicks at the coordinates on the drawing area
   * @param {number} x
   * @param {number} y
   */
  clickAt(x: number, y: number, options?: Partial<ClickOptions>) {
    cy.log(`Click at the image view at (${x}, ${y})`);
    this.drawingArea.scrollIntoView().click(x, y, options);
  },
  /**
   * Clicks at the relative coordinates on the drawing area
   * @param {number} x
   * @param {number} y
   */
  clickAtRelative(x: number, y: number, options?: Partial<ClickOptions>) {
    this.drawingArea.then((el) => {
      const bbox: DOMRect = el[0].getBoundingClientRect();
      const realX = x * bbox.width;
      const realY = y * bbox.height;

      this.clickAt(realX, realY, options);
    });
  },
  /**
   * Draws a rectangle on the drawing area.
   * It also could be used for some drag and drop interactions for example selecting area or moving existing regions.
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   */
  drawRect(x: number, y: number, width: number, height: number, options: MouseInteractionOptions = {}) {
    cy.log(`Draw rectangle at (${x}, ${y}) of size ${width}x${height}`);
    this.drawingArea
      .scrollIntoView()
      .trigger("mousedown", x, y, { eventConstructor: "MouseEvent", buttons: 1, ...options })
      .trigger("mousemove", x + width, y + height, { eventConstructor: "MouseEvent", buttons: 1, ...options })
      .trigger("mouseup", x + width, y + height, { eventConstructor: "MouseEvent", buttons: 1, ...options })
      // We need this while the Video tag creates new regions in useEffect hook (it means not immediately)
      // This problem could be solved in VideoRegions component of lsf
      // Without this wait we get absence of a region on screenshots
      .wait(0);
  },
  /**
   * Draws the rectangle on the drawing area with coordinates and size relative to the drawing area.
   * It also could be used for some drag and drop interactions for example selecting area or moving existing regions.
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   */
  drawRectRelative(x: number, y: number, width: number, height: number, options: MouseInteractionOptions = {}) {
    this.drawingArea.then((el) => {
      const bbox: DOMRect = el[0].getBoundingClientRect();
      const realX = x * bbox.width;
      const realY = y * bbox.height;
      const realWidth = width * bbox.width;
      const realHeight = height * bbox.height;

      this.drawRect(realX, realY, realWidth, realHeight, options);
    });
  },
  /**
   * Click at visible frame on the timeline
   */
  clickAtFrame(idx, options?: Partial<ClickOptions>) {
    cy.log(`Click at ${idx} on the timeline`);

    this.timeLineLabels.then((el) => {
      const bbox: DOMRect = el[0].getBoundingClientRect();
      const pointX = bbox.width + (idx - 0.5) * FRAME_WIDTH;
      const pointY = FRAME_RESERVED_HEIGHT / 2;

      this.timeframesArea.scrollIntoView().trigger("mouseover", pointX, pointY).click(pointX, pointY, options);
    });
  },

  /**
   * Captures a screenshot of an element to compare later
   * @param {string} name name of the screenshot
   */
  captureCanvas(name: string) {
    return this.drawingArea.captureScreenshot(name, { withHidden: [".lsf-video-canvas"] });
  },

  /**
   * Captures a new screenshot and compares it to already taken one
   * Fails if screenshots are identical
   * @param name name of the screenshot
   * @param treshold to compare image. It's a relation between original number of pixels vs changed number of pixels
   */
  canvasShouldChange(name: string, treshold = 0.1) {
    return this.drawingArea.compareScreenshot(name, "shouldChange", { withHidden: [".lsf-video-canvas"], treshold });
  },

  /**
   * Captures a new screenshot and compares it to already taken one
   * Fails if screenshots are different
   * @param name name of the screenshot
   * @param treshold to compare image. It's a relation between original number of pixels vs changed number of pixels
   */
  canvasShouldNotChange(name: string, treshold = 0.1) {
    return this.drawingArea.compareScreenshot(name, "shouldNotChange", { withHidden: [".lsf-video-canvas"], treshold });
  },
};
