import { LabelStudio, TimeSeries } from "@humansignal/frontend-test/helpers/LSF";
import { multiChannelSampleData, multiChannwlCnfig } from "../../data/timeseries/multichannel";
import { TWO_FRAMES_TIMEOUT } from "../utils/constants";

describe("MultiChannel", () => {
  it("should render correctly", () => {
    cy.log("Initialize MultiChannel TimeSeries");
    LabelStudio.params().config(multiChannwlCnfig).data(multiChannelSampleData).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    TimeSeries.waitForReady();

    cy.log("Verify MultiChannel TimeSeries rendered correctly");

    // Verify that there are some paths rendered
    TimeSeries.paths.should("have.length.greaterThan", 0);

    // Verify no positioning errors (NaN/Infinity) in SVG elements
    TimeSeries.verifyNoPositioningErrors();

    // Verify chart data is visible in viewport
    TimeSeries.verifyDataVisibleInViewport();

    // Verify that we have multiple channels rendered
    TimeSeries.multiChannelContainer.should("be.visible");

    // Verify legend is rendered for multiple channels
    TimeSeries.legend.should("be.visible");
    TimeSeries.legendItems.should("have.length.greaterThan", 1);

    // Verify overview is rendered and functional
    TimeSeries.overview.should("be.visible");
    TimeSeries.overviewSvg.should("be.visible");

    cy.log("MultiChannel TimeSeries rendered successfully with valid data");
  });

  it("should support legend hover interactions", () => {
    cy.log("Initialize MultiChannel TimeSeries");
    LabelStudio.params().config(multiChannwlCnfig).data(multiChannelSampleData).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    TimeSeries.waitForReady();

    cy.log("Verify legend hover functionality works without errors");

    // Test hovering over legend items doesn't cause errors
    TimeSeries.hoverLegendItem(0);
    cy.wait(TWO_FRAMES_TIMEOUT); // Allow any transitions to complete

    // Verify paths are still visible
    TimeSeries.paths.should("be.visible");

    // Test hovering over different legend item
    TimeSeries.hoverLegendItem(1);
    cy.wait(TWO_FRAMES_TIMEOUT); // Allow any transitions to complete

    // Verify paths are still visible
    TimeSeries.paths.should("be.visible");

    // Test removing hover
    TimeSeries.unhoverLegend();
    cy.wait(TWO_FRAMES_TIMEOUT); // Allow any transitions to complete

    // Verify paths are still visible
    TimeSeries.paths.should("be.visible");

    cy.log("Legend hover functionality working correctly without errors");
  });

  it("should support channel visibility toggling via legend clicks", () => {
    cy.log("Initialize MultiChannel TimeSeries");
    LabelStudio.params().config(multiChannwlCnfig).data(multiChannelSampleData).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    TimeSeries.waitForReady();

    cy.log("Test channel visibility toggling by clicking legend items");

    // Get initial state - count visible paths and legend items
    TimeSeries.paths.should("have.length.greaterThan", 0);
    TimeSeries.legendItems.should("have.length.greaterThan", 1);

    TimeSeries.paths.then(($initialPaths) => {
      const initialVisibleCount = $initialPaths.filter(":visible").length;
      cy.log(`Initial visible paths: ${initialVisibleCount}`);

      // Click first legend item to hide channel
      cy.log("Clicking first legend item to hide channel");
      TimeSeries.clickLegendItem(0);

      // Verify that some paths are now hidden (each channel can have 1-2 paths)
      TimeSeries.paths.then(($pathsAfterHide) => {
        const visibleAfterHide = $pathsAfterHide.filter(":visible").length;
        cy.log(`Visible paths after hiding: ${visibleAfterHide}`);

        // Should have fewer visible paths (1-2 paths hidden per channel)
        expect(visibleAfterHide).to.be.lessThan(initialVisibleCount);
        expect(visibleAfterHide).to.be.at.least(0);
      });

      // Click the same legend item again to show channel back
      cy.log("Clicking same legend item to show channel back");
      TimeSeries.clickLegendItem(0);

      // Verify paths are restored
      TimeSeries.paths.filter(":visible").should("have.length", initialVisibleCount);

      // Test hiding different channel
      cy.log("Testing hiding second channel");
      TimeSeries.clickLegendItem(1);

      TimeSeries.paths.then(($pathsAfterHide2) => {
        const visibleAfterHide2 = $pathsAfterHide2.filter(":visible").length;
        cy.log(`Visible paths after hiding second channel: ${visibleAfterHide2}`);

        // Should have fewer visible paths
        expect(visibleAfterHide2).to.be.lessThan(initialVisibleCount);
        expect(visibleAfterHide2).to.be.at.least(0);
      });

      // Restore second channel
      cy.log("Restoring second channel");
      TimeSeries.clickLegendItem(1);

      // Verify all paths are restored
      TimeSeries.paths.filter(":visible").should("have.length", initialVisibleCount);

      cy.log("Channel visibility toggling works correctly");
    });
  });
});
