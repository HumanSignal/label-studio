import TriggerOptions = Cypress.TriggerOptions;
import ObjectLike = Cypress.ObjectLike;
import ClickOptions = Cypress.ClickOptions;

type MouseInteractionOptions = Partial<TriggerOptions & ObjectLike & MouseEvent>;

export const ImageView = {
  get image() {
    cy.log("Get main image");
    return cy.get("img[alt=image]");
  },
  get root() {
    return this.image.closest(".lsf-object");
  },
  get drawingFrame() {
    return this.image.closest(".lsf-image");
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

    // Wait for any download progress indicator to disappear first
    cy.get("body").then(($body) => {
      if ($body.find(".lsf-image-progress").length > 0) {
        cy.get(".lsf-image-progress", { timeout: 30000 }).should("not.exist");
      }
    });

    // Wait for the FULL image loading pipeline:
    //   1. imageIsLoaded = true  → <EntireStage> renders (Konva Stage + canvas in DOM)
    //   2. stageRef exists       → Stage component has mounted
    //   3. Konva Image node      → <ImageLayer> reuses item.imageRef (the already-loaded
    //                               <img> element) and renders <KonvaImage> synchronously.
    //
    // We still poll for the Konva Image node to account for React's render cycle.
    cy.window().then((win) => {
      return new Cypress.Promise((resolve) => {
        const check = () => {
          const imageObject = (win as any).Htx?.annotationStore?.selected?.objects?.find(
            (o: any) => o.type === "image",
          );

          if (imageObject?.imageIsLoaded) {
            const stageRef = imageObject.stageRef;

            // stageRef.find('Image') returns Konva Image nodes rendered by <ImageLayer>.
            // If at least one exists, the image is fully painted on the canvas.
            if (stageRef && stageRef.find("Image").length > 0) {
              resolve();
              return;
            }
          }

          setTimeout(check, 16);
        };

        check();
      });
    });

    // Confirm the Konva canvas is rendered and visible
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
  dblClickAt(x, y) {
    this.drawingArea.scrollIntoView().dblclick(x, y);
  },
  dblClickAtRelative(x, y) {
    this.drawingFrame.then((el) => {
      const bbox: DOMRect = el[0].getBoundingClientRect();
      const realX = x * bbox.width;
      const realY = y * bbox.height;

      this.dblClickAt(realX, realY);
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
   * Draws a polygon on the drawing area.
   * @param {Array<[number, number]>} points
   * @param {boolean} autoclose
   * @param {MouseInteractionOptions} options
   */
  drawPolygon(points: [number, number][], autoclose, options: MouseInteractionOptions = {}) {
    const drawingArea = this.drawingArea.scrollIntoView();
    if (autoclose) {
      points = [...points, points[0]];
    }
    points.forEach((point, _index) => {
      drawingArea
        .trigger("mousemove", point[0], point[1], { eventConstructor: "MouseEvent", ...options })
        .trigger("mousedown", point[0], point[1], { eventConstructor: "MouseEvent", buttons: 1, ...options })
        .trigger("mouseup", point[0], point[1], { eventConstructor: "MouseEvent", buttons: 1, ...options });
    });
  },

  /**
   * Draws the polygon on the drawing area with coordinates relative to the drawing area.
   * @param {Array<[number, number]>} points
   * @param {boolean} autoclose
   * @param {MouseInteractionOptions} options
   */
  drawPolygonRelative(points: [number, number][], autoclose, options: MouseInteractionOptions = {}) {
    this.drawingFrame.then((el) => {
      const bbox: DOMRect = el[0].getBoundingClientRect();
      const realPoints = points.map(([x, y]) => [x * bbox.width, y * bbox.height]);

      this.drawPolygon(realPoints, autoclose, options);
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
   * @param threshold to compare image. It's a relation between original number of pixels vs changed number of pixels
   */
  canvasShouldChange(name: string, threshold = 0.1) {
    return this.drawingArea.compareScreenshot(name, "shouldChange", { threshold });
  },

  /**
   * Captures a new screenshot and compares it to already taken one
   * Fails if screenshots are different
   * @param name name of the screenshot
   * @param threshold to compare image. It's a relation between original number of pixels vs changed number of pixels
   */
  canvasShouldNotChange(name: string, threshold = 0.1) {
    return this.drawingArea.compareScreenshot(name, "shouldNotChange", { threshold });
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

  zoomInByButton() {
    this.toolBar.find('[aria-label="zoom-in"]').should("be.visible").click();
  },
  zoomOutByButton() {
    this.toolBar.find('[aria-label="zoom-out"]').should("be.visible").click();
  },

  selectRectangleToolByButton() {
    this.toolBar
      .find('[aria-label="rectangle-tool"]')
      .should("be.visible")
      .click()
      .should("have.class", "lsf-tool_active");
  },

  selectEllipseToolByButton() {
    this.toolBar
      .find('[aria-label="ellipse-tool"]')
      .should("be.visible")
      .click()
      .should("have.class", "lsf-tool_active");
  },

  selectPolygonToolByButton() {
    this.toolBar.find('[aria-label="polygon-tool"]').should("be.visible").click().should("have.class", "lsf-tool");
  },

  selectKeypointToolByButton() {
    this.toolBar
      .find('[aria-label="key-point-tool"]')
      .should("be.visible")
      .click()
      .should("have.class", "lsf-tool_active");
  },

  selectBrushToolByButton() {
    this.toolBar.find('[aria-label="brush-tool"]').should("be.visible").click().should("have.class", "lsf-tool_active");
  },

  selectBitmaskToolByButton() {
    this.toolBar
      .find('[aria-label="bitmask-tool"]')
      .should("be.visible")
      .click()
      .should("have.class", "lsf-tool_active");
  },

  selectEraserToolByButton() {
    this.toolBar.find('[aria-label="eraser"]').should("be.visible").click();
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
