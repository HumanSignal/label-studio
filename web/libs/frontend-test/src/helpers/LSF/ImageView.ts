import TriggerOptions = Cypress.TriggerOptions;
import ObjectLike = Cypress.ObjectLike;
import ClickOptions = Cypress.ClickOptions;

type MouseInteractionOptions = Partial<TriggerOptions & ObjectLike & MouseEvent>;

export const ImageView = {
  get image() {
    cy.log("Get main image");
    return cy.get("img[alt=LS]");
  },
  get root() {
    return this.image.closest(".lsf-object");
  },
  get drawingFrame() {
    return this.image.closest('[class^="frame--"]');
  },
  get drawingArea() {
    cy.log("Get Konva.js root");
    return this.drawingFrame.siblings().get('[class^="image-element--"] .konvajs-content');
  },
  get toolBar() {
    cy.log("Get tool bar");
    return this.root.find(".lsf-toolbar");
  },
  get pagination() {
    return this.root.get('[class^="pagination--"]');
  },
  get paginationPrevBtn() {
    return this.pagination.get(".lsf-pagination__btn_arrow-left:not(.lsf-pagination__btn_arrow-left-double)");
  },
  get paginationNextBtn() {
    return this.pagination.get(".lsf-pagination__btn_arrow-right:not(.lsf-pagination__btn_arrow-right-double)");
  },
  waitForImage() {
    cy.log("Make sure that the image is visible and loaded");
    this.image.should("be.visible").and((img) => {
      return expect((img[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0);
    });

    this.drawingArea.get("canvas").should("be.visible");
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
    this.drawingFrame.then((el) => {
      const bbox: DOMRect = el[0].getBoundingClientRect();
      const realX = x * bbox.width;
      const realY = y * bbox.height;

      this.clickAt(realX, realY, options);
    });
  },
  clickAtStageRelative(x: number, y: number, options?: Partial<ClickOptions>) {
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
      .trigger("mouseup", x + width, y + height, { eventConstructor: "MouseEvent", buttons: 1, ...options });
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
    this.drawingFrame.then((el) => {
      const bbox: DOMRect = el[0].getBoundingClientRect();
      const realX = x * bbox.width;
      const realY = y * bbox.height;
      const realWidth = width * bbox.width;
      const realHeight = height * bbox.height;

      this.drawRect(realX, realY, realWidth, realHeight, options);
    });
  },
  /**
   * Captures a screenshot of an element to compare later
   * @param {string} name name of the screenshot
   */
  capture(name: string) {
    return this.drawingArea.captureScreenshot(name);
  },

  /**
   * Captures a new screenshot and compares it to already taken one
   * Fails if screenshots are identical
   * @param name name of the screenshot
   * @param treshold to compare image. It's a relation between original number of pixels vs changed number of pixels
   */
  canvasShouldChange(name: string, treshold = 0.1) {
    return this.drawingArea.compareScreenshot(name, "shouldChange", { treshold });
  },

  /**
   * Captures a new screenshot and compares it to already taken one
   * Fails if screenshots are different
   * @param name name of the screenshot
   * @param treshold to compare image. It's a relation between original number of pixels vs changed number of pixels
   */
  canvasShouldNotChange(name: string, treshold = 0.1) {
    return this.drawingArea.compareScreenshot(name, "shouldNotChange", { treshold });
  },
  selectRect3PointToolByHotkey() {
    cy.get("body").type("{shift}{R}");
  },
  zoomInWithHotkey() {
    cy.get("body").type("{ctrl}{+}");
  },
  zoomOutWithHotkey() {
    cy.get("body").type("{ctrl}{-}");
  },

  selectRectangleToolByButton() {
    this.toolBar
      .find('[aria-label="rectangle-tool"]')
      .should("be.visible")
      .click()
      .should("have.class", "lsf-tool_active");
  },

  selectMoveToolByButton() {
    this.toolBar.find('[aria-label="move-tool"]').should("be.visible").click().should("have.class", "lsf-tool_active");
  },

  rotateLeft() {
    this.toolBar.find('[aria-label="rotate-left"]').should("be.visible").click();
  },

  rotateRight() {
    this.toolBar.find('[aria-label="rotate-right"]').should("be.visible").click();
  },
};
