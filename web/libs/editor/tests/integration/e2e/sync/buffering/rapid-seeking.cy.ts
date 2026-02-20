import { LabelStudio, AudioView, VideoView, Paragraphs } from "@humansignal/frontend-test/helpers/LSF";
import { useSyncGroup } from "@humansignal/frontend-test/helpers/utils/media/SyncGroup";
import { Network } from "@humansignal/frontend-test/helpers/utils/Network";
import {
  videoAudioParagraphsConfig,
  videoAudioParagraphsData,
  videoAudioParagraphsAnnotations,
} from "../../../data/sync/video-audio-paragraphs";
import { SINGLE_FRAME_TIMEOUT } from "../../utils/constants";

const suiteConfig = {
  retries: {
    runMode: 2,
    openMode: 0,
  },
  defaultCommandTimeout: 15000,
};

describe("Sync Buffering: Rapid Seeking Tests", suiteConfig, () => {
  beforeEach(() => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      fflag_fix_front_fit_31_synced_media_buffering: true,
      fflag_feat_front_lsdv_e_278_contextual_scrolling_short: true,
    });
    Network.disableBrowserCache();
    cy.reload(true);
  });

  afterEach(() => {
    Network.clearAllThrottles();
    Network.enableBrowserCache();
  });

  describe("Video + Audio + Paragraphs Rapid Seeking", () => {
    it("should handle rapid seeks", () => {
      LabelStudio.params()
        .config(videoAudioParagraphsConfig)
        .data(videoAudioParagraphsData)
        .withResult(videoAudioParagraphsAnnotations)
        .init();

      LabelStudio.waitForObjectsReady();
      AudioView.isReady();

      // Setup network delay
      const delayedNetwork = Network.createControlledDelay("/public/files/opossum_intro.webm", "seekBuffering");

      // Perform rapid seeks using MediaSynchronization helper
      const seekPositions = [0.1, 0.3, 0.6, 0.4, 0.8, 0.2, 0.7];

      cy.log("Performing rapid seeks on audio timeline");
      seekPositions.forEach((position, index) => {
        cy.log(`Rapid seek ${index + 1} at ${Math.round(position * 100)}%`);
        AudioView.clickAtRelative(position);
        AudioView.waitForStableState();

        if (index === 0) {
          AudioView.playButton.click();
        }
      });

      AudioView.hasBuffering();
      VideoView.hasBuffering();
      Paragraphs.hasBuffering();

      // Verify all media elements are synchronized
      const SyncGroup = useSyncGroup([AudioView, VideoView, Paragraphs]);
      SyncGroup.checkSynchronization();
    });

    it("should handle continuous timeline dragging with buffering", () => {
      LabelStudio.params()
        .config(videoAudioParagraphsConfig)
        .data(videoAudioParagraphsData)
        .withResult(videoAudioParagraphsAnnotations)
        .init();

      LabelStudio.waitForObjectsReady();
      AudioView.isReady();

      // Setup network delay
      const delayedNetwork = Network.createControlledDelay("/public/files/opossum_intro.webm", "seekBuffering");

      // Triggering bufferisatio
      VideoView.clickAtTimelineRelative(0.5);
      VideoView.playButton.click();

      // Perform continuous drag across timeline
      cy.log("Performing continuous drag across audio timeline");
      VideoView.timeLine.then(($timeLine) => {
        const bbox = $timeLine[0].getBoundingClientRect();
        const startPoint = 0.1;
        const endPoint = 0.9;
        const startX = bbox.left + bbox.width * startPoint;
        const endX = bbox.left + bbox.width * endPoint;
        const centerY = bbox.top + bbox.height * 0.5;

        // Perform drag with multiple intermediate points
        cy.wrap($timeLine).trigger("mousedown", startX - bbox.left, centerY - bbox.top, {
          eventConstructor: "MouseEvent",
          buttons: 1,
        });

        const points = [startPoint, 0.7, 0.3, 0.9, 0.5, 0.6, 0.2, 0.8, 0.3, endPoint];
        // Drag through multiple points
        for (const point of points) {
          const intermediateX = bbox.left + bbox.width * point;
          cy.wrap($timeLine).trigger("mousemove", intermediateX - bbox.left, centerY - bbox.top, {
            eventConstructor: "MouseEvent",
            buttons: 1,
          });
          cy.wait(SINGLE_FRAME_TIMEOUT);
        }

        cy.wrap($timeLine).trigger("mouseup", startX - bbox.left, centerY - bbox.top, {
          eventConstructor: "MouseEvent",
          buttons: 1,
        });
      });

      // Verify all media elements are synchronized
      const SyncGroup = useSyncGroup([AudioView, VideoView, Paragraphs]);
      SyncGroup.checkSynchronization();
    });

    it("should handle rapid seeks during playback", () => {
      LabelStudio.params()
        .config(videoAudioParagraphsConfig)
        .data(videoAudioParagraphsData)
        .withResult(videoAudioParagraphsAnnotations)
        .init();

      LabelStudio.waitForObjectsReady();
      AudioView.isReady();

      // Start playback
      AudioView.playButton.click();
      AudioView.waitForStableState();

      // Perform rapid seeks during playback
      const seekPositions = [0.2, 0.5, 0.3, 0.7, 0.4];
      cy.log("Performing rapid seeks during playback");
      seekPositions.forEach((position) => {
        AudioView.clickAtRelative(position, 0.5);
        AudioView.waitForStableState();
      });

      // Verify all media elements remain synchronized after rapid seeks
      const SyncGroup = useSyncGroup([AudioView, VideoView, Paragraphs]);
      SyncGroup.checkSynchronization(0.5);
    });
  });
});
