import { ImageView, LabelStudio, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import {
  fourRectanglesResult,
  simpleEllipseConfig,
  simpleEllipseResult,
  simpleImageData,
  simplePointConfig,
  simplePointResult,
  simplePolygonConfig,
  simplePolygonResult,
  simpleRectangleConfig,
  simpleRectangleResult,
} from "../../../data/image_segmentation/tools/selection-tool";
import { FF_DEV_1442 } from "../../../../../src/utils/feature-flags";

describe("Image segmentation - Tools - Selection tool", () => {
  describe("Сlick interactions", () => {
    it("Should select rectangle region by clicking on center", () => {
      LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(simpleRectangleResult).init();

      ImageView.waitForImage();
      ImageView.selectMoveToolByButton();
      ImageView.clickAtRelative(0.5, 0.5);
      Sidebar.hasSelectedRegions(1);
    });

    it("Should select rectangle region by clicking on edge", () => {
      LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(simpleRectangleResult).init();

      ImageView.waitForImage();
      ImageView.selectMoveToolByButton();
      ImageView.clickAtRelative(0.2, 0.5);
      Sidebar.hasSelectedRegions(1);
    });

    it("Should select ellipse region by clicking on center", () => {
      LabelStudio.params().config(simpleEllipseConfig).data(simpleImageData).withResult(simpleEllipseResult).init();

      ImageView.waitForImage();
      ImageView.selectMoveToolByButton();
      ImageView.clickAtRelative(0.5, 0.5);
      Sidebar.hasSelectedRegions(1);
    });

    it("Should not select ellipse region by clicking inside it's bbox but outside region itself", () => {
      LabelStudio.params().config(simpleEllipseConfig).data(simpleImageData).withResult(simpleEllipseResult).init();

      ImageView.waitForImage();
      ImageView.selectMoveToolByButton();
      ImageView.clickAtRelative(0.25, 0.25);
      Sidebar.hasSelectedRegions(0);
    });

    it("Should select polygon region by clicking on it", () => {
      LabelStudio.params().config(simplePolygonConfig).data(simpleImageData).withResult(simplePolygonResult).init();

      ImageView.waitForImage();
      ImageView.selectMoveToolByButton();
      ImageView.clickAtRelative(0.3, 0.5);
      Sidebar.hasSelectedRegions(1);
    });

    it("Should not select polygon region by clicking inside it's bbox but outside region itself", () => {
      LabelStudio.params().config(simplePolygonConfig).data(simpleImageData).withResult(simplePolygonResult).init();

      ImageView.waitForImage();
      ImageView.selectMoveToolByButton();
      ImageView.clickAtRelative(0.6, 0.5);
      Sidebar.hasSelectedRegions(0);
    });

    it("Should select keypoint region by clicking on it", () => {
      LabelStudio.params().config(simplePointConfig).data(simpleImageData).withResult(simplePointResult).init();

      ImageView.waitForImage();
      ImageView.selectMoveToolByButton();
      ImageView.clickAtRelative(0.5, 0.5);
      Sidebar.hasSelectedRegions(1);
    });

    it("Should not select hidden region by click", () => {
      LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(simpleRectangleResult).init();

      ImageView.waitForImage();
      ImageView.selectMoveToolByButton();
      Sidebar.toggleRegionVisibility(0);
      Sidebar.hasSelectedRegions(0);
      ImageView.clickAtRelative(0.5, 0.5);
      Sidebar.hasSelectedRegions(0);
    });

    it("Should select a couple of regions by clicking with Ctrl pressed", () => {
      LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(fourRectanglesResult).init();

      ImageView.waitForImage();
      ImageView.selectMoveToolByButton();
      Sidebar.hasSelectedRegions(0);

      ImageView.clickAtRelative(0.3, 0.3);
      Sidebar.hasSelectedRegions(1);

      ImageView.clickAtRelative(0.7, 0.3, { ctrlKey: true, metaKey: true });
      Sidebar.hasSelectedRegions(2);
    });

    it("Should select regions inside transformer area by clicking with Ctrl pressed", () => {
      LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(fourRectanglesResult).init();

      ImageView.waitForImage();
      ImageView.selectMoveToolByButton();
      Sidebar.hasSelectedRegions(0);

      ImageView.clickAtRelative(0.3, 0.3, { ctrlKey: true, metaKey: true });
      ImageView.clickAtRelative(0.7, 0.3, { ctrlKey: true, metaKey: true });
      ImageView.clickAtRelative(0.7, 0.7, { ctrlKey: true, metaKey: true });
      Sidebar.hasSelectedRegions(3);

      ImageView.clickAtRelative(0.3, 0.7, { ctrlKey: true, metaKey: true });
      Sidebar.hasSelectedRegions(4);
    });

    it("Should deselect regions by clicking with Ctrl pressed", () => {
      LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(fourRectanglesResult).init();

      ImageView.waitForImage();
      ImageView.selectMoveToolByButton();
      Sidebar.hasSelectedRegions(0);
      ImageView.drawRectRelative(0.1, 0.1, 0.8, 0.8);
      Sidebar.hasSelectedRegions(4);

      ImageView.clickAtRelative(0.3, 0.3, { ctrlKey: true, metaKey: true });
      Sidebar.hasSelectedRegions(3);

      ImageView.clickAtRelative(0.3, 0.7, { ctrlKey: true, metaKey: true });
      Sidebar.hasSelectedRegions(2);

      ImageView.clickAtRelative(0.7, 0.7, { ctrlKey: true, metaKey: true });
      Sidebar.hasSelectedRegions(1);

      ImageView.clickAtRelative(0.7, 0.3, { ctrlKey: true, metaKey: true });
      Sidebar.hasSelectedRegions(0);
    });

    it("Should deselect regions by clicking outside @regression", () => {
      LabelStudio.addFeatureFlagsOnPageLoad({
        [FF_DEV_1442]: true,
      });

      LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(fourRectanglesResult).init();

      ImageView.waitForImage();

      ImageView.selectMoveToolByButton();
      ImageView.drawRectRelative(0.1, 0.1, 0.8, 0.8);
      Sidebar.hasSelectedRegions(4);

      ImageView.clickAtRelative(0.1, 0.1);
      Sidebar.hasSelectedRegions(0);
    });

    it("Should not deselect regions by clicking outside with Ctrl pressed @regression", () => {
      LabelStudio.addFeatureFlagsOnPageLoad({
        [FF_DEV_1442]: true,
      });

      LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(fourRectanglesResult).init();

      ImageView.waitForImage();

      ImageView.selectMoveToolByButton();
      ImageView.drawRectRelative(0.1, 0.1, 0.8, 0.8);
      Sidebar.hasSelectedRegions(4);

      ImageView.clickAtRelative(0.1, 0.1, { ctrlKey: true, metaKey: true });
      Sidebar.hasSelectedRegions(4);
    });

    it("Should be able to select one region from the group of selected regions by click on it", () => {
      LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(fourRectanglesResult).init();

      ImageView.waitForImage();
      ImageView.selectMoveToolByButton();
      Sidebar.hasSelectedRegions(0);
      ImageView.drawRectRelative(0.1, 0.1, 0.8, 0.8);
      Sidebar.hasSelectedRegions(4);
      ImageView.clickAtRelative(0.25, 0.25);
      Sidebar.hasSelectedRegions(1);
    });
  });
  describe("Selecting area", () => {
    it("Should be able to select just one region", () => {
      LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(fourRectanglesResult).init();

      ImageView.waitForImage();
      ImageView.selectMoveToolByButton();
      ImageView.drawRectRelative(0.1, 0.1, 0.4, 0.4);
      Sidebar.hasSelectedRegions(1);
    });

    it("Should be able to select all regions", () => {
      LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(fourRectanglesResult).init();

      ImageView.waitForImage();
      ImageView.selectMoveToolByButton();
      ImageView.drawRectRelative(0.1, 0.1, 0.8, 0.8);
      Sidebar.hasSelectedRegions(4);
    });

    it("Should not select hidden region by selecting area", () => {
      LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(simpleRectangleResult).init();

      ImageView.waitForImage();
      ImageView.selectMoveToolByButton();
      Sidebar.toggleRegionVisibility(0);
      Sidebar.hasSelectedRegions(0);
      ImageView.drawRectRelative(0.1, 0.1, 0.8, 0.8);
      Sidebar.hasSelectedRegions(0);
    });

    it("Should disappear after mouseup", () => {
      LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult([]).init();

      ImageView.waitForImage();
      ImageView.selectMoveToolByButton();
      ImageView.capture("canvas");
      ImageView.drawRectRelative(0.05, 0.05, 0.9, 0.9);
      // empirically chosen threshold to catch slight changes
      ImageView.canvasShouldNotChange("canvas", 0.009);
    });

    it("Should add regions to selection with Ctrl pressed", () => {
      LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(fourRectanglesResult).init();

      ImageView.waitForImage();
      ImageView.selectMoveToolByButton();
      Sidebar.hasSelectedRegions(0);

      ImageView.drawRectRelative(0.1, 0.1, 0.4, 0.4, { ctrlKey: true, metaKey: true });
      Sidebar.hasSelectedRegions(1);

      ImageView.drawRectRelative(0.1, 0.1, 0.8, 0.4, { ctrlKey: true, metaKey: true });
      Sidebar.hasSelectedRegions(2);

      ImageView.drawRectRelative(0.1, 0.5, 0.8, 0.4, { ctrlKey: true, metaKey: true });
      Sidebar.hasSelectedRegions(4);
    });

    it("Should not reset selection with Ctrl pressed", () => {
      LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult(fourRectanglesResult).init();

      ImageView.waitForImage();
      ImageView.selectMoveToolByButton();
      Sidebar.hasSelectedRegions(0);
      ImageView.drawRectRelative(0.1, 0.1, 0.8, 0.8);

      ImageView.drawRectRelative(0.9, 0.9, 0.01, 0.01, { ctrlKey: true, metaKey: true });
      Sidebar.hasSelectedRegions(4);
    });

    it("Should select an area even if the region was just added @regression", () => {
      LabelStudio.addFeatureFlagsOnPageLoad({
        [FF_DEV_1442]: true,
      });

      LabelStudio.params().config(simpleRectangleConfig).data(simpleImageData).withResult([]).init();

      ImageView.waitForImage();
      ImageView.selectRectangleToolByButton();

      cy.log("Draw two new regions");
      ImageView.drawRectRelative(0.2, 0.2, 0.2, 0.6);
      Sidebar.hasRegions(1);
      ImageView.drawRectRelative(0.6, 0.2, 0.2, 0.6);
      Sidebar.hasRegions(2);
      Sidebar.hasSelectedRegions(0);

      ImageView.selectMoveToolByButton();
      ImageView.drawRectRelative(0.1, 0.1, 0.8, 0.8);
      Sidebar.hasSelectedRegions(2);
    });
  });
});
