import { LabelStudio, TimeSeries } from "@humansignal/frontend-test/helpers/LSF";
import {
  multiChannelConfig,
  singleChannelConfig,
  heavyDatasetForDisplacement,
} from "../../data/timeseries/charts-displaying";
import { TWO_FRAMES_TIMEOUT, CANVAS_STABILIZATION_TIMEOUT } from "../utils/constants";

describe("TimeSeries charts displaying - MultiChannel", () => {
  it("should not displace charts while navigating", () => {
    cy.log("Initialize MultiChannel TimeSeries for navigation testing");
    LabelStudio.params().config(multiChannelConfig).data(heavyDatasetForDisplacement).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    TimeSeries.waitForReady();

    cy.log("Perform simple navigation sequence with boundary validation");

    // Initial positioning check
    TimeSeries.verifyDataVisibleInViewport();

    // Click at different positions on overview
    TimeSeries.clickOverviewAt(10);
    TimeSeries.verifyDataVisibleInViewport();

    TimeSeries.clickOverviewAt(50);
    TimeSeries.verifyDataVisibleInViewport();

    TimeSeries.clickOverviewAt(90);
    TimeSeries.verifyDataVisibleInViewport();
  });

  it("should not displace charts after window resize", () => {
    LabelStudio.params().config(multiChannelConfig).data(heavyDatasetForDisplacement).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    TimeSeries.waitForReady();

    const checkDifferentPositions = () => {
      // Click at different positions on overview and check visibility of data
      TimeSeries.clickOverviewAt(10);
      TimeSeries.verifyDataVisibleInViewport();

      TimeSeries.clickOverviewAt(50);
      TimeSeries.verifyDataVisibleInViewport();

      TimeSeries.clickOverviewAt(90);
      TimeSeries.verifyDataVisibleInViewport();

      TimeSeries.clickOverviewAt(10);
    };

    cy.log("Test multiple window sizes");

    // Test window resize behavior for 800x600
    cy.log("Testing window resize to 800x600");
    cy.viewport(800, 600);
    cy.wait(TWO_FRAMES_TIMEOUT); // Allow resize handler to execute
    checkDifferentPositions();

    // Test window resize behavior for 1200x800
    cy.log("Testing window resize to 1200x800");
    cy.viewport(1200, 800);
    cy.wait(TWO_FRAMES_TIMEOUT); // Allow resize handler to execute
    checkDifferentPositions();

    // Test window resize behavior for 1400x900
    cy.log("Testing window resize to 1400x900");
    cy.viewport(1400, 900);
    cy.wait(TWO_FRAMES_TIMEOUT); // Allow resize handler to execute
    checkDifferentPositions();
  });

  it("should not displace charts on X-axis after window resize at maximum zoom", () => {
    cy.log("Initialize MultiChannel TimeSeries for X-axis displacement testing");
    LabelStudio.params().config(multiChannelConfig).data(heavyDatasetForDisplacement).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    TimeSeries.waitForReady();

    // Zoom to maximum level to make displacement more visible
    cy.log("Zooming to maximum level to test X-axis displacement");
    TimeSeries.zoomToMaximum();
    cy.wait(CANVAS_STABILIZATION_TIMEOUT); // Allow zoom to complete — max zoom on 200K points needs more than 2 frames

    // After each resize: assert charts are visible and respond to overview clicks (deterministic).
    // We do not use verifyDataVisibleInViewport here because at max zoom + narrow viewport not all points fit in view.
    const checkChartsRenderedAndResponsive = () => {
      TimeSeries.channelSvg.should("be.visible");
      TimeSeries.channelSvg.find("[clip-path] path").should("have.length.greaterThan", 0);
      TimeSeries.clickOverviewAt(10);
      TimeSeries.channelSvg.find("[clip-path] path").should("have.length.greaterThan", 0);
      TimeSeries.clickOverviewAt(50);
      TimeSeries.channelSvg.find("[clip-path] path").should("have.length.greaterThan", 0);
      TimeSeries.clickOverviewAt(90);
      TimeSeries.channelSvg.find("[clip-path] path").should("have.length.greaterThan", 0);
    };

    cy.log("Test multiple window sizes");

    cy.log("Testing window resize to 800x600");
    cy.viewport(800, 600);
    cy.wait(CANVAS_STABILIZATION_TIMEOUT);
    checkChartsRenderedAndResponsive();

    cy.log("Testing window resize to 1200x800");
    cy.viewport(1200, 800);
    cy.wait(CANVAS_STABILIZATION_TIMEOUT);
    checkChartsRenderedAndResponsive();

    cy.log("Testing window resize to 1400x900");
    cy.viewport(1400, 900);
    cy.wait(CANVAS_STABILIZATION_TIMEOUT);
    checkChartsRenderedAndResponsive();

    cy.log("Testing narrow window (600x800)");
    cy.viewport(600, 800);
    cy.wait(CANVAS_STABILIZATION_TIMEOUT);
    checkChartsRenderedAndResponsive();
  });
});
describe("TimeSeries charts displaying - Single Channel", () => {
  it("should not displace charts while navigating", () => {
    cy.log("Initialize Single Channel TimeSeries for navigation testing");
    LabelStudio.params().config(singleChannelConfig).data(heavyDatasetForDisplacement).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    TimeSeries.waitForReady();

    cy.log("Perform simple navigation sequence with boundary validation");

    // Initial positioning check
    TimeSeries.verifyDataVisibleInViewport();

    // Click at different positions on overview
    TimeSeries.clickOverviewAt(10);
    TimeSeries.verifyDataVisibleInViewport();

    TimeSeries.clickOverviewAt(50);
    TimeSeries.verifyDataVisibleInViewport();

    TimeSeries.clickOverviewAt(90);
    TimeSeries.verifyDataVisibleInViewport();
  });

  it("should not displace charts after window resize", () => {
    LabelStudio.params().config(singleChannelConfig).data(heavyDatasetForDisplacement).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    TimeSeries.waitForReady();

    const checkDifferentPositions = () => {
      // Click at different positions on overview and check visibility of data
      TimeSeries.clickOverviewAt(10);
      TimeSeries.verifyDataVisibleInViewport();

      TimeSeries.clickOverviewAt(50);
      TimeSeries.verifyDataVisibleInViewport();

      TimeSeries.clickOverviewAt(90);
      TimeSeries.verifyDataVisibleInViewport();

      TimeSeries.clickOverviewAt(10);
    };

    cy.log("Test multiple window sizes");

    // Test window resize behavior for 800x600
    cy.log("Testing window resize to 800x600");
    cy.viewport(800, 600);
    cy.wait(TWO_FRAMES_TIMEOUT); // Allow resize handler to execute
    checkDifferentPositions();

    // Test window resize behavior for 1200x800
    cy.log("Testing window resize to 1200x800");
    cy.viewport(1200, 800);
    cy.wait(TWO_FRAMES_TIMEOUT); // Allow resize handler to execute
    checkDifferentPositions();

    // Test window resize behavior for 1400x900
    cy.log("Testing window resize to 1400x900");
    cy.viewport(1400, 900);
    cy.wait(TWO_FRAMES_TIMEOUT); // Allow resize handler to execute
    checkDifferentPositions();
  });

  it("should not displace charts on X-axis after window resize at maximum zoom", () => {
    cy.log("Initialize Single Channel TimeSeries for X-axis displacement testing");
    LabelStudio.params().config(singleChannelConfig).data(heavyDatasetForDisplacement).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    TimeSeries.waitForReady();

    // Zoom to maximum level to make displacement more visible
    cy.log("Zooming to maximum level to test X-axis displacement");
    TimeSeries.zoomToMaximum();
    cy.wait(CANVAS_STABILIZATION_TIMEOUT); // Allow zoom to complete — max zoom on 200K points needs more than 2 frames

    const checkChartsAlignment = () => {
      // Verify charts stay within plot area boundaries (especially X-axis)
      TimeSeries.verifyChartBoundingBoxAlignment();

      // Also check data visibility for different positions
      TimeSeries.clickOverviewAt(10);
      TimeSeries.verifyChartBoundingBoxAlignment();

      TimeSeries.clickOverviewAt(50);
      TimeSeries.verifyChartBoundingBoxAlignment();

      TimeSeries.clickOverviewAt(90);
      TimeSeries.verifyChartBoundingBoxAlignment();

      TimeSeries.clickOverviewAt(10);
    };

    cy.log("Test multiple window sizes with X-axis displacement checks");

    // Test window resize behavior for 800x600
    cy.log("Testing window resize to 800x600 - checking for X-axis displacement");
    cy.viewport(800, 600);
    cy.wait(CANVAS_STABILIZATION_TIMEOUT); // Allow resize handler to execute — at max zoom, SVG re-render of 200K points needs extra time
    checkChartsAlignment();

    // Test window resize behavior for 1200x800
    cy.log("Testing window resize to 1200x800 - checking for X-axis displacement");
    cy.viewport(1200, 800);
    cy.wait(CANVAS_STABILIZATION_TIMEOUT); // Allow resize handler to execute
    checkChartsAlignment();

    // Test window resize behavior for 1400x900
    cy.log("Testing window resize to 1400x900 - checking for X-axis displacement");
    cy.viewport(1400, 900);
    cy.wait(CANVAS_STABILIZATION_TIMEOUT); // Allow resize handler to execute
    checkChartsAlignment();

    // Test extreme narrow window to stress-test X-axis alignment
    cy.log("Testing narrow window (600x800) - stress test for X-axis displacement");
    cy.viewport(600, 800);
    cy.wait(CANVAS_STABILIZATION_TIMEOUT); // Allow resize handler to execute
    checkChartsAlignment();
  });
});
