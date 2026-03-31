declare namespace Cypress {
  interface Thresholdable {
    threshold?: number;
  }
  interface CompareScreenshotOptions extends ScreenshotOptions {
    withHidden: string[];
  }
  interface Chainable {
    /**
     * Custom command to select DOM element by data-cy attribute.
     * @example cy.dataCy('greeting')
     */
    captureScreenshot(
      name: string,
      screenshotCaptureOptions?: Partial<Loggable & Timeoutable & CompareScreenshotOptions>,
    ): Chainable<JQuery<Element>>;
    compareScreenshot(
      name: string,
      assert: "shouldChange" | "shouldNotChange" | "diff",
      screenshotCompareOptions?: Partial<Loggable & Timeoutable & CompareScreenshotOptions & Thresholdable>,
    ): Chainable<JQuery<Element>>;
    /**
     * Waits for a specified number of frames before continuing execution.
     * Uses `requestAnimationFrame` to ensure synchronization with the browser's refresh rate,
     * providing the right timing regardless of system performance.
     *
     * @param {number} [frameCount=1] - The number of frames to wait for. Defaults to 1 if not specified.
     * @return {Chainable<void>} A chainable instance that progresses after the specified frames are waited.
     */
    waitForFrames(frameCount?: number): Chainable<void>;

    /**
     * Throttle CPU performance
     * @param rate - CPU throttling rate (1 = normal, 2 = 2x slower, 4 = 4x slower, etc.)
     */
    throttleCPU(rate: number): Chainable<void>;

    /**
     * Reset CPU to normal performance
     */
    resetCPU(): Chainable<void>;

    /**
     * Throttle network speed
     * @param downloadThroughput - Download speed in bytes per second
     * @param uploadThroughput - Upload speed in bytes per second
     * @param latency - Network latency in milliseconds (optional, default 0)
     */
    throttleNetwork(downloadThroughput: number, uploadThroughput: number, latency?: number): Chainable<void>;

    /**
     * Reset network to normal speed
     */
    resetNetwork(): Chainable<void>;

    /**
     * Set network to Slow 3G conditions
     */
    setSlow3GNetwork(): Chainable<void>;

    /**
     * Set network to Fast 3G conditions
     */
    setFast3GNetwork(): Chainable<void>;

    /**
     * Set network to 4G conditions
     */
    set4GNetwork(): Chainable<void>;
  }
}
