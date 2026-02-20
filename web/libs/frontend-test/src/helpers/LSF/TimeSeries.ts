import { SVGTransformUtils } from "../utils/SVGTransformUtils";
import { SVGPathUtils } from "../utils/SVGPathUtils";
import { type BoundingBox, BoundingBoxUtils } from "../utils/BoundingBoxUtils";
import { TWO_FRAMES_TIMEOUT } from "libs/editor/tests/integration/e2e/utils/constants";

class TimeSeriesHelper {
  private get _baseRootSelector() {
    return ".htx-timeseries";
  }

  private _rootSelector: string;

  constructor(rootSelector) {
    this._rootSelector = rootSelector.replace(/^&/, this._baseRootSelector);
  }

  get root() {
    return cy.get(this._rootSelector);
  }

  get channelContainer() {
    return this.root.find(".htx-timeseries-channel");
  }

  get multiChannelContainer() {
    return this.root.find(".htx-timeseries-multichannel");
  }

  get overview() {
    return this.root.find(".htx-timeseries-overview");
  }

  get overviewOverlay() {
    return this.overview.find(".overlay");
  }

  get channelOverlay() {
    return this.channelContainer.find(".overlay");
  }

  get channelSvg() {
    return this.channelContainer.find("svg");
  }

  get paths() {
    return this.channelSvg.find("[clip-path] path");
  }

  get overviewSvg() {
    return this.overview.find("svg");
  }

  get legend() {
    return this.root.find(".htx-timeseries-channel-legend-container");
  }

  get legendItems() {
    return this.legend.find(".channel-name");
  }

  // Hover over legend item by index
  hoverLegendItem(index: number) {
    cy.log(`Hovering over legend item ${index}`);
    this.legendItems.eq(index).trigger("mouseover");
    return this;
  }

  // Remove hover from legend
  unhoverLegend() {
    cy.log("Removing hover from legend");
    this.legendItems.first().trigger("mouseout");
    return this;
  }

  // Click legend item by index to toggle channel visibility
  clickLegendItem(index: number) {
    cy.log(`Clicking legend item ${index} to toggle channel visibility`);
    this.legendItems.eq(index).click();
    return this;
  }

  // Wait for TimeSeries to be ready
  waitForReady() {
    cy.log("Waiting for TimeSeries to be ready");
    this.root.should("be.visible");
    this.channelSvg.should("be.visible");
    this.paths.should("have.length.greaterThan", 0);
    return this;
  }

  // Verify no positioning errors (NaN/Infinity) in SVG elements
  verifyNoPositioningErrors() {
    cy.log("Verifying no NaN or Infinity values in SVG elements");
    this.paths.each(($el) => {
      const element = $el[0];

      const value = element.getAttribute("d");
      if (value) {
        expect(value).to.not.include("NaN");
        expect(value).to.not.include("Infinity");
      }
    });
    return this;
  }

  getViewBox(channel) {
    return channel.invoke("attr", "viewBox");
  }

  getPaths(channel) {
    return channel.find("[clip-path] path");
  }

  // Simple click-based navigation instead of drag
  clickOverviewAt(percent: number) {
    cy.log(`Clicking overview at ${percent}%`);

    this.overviewOverlay
      .scrollIntoView()
      .should("be.visible")
      .then(($overlay) => {
        const rect = $overlay[0].getBoundingClientRect();
        const x = rect.left + rect.width * (percent / 100);
        const y = rect.top + rect.height * 0.5;

        cy.wrap($overlay).click(x - rect.left, y - rect.top, { force: true });
      });

    return this;
  }

  verifyDataVisibleInViewport() {
    cy.log("Verifying chart data is visible in SVG viewport");

    this.channelSvg.should("be.visible", { timeout: 10000 }).then(($svgs) => {
      for (const $svg of $svgs) {
        const svgElement = $svg as unknown as SVGSVGElement;
        const viewBox = svgElement.viewBox.baseVal;

        const visibleArea = {
          x: viewBox.x,
          y: viewBox.y,
          width: viewBox.width,
          height: viewBox.height,
        };

        cy.log(`SVG viewBox: ${visibleArea.x}, ${visibleArea.y}, ${visibleArea.width}, ${visibleArea.height}`);

        this.getPaths(cy.wrap($svg)).each(($path) => {
          const pathElement = $path[0] as unknown as SVGPathElement;
          const pathData = pathElement.getAttribute("d");

          // Get transform attributes from path element and its parents
          const transformMatrix = SVGTransformUtils.getTransformMatrix(pathElement, $svg);

          this.verifyPathDataInViewport(pathData, visibleArea, transformMatrix);
        });
      }
    });

    return this;
  }

  private verifyPathDataInViewport(pathData: string, visibleArea: any, transformMatrix?: DOMMatrix) {
    const coords = SVGPathUtils.extractPathCoordinates(pathData);

    // Apply transforms to coordinates if matrix is provided
    const transformedCoords = SVGTransformUtils.applyTransformToCoordinates(coords, transformMatrix);

    // Check that all points that should be visible are within the viewport
    const visibleRangePoint = transformedCoords.filter(
      (coord) => coord.x >= visibleArea.x && coord.x <= visibleArea.x + visibleArea.width,
    );
    const visiblePoints = visibleRangePoint.filter(
      (coord) =>
        // Coordinates in visible area should be within the viewport in terms of y
        coord.y >= visibleArea.y && coord.y <= visibleArea.y + visibleArea.height,
    );

    expect(visiblePoints.length).to.be.eq(
      visibleRangePoint.length,
      `Not all chart points in displaying range are visible in viewport. ${visiblePoints.length} out of ${visibleRangePoint.length} are visible.`,
    );
  }

  // Simple region creation using dragging
  drawRegionRelative(x1: number, x2: number) {
    this.channelContainer
      .eq(0)
      .find(".new_brush .overlay")
      .should("be.visible")
      .then(($overlay) => {
        const rect = $overlay[0].getBoundingClientRect();
        // Calculate relative coordinates (relative to the element, not the viewport)
        const startX = rect.width * x1;
        const endX = rect.width * x2;
        const centerY = rect.height * 0.5;

        const eventOptions = {
          eventConstructor: "MouseEvent",
          buttons: 1,
          force: true,
        };
        cy.wrap($overlay)
          .trigger("mousedown", startX, centerY, eventOptions)
          .trigger("mousemove", endX, centerY, eventOptions)
          .trigger("mouseup", endX, centerY, eventOptions);
      });

    return this;
  }

  // Zoom to maximum level using mouse wheel with platform detection
  zoomToMaximum() {
    cy.log("Zooming to maximum level using mouse wheel");

    this.channelOverlay.should("be.visible").then(($overlay) => {
      const rect = $overlay[0].getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Detect platform and use appropriate deltaY value
      // macOS with "Natural scrolling" typically needs positive deltaY for zoom in
      // Windows/Linux and macOS without "Natural scrolling" need negative deltaY
      cy.window().then((win) => {
        // Hold Ctrl/Cmd and scroll to zoom in multiple times
        cy.wrap($overlay).trigger("keydown", { key: "Control", ctrlKey: true });

        // Perform multiple zoom-in operations to reach maximum zoom
        for (let i = 0; i < 25; i++) {
          cy.wrap($overlay).trigger("wheel", {
            deltaY: 100,
            clientX: rect.left + centerX,
            clientY: rect.top + centerY,
            ctrlKey: true,
          });
        }

        cy.wrap($overlay).trigger("keyup", { key: "Control", ctrlKey: false });
        cy.wait(TWO_FRAMES_TIMEOUT);
      });
    });

    return this;
  }

  // Verify that chart client bounding boxes stay within their clip-path containers
  // Only checks odd-indexed paths (1st, 3rd, 5th, etc.) in each clip-path container group
  // Optional tolerance (px): multi-channel + viewport resize may need higher tolerance (e.g. 20)
  verifyChartBoundingBoxAlignment(tolerancePx = 2) {
    cy.log("Verifying chart client bounding boxes align with clip-path containers (odd-indexed paths only)");

    this.channelSvg.should("be.visible", { timeout: 10000 });
    // Allow layout to settle after viewport/resize (multi-channel can take longer)
    cy.wait(200);
    // Get all clip-path containers and check odd-indexed paths in each
    this.channelSvg.find("[clip-path]").each(($clipContainer) => {
      const clipPathParent = $clipContainer[0] as unknown as SVGElement;

      // Find all path elements within this clip-path container
      const paths = clipPathParent.querySelectorAll("path");

      if (paths.length === 0) {
        cy.log("No paths found in clip-path container, skipping");
        return;
      }

      // Check only odd-indexed paths (0-based: 0, 2, 4, etc. which are 1st, 3rd, 5th, etc.)
      for (let i = 0; i < paths.length; i += 2) {
        const pathElement = paths[i] as SVGPathElement;

        // Get client bounding rectangles (rendered coordinates in viewport)
        const pathClientRect = pathElement.getBoundingClientRect() as BoundingBox;
        const clipParentClientRect = clipPathParent.getBoundingClientRect() as BoundingBox;

        cy.log(
          `Path ${i + 1} client rect: x=${pathClientRect.x.toFixed(2)}, y=${pathClientRect.y.toFixed(2)}, width=${pathClientRect.width.toFixed(2)}, height=${pathClientRect.height.toFixed(2)}`,
        );
        cy.log(
          `Clip parent client rect: x=${clipParentClientRect.x.toFixed(2)}, y=${clipParentClientRect.y.toFixed(2)}, width=${clipParentClientRect.width.toFixed(2)}, height=${clipParentClientRect.height.toFixed(2)}`,
        );

        const isAligned = BoundingBoxUtils.isEqual(pathClientRect, clipParentClientRect, tolerancePx);
        expect(isAligned, `Path ${i + 1} client bounding box should align with its clip-path container`).to.be.true;
      }
    });

    return this;
  }
}

const TimeSeries = new TimeSeriesHelper("&:eq(0)");
const useTimeSeries = (rootSelector: string) => {
  return new TimeSeriesHelper(rootSelector);
};

export { TimeSeries, useTimeSeries };
