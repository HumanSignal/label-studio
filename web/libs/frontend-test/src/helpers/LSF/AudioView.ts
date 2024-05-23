import TriggerOptions = Cypress.TriggerOptions;
import ObjectLike = Cypress.ObjectLike;
import ClickOptions = Cypress.ClickOptions;

type MouseInteractionOptions = Partial<TriggerOptions & ObjectLike & MouseEvent>;

export const AudioView = {
  get root() {
    return cy.get(".lsf-audio-tag");
  },
  get drawingArea() {
    return this.root.get("canvas");
  },
  get timelineControls() {
    return this.root.get(".lsf-timeline-controls");
  },
  get currentTimebox() {
    return cy.get('[data-testid="timebox-current-time"] > .lsf-time-box__input-time');
  },
  get endTimebox() {
    return cy.get('[data-testid="timebox-end-time"] > .lsf-time-box__input-time');
  },
  get configButton() {
    return this.timelineControls.get(".lsf-audio-config > .lsf-button");
  },
  get volumeButton() {
    return this.timelineControls.get(".lsf-audio-control > .lsf-button");
  },
  get loadingBar() {
    return this.root.get("loading-progress-bar", { timeout: 10000 });
  },
  isReady() {
    this.loadingBar.should("not.exist");
  },
  get playButton() {
    return cy.get(`[data-testid="playback-button:play"]`);
  },
  get pauseButton() {
    return cy.get(`[data-testid="playback-button:pause"]`);
  },
  seekCurrentTimebox(to: number) {
    let timeString = "";
    timeString = `0000${to}000`;

    this.currentTimebox.click({ force: true }).clear().type(timeString, { force: true }).blur();
  },
  pause() {
    this.pauseButton.click();
  },
  play(from?: number, to?: number) {
    if (from) {
      this.seekCurrentTimebox(from);
    }
    this.playButton.click();
    if (to) {
      cy.wait((to - (from || 0)) * 1000);
      this.pause();
    }
  },
  /**
   * Clicks at the coordinates on the drawing area
   * @param {number} x
   * @param {number} y
   */
  clickAt(x: number, y: number, options?: Partial<ClickOptions>) {
    cy.log(`Click at the AudioView at (${x}, ${y})`);
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
      .trigger("mousedown", x, y, {
        eventConstructor: "MouseEvent",
        buttons: 1,
        ...options,
      })
      .trigger("mousemove", x + width, y + height, {
        eventConstructor: "MouseEvent",
        buttons: 1,
        ...options,
      })
      .trigger("mouseup", x + width, y + height, {
        eventConstructor: "MouseEvent",
        buttons: 1,
        ...options,
      })
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
   * Matches the visual appearance of the entire AudioView component
   */
  toMatchImageSnapshot(el?: Cypress.Chainable<JQuery<HTMLElement>>, options?: { name?: string; threshold?: number }) {
    el = el || this.root;
    let name;
    if (options && options.name) {
      name = options.name;
      delete options.name;
    }
    if (name) {
      el.wait(0).matchImageSnapshot(name, options);
    } else {
      el.wait(0).matchImageSnapshot(options);
    }
  },
};
