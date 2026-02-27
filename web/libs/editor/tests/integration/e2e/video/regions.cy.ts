import { Labels, LabelStudio, Sidebar, VideoView } from "@humansignal/frontend-test/helpers/LSF/index";
import { simpleVideoConfig, simpleVideoData, simpleVideoResult } from "../../data/video_segmentation/regions";

// This test suite has exhibited flakiness in CI environments, so we are using retries
// while we work on improving CI stability for visual comparisons.
const suiteConfig = {
  retries: {
    runMode: 3, // Retry 3 times in CI (headless mode)
    openMode: 0, // No retries in local development (interactive mode)
  },
};

describe("Video segmentation", suiteConfig, () => {
  it("Should be able to draw a simple rectangle", () => {
    LabelStudio.params().config(simpleVideoConfig).data(simpleVideoData).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    Sidebar.hasNoRegions();

    Labels.select("Label 1");

    VideoView.drawRectRelative(0.2, 0.2, 0.6, 0.6);

    Sidebar.hasRegions(1);
  });

  it("Should have changes in canvas", () => {
    LabelStudio.params().config(simpleVideoConfig).data(simpleVideoData).withResult([]).init();
    LabelStudio.waitForObjectsReady();

    VideoView.waitForStableState();
    Sidebar.hasNoRegions();

    VideoView.captureCanvas("canvas");

    Labels.select("Label 2");
    VideoView.drawRectRelative(0.2, 0.2, 0.6, 0.6);

    Sidebar.hasRegions(1);
    VideoView.waitForStableState();

    VideoView.canvasShouldChange("canvas", 0);
  });
  it("Should be invisible out of the lifespan (rectangle)", () => {
    LabelStudio.params().config(simpleVideoConfig).data(simpleVideoData).withResult(simpleVideoResult).init();
    LabelStudio.waitForObjectsReady();
    // Wait for video and regions to be fully loaded
    VideoView.waitForRegionInKonvaByIndex(0);
    VideoView.waitForStableState();

    Sidebar.hasRegions(1);

    VideoView.captureCanvas("canvas");

    VideoView.clickAtFrame(4);
    VideoView.waitForFrame(4);
    VideoView.waitForRegionNotInKonvaByIndex(0);
    VideoView.waitForStableState();

    VideoView.canvasShouldChange("canvas", 0);
  });

  it("Should be invisible out of the lifespan (transformer)", () => {
    LabelStudio.params().config(simpleVideoConfig).data(simpleVideoData).withResult(simpleVideoResult).init();
    LabelStudio.waitForObjectsReady();
    // Wait for frame change to be fully processed
    VideoView.waitForRegionInKonvaByIndex(0);
    VideoView.waitForStableState();
    Sidebar.hasRegions(1);

    cy.log("Remember an empty canvas state");
    VideoView.clickAtFrame(4);
    VideoView.waitForFrame(4);
    VideoView.waitForRegionNotInKonvaByIndex(0);
    VideoView.waitForStableState();
    VideoView.captureCanvas("canvas");

    VideoView.clickAtFrame(3);
    VideoView.waitForRegionInKonvaByIndex(0);
    VideoView.waitForStableState();
    cy.log("Select region");
    VideoView.clickAtRelative(0.5, 0.5);
    Sidebar.hasSelectedRegions(1);
    VideoView.clickAtFrame(4);
    VideoView.waitForFrame(4); // Wait for frame 4
    Sidebar.hasSelectedRegions(1);

    VideoView.waitForStableState();

    VideoView.canvasShouldNotChange("canvas", 0);
  });
});
