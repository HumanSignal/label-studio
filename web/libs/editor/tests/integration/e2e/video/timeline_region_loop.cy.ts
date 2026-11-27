import { LabelStudio, Sidebar, VideoView } from "@humansignal/frontend-test/helpers/LSF";
import {
  timelineVideoConfig,
  timelineVideoData,
  singleTimelineRegionResult,
  multipleTimelineRegionsResult,
  overlappingTimelineRegionsResult,
  multipleTimelineRegionsLongResult,
} from "../../data/video_segmentation/timeline_regions";
import { TWO_FRAMES_TIMEOUT } from "../utils/constants";

// This test suite has exhibited flakiness in CI environments, so we are using retries
// while we work on improving CI stability for visual comparisons.
const suiteConfig = {
  retries: {
    runMode: 3, // Retry 3 times in CI (headless mode)
    openMode: 0, // No retries in local development (interactive mode)
  },
};

describe("Video Timeline Region Loop Playback", suiteConfig, () => {
  describe("Single Region Playback", () => {
    it("Should play selected region from beginning to end and stop", () => {
      LabelStudio.params()
        .config(timelineVideoConfig)
        .data(timelineVideoData)
        .withResult(singleTimelineRegionResult)
        .init();

      LabelStudio.waitForObjectsReady();
      Sidebar.hasRegions(1);

      // Position cursor outside the region (frame 20)
      VideoView.clickAtFrame(20);
      VideoView.waitForFrame(20);

      // Select the region
      Sidebar.toggleRegionSelection(0);
      Sidebar.hasSelectedRegions(1);

      // Start playback
      VideoView.play();

      // Verify video moved back to region and played to the end (frame 15)
      VideoView.verifyPlayingRange(
        singleTimelineRegionResult[0].value.ranges[0].end,
        singleTimelineRegionResult[0].value.ranges[0].end,
      );

      // Video should be paused after region end
      VideoView.pauseButton.should("not.exist");
      VideoView.playButton.should("be.visible");

      // Verify current frame is at region end
      VideoView.getCurrentFrame().should("be.eq", 15);
    });

    it("Should play from current position if cursor is within region", () => {
      LabelStudio.params()
        .config(timelineVideoConfig)
        .data(timelineVideoData)
        .withResult(singleTimelineRegionResult)
        .init();

      LabelStudio.waitForObjectsReady();
      Sidebar.hasRegions(1);

      // Select the region (frames 5-15)
      Sidebar.toggleRegionSelection(0);
      Sidebar.hasSelectedRegions(1);

      // Position cursor within the region (frame 10)
      VideoView.setCurrentFrame(10);
      VideoView.waitForFrame(10);

      // Start playback
      VideoView.play();

      // Should start from frame 10 and play to frame 15
      VideoView.getCurrentFrame().should("be.greaterThan", 9);

      VideoView.waitForFrame(15);

      // Video should stop at region end
      VideoView.playButton.should("be.visible");
    });
  });

  describe("Multiple Regions Playback", () => {
    it("Should play from earliest region start to latest region end", () => {
      LabelStudio.params()
        .config(timelineVideoConfig)
        .data(timelineVideoData)
        .withResult(multipleTimelineRegionsResult)
        .init();

      LabelStudio.waitForObjectsReady();
      Sidebar.hasRegions(2);

      // Position cursor outside the regions
      VideoView.clickAtFrame(25);
      VideoView.waitForFrame(25);

      // Select both regions
      Sidebar.toggleRegionSelection(0);
      Sidebar.hasSelectedRegions(1);
      Sidebar.toggleRegionSelection(1, true); // Select both regions
      Sidebar.hasSelectedRegions(2);

      // Start playback
      VideoView.play();

      // Should play from first region to the end of the second region
      VideoView.verifyPlayingRange(
        multipleTimelineRegionsResult[0].value.ranges[0].end,
        multipleTimelineRegionsResult[1].value.ranges[0].end,
      );

      VideoView.playButton.should("be.visible");
    });

    it("Should handle overlapping regions correctly", () => {
      LabelStudio.params()
        .config(timelineVideoConfig)
        .data(timelineVideoData)
        .withResult(overlappingTimelineRegionsResult)
        .init();

      LabelStudio.waitForObjectsReady();
      Sidebar.hasRegions(2);

      VideoView.clickAtFrame(25);

      // Select both overlapping regions (8-12 and 10-18)
      Sidebar.toggleRegionSelection(0);
      Sidebar.hasSelectedRegions(1);
      Sidebar.toggleRegionSelection(1, true); // Select both regions
      Sidebar.hasSelectedRegions(2);

      VideoView.play();

      // Should play from first region to the end of the second region
      VideoView.verifyPlayingRange(
        overlappingTimelineRegionsResult[0].value.ranges[0].end,
        overlappingTimelineRegionsResult[1].value.ranges[0].end,
      );

      VideoView.playButton.should("be.visible");
    });
  });

  describe("Loop Timeline Region Feature", () => {
    it("Should loop region playback when loop option is enabled", () => {
      LabelStudio.params()
        .config(timelineVideoConfig)
        .data(timelineVideoData)
        .withResult(singleTimelineRegionResult)
        .init();

      LabelStudio.waitForObjectsReady();
      Sidebar.hasRegions(1);

      // Enable loop timeline region option
      VideoView.toggleConfigModal();
      VideoView.enableLoopTimelineRegion();
      VideoView.isLoopTimelineRegionEnabled();
      VideoView.toggleConfigModal(); // Close modal

      // Select the region
      Sidebar.toggleRegionSelection(0);
      Sidebar.hasSelectedRegions(1);

      // Start playback
      VideoView.play();

      // Wait for first loop (frames 5-15)
      VideoView.waitForFrame(5);

      VideoView.waitForFrame(15);

      // Should loop back to start instead of stopping
      VideoView.waitForFrame(5);

      VideoView.waitForFrame(15);

      // Video should still be playing (not stopped)
      VideoView.pauseButton.should("be.visible");

      // Manually pause to end test
      VideoView.pause();
    });

    it("Should persist loop timeline region setting between page reloads", () => {
      // First session - enable loop setting
      LabelStudio.params()
        .config(timelineVideoConfig)
        .data(timelineVideoData)
        .withResult(singleTimelineRegionResult)
        .init();

      LabelStudio.waitForObjectsReady();

      VideoView.toggleConfigModal();
      VideoView.enableLoopTimelineRegion();
      VideoView.isLoopTimelineRegionEnabled();
      VideoView.toggleConfigModal();

      cy.window().then((win) => {
        // trigger saving to localStorage
        win.LabelStudio.destroyAll();
        const localStorage = JSON.parse(JSON.stringify(win.localStorage));

        // Reinitialize LSF (simulate page reload)
        LabelStudio.params()
          .config(timelineVideoConfig)
          .data(timelineVideoData)
          .withResult(singleTimelineRegionResult)
          .localStorageItems(localStorage)
          .init();

        LabelStudio.waitForObjectsReady();

        // Check that setting is still enabled
        VideoView.toggleConfigModal();
        VideoView.isLoopTimelineRegionEnabled();

        VideoView.disableLoopTimelineRegion();
        VideoView.isLoopTimelineRegionDisabled();
        VideoView.toggleConfigModal();
      });

      cy.window().then((win) => {
        // trigger saving to localStorage
        win.LabelStudio.destroyAll();
        const localStorage = JSON.parse(JSON.stringify(win.localStorage));
        // Reinitialize LSF (simulate page reload)
        LabelStudio.params()
          .config(timelineVideoConfig)
          .data(timelineVideoData)
          .withResult(singleTimelineRegionResult)
          .localStorageItems(localStorage)
          .init();

        LabelStudio.waitForObjectsReady();

        // Check that setting is still disabled
        VideoView.toggleConfigModal();
        VideoView.isLoopTimelineRegionDisabled();
        VideoView.toggleConfigModal();
      });
    });
  });

  describe("Edge Cases", () => {
    it("Should handle region selection changes during playback", () => {
      LabelStudio.params()
        .config(timelineVideoConfig)
        .data(timelineVideoData)
        .withResult(multipleTimelineRegionsLongResult)
        .init();

      LabelStudio.waitForObjectsReady();
      Sidebar.hasRegions(2);

      // Start with first region selected
      Sidebar.toggleRegionSelection(1);
      cy.wait(TWO_FRAMES_TIMEOUT);
      VideoView.play();

      VideoView.verifyPlayingRange(20, 15, true);

      // Change selection to second region during playback
      Sidebar.toggleRegionSelection(0); // Select another region

      VideoView.verifyPlayingRange(9, 10);
      cy.wait(TWO_FRAMES_TIMEOUT);
      VideoView.getCurrentFrame().should("be.eq", 10);
    });

    it("Should handle no regions selected gracefully", () => {
      LabelStudio.params()
        .config(timelineVideoConfig)
        .data(timelineVideoData)
        .withResult(singleTimelineRegionResult)
        .init();

      LabelStudio.waitForObjectsReady();
      Sidebar.hasRegions(1);
      Sidebar.hasSelectedRegions(0); // No regions selected by default

      // Try to play without selected regions
      VideoView.clickAtFrame(2);
      VideoView.play();

      VideoView.verifyPlayingRange(10, 40, true);
      VideoView.pause();
    });
  });
});
