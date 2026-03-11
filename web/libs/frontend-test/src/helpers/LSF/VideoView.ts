import TriggerOptions = Cypress.TriggerOptions;
import ObjectLike = Cypress.ObjectLike;
import ClickOptions = Cypress.ClickOptions;
import { SINGLE_FRAME_TIMEOUT } from "../../../../editor/tests/integration/e2e/utils/constants";
import { withMedia } from "@humansignal/frontend-test/helpers/utils/media/MediaMixin";
import type { ViewWithMedia } from "@humansignal/frontend-test/helpers/utils/media/types";

type MouseInteractionOptions = Partial<TriggerOptions & ObjectLike & MouseEvent>;

// The width of the frame item on the timeline
const FRAME_WIDTH = 16;
// The height of the area on the timeline reserved to interactions
const FRAME_RESERVED_HEIGHT = 24;

class VideoViewHelper extends withMedia(
  class implements ViewWithMedia {
    get _baseRootSelector() {
      return ".lsf-video-segmentation";
    }

    _rootSelector: string;

    constructor(rootSelector: string) {
      this._rootSelector = rootSelector.replace(/^&/, this._baseRootSelector);
    }
    get root() {
      cy.log("Get VideoView's root");
      return cy.get(this._rootSelector);
    }

    get mediaElement() {
      return this.root.get("video").should("exist");
    }

    get drawingArea() {
      cy.log("Get VideoView's drawing area");
      return this.root.get(".konvajs-content");
    }

    get videoCanvas() {
      return this.root.get(".lsf-video-canvas");
    }

    get framesControl() {
      return this.root.find(".lsf-frames-control");
    }

    get timelineContainer() {
      return this.root.get(".lsf-video-segmentation__timeline");
    }

    get timelineToolbar() {
      return this.root.get(".lsf-timeline__topbar");
    }

    get timeLine() {
      return this.timelineToolbar.find(".lsf-seeker");
    }
    get frameCounter() {
      return this.timelineToolbar.get(".lsf-frames-control");
    }

    get frameCounterInput() {
      return this.frameCounter.get("input[type='text']");
    }

    get timeLineLabels() {
      return this.root.get(".lsf-timeline-frames__labels-bg");
    }

    get timeframesArea() {
      return this.root.get(".lsf-timeline-frames__scroll");
    }

    get configButton() {
      return this.timelineToolbar.get('[aria-label="Video settings"]');
    }

    get configModal() {
      return this.timelineToolbar.get('[class*="modal--"]');
    }

    get loopTimelineRegionToggle() {
      return this.configModal.find('[class*="toggle--"]').find("label");
    }

    get loopTimelineRegionCheckbox() {
      return this.configModal.find('[class*="toggle--"] input[type="checkbox"]');
    }

    get playButton() {
      return this.timelineToolbar.find('[data-testid="playback-button:play"]');
    }

    get pauseButton() {
      return this.timelineToolbar.find('[data-testid="playback-button:pause"]');
    }

    clickAtTimeline(x: number, y: number, options?: Partial<ClickOptions>) {
      this.timeLine.scrollIntoView().click(x, y, options);
    }
    clickAtTimelineRelative(x: number, y = 0.5, options?: Partial<ClickOptions>) {
      this.timeLine.then((el) => {
        const bbox: DOMRect = el[0].getBoundingClientRect();
        const realX = x * bbox.width;
        const realY = y * bbox.height;

        this.clickAtTimeline(realX, realY, options);
      });
    }
    /**
     * Clicks at the coordinates on the drawing area
     * @param {number} x
     * @param {number} y
     */
    clickAt(x: number, y: number, options?: Partial<ClickOptions>) {
      cy.log(`Click at the image view at (${x}, ${y})`);
      this.drawingArea.scrollIntoView().click(x, y, options);
    }

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
    }

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
    }

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
    }

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
    }

    /**
     * Captures a screenshot of an element to compare later
     * @param {string} name name of the screenshot
     */
    captureCanvas(name: string) {
      return this.drawingArea.captureScreenshot(name, { withHidden: [".lsf-video-canvas"] });
    }

    /**
     * Captures a new screenshot and compares it to already taken one
     * Fails if screenshots are identical
     * @param name name of the screenshot
     * @param threshold to compare image. It's a relation between original number of pixels vs changed number of pixels
     */
    canvasShouldChange(name: string, threshold = 0.1) {
      return this.drawingArea.compareScreenshot(name, "shouldChange", { withHidden: [".lsf-video-canvas"], threshold });
    }

    /**
     * Captures a new screenshot and compares it to already taken one
     * Fails if screenshots are different
     * @param name name of the screenshot
     * @param threshold to compare image. It's a relation between original number of pixels vs changed number of pixels
     */
    canvasShouldNotChange(name: string, threshold = 0.1) {
      return this.drawingArea.compareScreenshot(name, "shouldNotChange", {
        withHidden: [".lsf-video-canvas"],
        threshold,
      });
    }

    /**
     * Captures a screenshot of the video canvas to compare later
     * @param {string} name name of the screenshot
     */
    captureVideoCanvas(name: string) {
      return this.videoCanvas.captureScreenshot(name, { withHidden: [".konvajs-content"] });
    }

    /**
     * Captures a new screenshot of the video canvas and compares it to already taken one
     * Fails if screenshots are identical
     * @param name name of the screenshot
     * @param threshold to compare image. It's a relation between original number of pixels vs changed number of pixels
     */
    videoCanvasShouldChange(name: string, threshold = 0.1) {
      return this.videoCanvas.compareScreenshot(name, "shouldChange", { withHidden: [".konvajs-content"], threshold });
    }

    /**
     * Captures a new screenshot of the video canvas and compares it to already taken one
     * Fails if screenshots are different
     * @param name name of the screenshot
     * @param threshold to compare image. It's a relation between original number of pixels vs changed number of pixels
     */
    videoCanvasShouldNotChange(name: string, threshold = 0.1) {
      return this.videoCanvas.compareScreenshot(name, "shouldNotChange", {
        withHidden: [".konvajs-content"],
        threshold,
      });
    }

    hasCurrentFrame(frameNumber: number) {
      this.framesControl.should("have.string", `${frameNumber.toString()} of `);
    }

    toggleConfigModal() {
      cy.log("Toggle video config modal");
      this.configButton.click();
      // Wait for modal animation
      cy.wait(100);
    }

    enableLoopTimelineRegion() {
      cy.log("Enable Loop Timeline Region");
      this.loopTimelineRegionCheckbox.then(($checkbox) => {
        if (!$checkbox.prop("checked")) {
          this.loopTimelineRegionToggle.click();
        }
      });
    }

    disableLoopTimelineRegion() {
      cy.log("Disable Loop Timeline Region");
      this.loopTimelineRegionCheckbox.then(($checkbox) => {
        if ($checkbox.prop("checked")) {
          this.loopTimelineRegionToggle.click();
        }
      });
    }

    setLoopTimelineRegion(enabled: boolean) {
      cy.log(`Set Loop Timeline Region to: ${enabled}`);
      if (enabled) {
        this.enableLoopTimelineRegion();
      } else {
        this.disableLoopTimelineRegion();
      }
    }

    // State verification
    isLoopTimelineRegionEnabled() {
      return this.loopTimelineRegionCheckbox.should("be.checked");
    }

    isLoopTimelineRegionDisabled() {
      return this.loopTimelineRegionCheckbox.should("not.be.checked");
    }

    // Playback controls
    play() {
      cy.log("Start video playback");
      this.playButton.click();
    }

    pause() {
      cy.log("Pause video playback");
      this.pauseButton.click();
    }

    // Wait for video to be at specific frame
    waitForFrame(frameNumber: number) {
      cy.log(`Wait for video to be at frame ${frameNumber}`);
      // Wait for frame counter to show the expected frame
      this.frameCounter.should("contain.text", `${frameNumber.toString()} of`);
    }

    // Get current frame number from timeline controls
    getCurrentFrame() {
      return this.frameCounter.invoke("text").then((text) => Number.parseInt(text.split(" ")[0]));
    }

    /**
     * Wait a couple of animation frames based on the requestAnimationFrame pattern
     */
    waitForStableState() {
      // This ensures React has completed its render cycle
      cy.waitForFrames(2);
    }

    // Wait for region by index to be passed to Konva Stage
    // Gets region ID from store and checks if it exists in Konva
    waitForRegionInKonvaByIndex(regionIndex: number) {
      cy.log(`Wait for region at index ${regionIndex} to be available in Konva Stage`);

      // First get the region ID from store
      cy.window().then((win) => {
        const store = (win as any).Htx || (win as any).store;
        if (!store?.annotationStore?.selected?.regionStore?.regions) {
          cy.log("No regions found in store");
          return;
        }

        const regions = store.annotationStore.selected.regionStore.regions;
        if (regionIndex >= regions.length) {
          cy.log(`Region index ${regionIndex} out of bounds (${regions.length} regions)`);
          return;
        }

        const region = regions[regionIndex];
        const regionId = region.id;

        cy.log(`Found region ID: ${regionId} for index ${regionIndex}`);

        // Now wait for this region in Konva
        this.waitForRegionInKonva(regionId);
      });
    }

    // Find specific Konva stage by DOM element and check for region
    waitForRegionInKonva(regionId: string) {
      cy.log(`Wait for region ${regionId} to be available in Konva Stage`);

      cy.window().then((win) => {
        this.drawingArea.should(($drawingArea) => {
          // Get the specific Konva stage from this DOM element
          const drawingArea = $drawingArea[0];
          const stage = (win as any).Konva?.stages?.find((stage) => stage.content === drawingArea);

          if (!stage) {
            throw new Error("Konva stage not found for this canvas");
          }

          // Find region in this specific stage
          const elements = stage.find(`#${regionId}`);
          if (!elements || elements.length === 0) {
            throw new Error(`Region ${regionId} not found in Konva Stage`);
          }
        });
      });
    }

    // Check that specific region is NOT in Konva Stage
    waitForRegionNotInKonva(regionId: string) {
      cy.log(`Wait for region ${regionId} to be NOT available in Konva Stage`);

      cy.window().then((win) => {
        this.drawingArea.should(($drawingArea) => {
          // Get the specific Konva stage from this DOM element
          const drawingArea = $drawingArea[0];
          const stage = (win as any).Konva?.stages?.find((stage) => stage.content === drawingArea);

          if (!stage) {
            // No stage means no regions - that's what we want
            return;
          }

          // Find region in this specific stage
          const elements = stage.find(`#${regionId}`);
          if (elements && elements.length > 0) {
            throw new Error(`Region ${regionId} should NOT be in Konva Stage but it was found`);
          }
        });
      });
    }

    // Check region by index is NOT in Konva Stage
    waitForRegionNotInKonvaByIndex(regionIndex: number) {
      cy.log(`Wait for region at index ${regionIndex} to be NOT available in Konva Stage`);

      // First get the region ID from store
      cy.window().then((win) => {
        const store = (win as any).Htx || (win as any).store;
        if (!store?.annotationStore?.selected?.regionStore?.regions) {
          cy.log("No regions found in store - that's expected");
          return;
        }

        const regions = store.annotationStore.selected.regionStore.regions;
        if (regionIndex >= regions.length) {
          cy.log(`Region index ${regionIndex} out of bounds (${regions.length} regions) - that's expected`);
          return;
        }

        const region = regions[regionIndex];
        const regionId = region.id;

        cy.log(`Checking that region ID: ${regionId} for index ${regionIndex} is NOT in Konva`);

        // Now check this region is NOT in Konva
        this.waitForRegionNotInKonva(regionId);
      });
    }

    setCurrentFrame(frameNumber: number) {
      cy.log(`Set current frame to ${frameNumber}`);
      this.frameCounter.click();
      // select all to replace the current frame number
      this.frameCounterInput.clear();
      this.frameCounterInput.type(`${frameNumber}{enter}`);
    }

    verifyPlayingRange(startPositionMax: number, endPosition: number, withoutStopping = false) {
      const checkFrame = (lastFrame, rewind = false, waitTimes = 10) => {
        VideoView.getCurrentFrame().then((frame) => {
          if (withoutStopping ? frame > endPosition : frame === endPosition) {
            // Sequence of frames is the same as expected
            return;
          }
          if (rewind) {
            // If rewinding, we expect to see frames going back
            expect(frame).to.be.lessThan(lastFrame);
          } else {
            if (frame === lastFrame && waitTimes--) {
              // If we hit the same frame, wait a bit and check again
              cy.wait(SINGLE_FRAME_TIMEOUT);
              checkFrame(lastFrame, rewind, waitTimes);
              return;
            }
            expect(frame).to.be.greaterThan(lastFrame);
          }
          cy.wait(SINGLE_FRAME_TIMEOUT);
          checkFrame(frame);
        });
      };
      checkFrame(startPositionMax, true);
    }
  },
) {}

const VideoView = new VideoViewHelper("&:eq(0)");
const useVideoView = (rootSelector: string) => {
  return new VideoViewHelper(rootSelector);
};

export { VideoView, useVideoView };
