import { LabelStudio, AudioView, VideoView, Paragraphs } from "@humansignal/frontend-test/helpers/LSF";
import { useSyncGroup } from "@humansignal/frontend-test/helpers/utils/media/SyncGroup";
import { Network } from "@humansignal/frontend-test/helpers/utils/Network";
import {
  videoAudioParagraphsConfig,
  videoAudioParagraphsData,
  videoAudioParagraphsAnnotations,
} from "../../../data/sync/video-audio-paragraphs";
import { TWO_FRAMES_TIMEOUT } from "../../utils/constants";

const suiteConfig = {
  retries: {
    runMode: 2,
    openMode: 0,
  },
  defaultCommandTimeout: 30000,
};

describe("Sync Buffering: Seek Buffering Tests", suiteConfig, () => {
  beforeEach(() => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      fflag_fix_front_fit_31_synced_media_buffering: true,
      fflag_feat_front_lsdv_e_278_contextual_scrolling_short: true,
    });
    Network.disableBrowserCache();
    cy.reload(true);
    cy.on("uncaught:exception", () => false);
  });

  afterEach(() => {
    Network.clearAllThrottles();
    Network.enableBrowserCache();
  });

  describe("Video + Audio + Paragraphs Seek Buffering", () => {
    const SyncGroup = useSyncGroup([AudioView, VideoView, Paragraphs]);

    it("should handle seek buffering from audio timeline", () => {
      LabelStudio.params()
        .config(videoAudioParagraphsConfig)
        .data(videoAudioParagraphsData)
        .withResult(videoAudioParagraphsAnnotations)
        .init();

      LabelStudio.waitForObjectsReady();
      AudioView.isReady();
      Paragraphs.mediaElement.should("exist");

      // Setup network delay
      const delayedNetwork = Network.createControlledDelay("/public/files/opossum_intro.webm", "seekBuffering");

      // Perform seek operation
      cy.log("Performing seek operation with slow network");
      AudioView.clickAtRelative(0.3, 0.5);
      cy.wait(TWO_FRAMES_TIMEOUT);
      // Start playback
      AudioView.playButton.click();

      cy.log("Verifying buffering appears");
      AudioView.hasBuffering();
      VideoView.hasBuffering();
      Paragraphs.hasBuffering();

      cy.log("Verifyin media is paused during buffering");
      AudioView.hasMediaPaused();
      VideoView.hasMediaPaused();
      Paragraphs.hasMediaPaused();

      AudioView.hasBuffering();

      // Release network delay
      cy.log("Releasing network delay to simulate recovery");
      delayedNetwork.releaseRequest();

      // Wait for buffering to complete
      AudioView.hasNoBuffering();
      VideoView.hasNoBuffering();
      Paragraphs.hasNoBuffering();

      // Verify both audio elements are synchronized
      SyncGroup.checkSynchronization();

      // Verify playback resumes
      AudioView.hasMediaPlaying();
      VideoView.hasMediaPlaying();
      Paragraphs.hasMediaPlaying();
    });

    it("should handle seek buffering from video timeline", () => {
      LabelStudio.params()
        .config(videoAudioParagraphsConfig)
        .data(videoAudioParagraphsData)
        .withResult(videoAudioParagraphsAnnotations)
        .init();

      LabelStudio.waitForObjectsReady();
      AudioView.isReady();
      Paragraphs.mediaElement.should("exist");

      // Setup network delay
      const delayedNetwork = Network.createControlledDelay("/public/files/opossum_intro.webm", "audioSeek");

      // Perform seek operation
      cy.log("Performing seek operation with slow network");
      VideoView.clickAtTimelineRelative(0.3);
      cy.wait(TWO_FRAMES_TIMEOUT);
      VideoView.playButton.click();

      AudioView.hasBuffering();
      VideoView.hasBuffering();
      Paragraphs.hasBuffering();

      AudioView.hasMediaPaused();
      VideoView.hasMediaPaused();
      Paragraphs.hasMediaPaused();

      AudioView.hasBuffering();

      // Release network delay
      cy.log("Releasing network delay to simulate recovery");
      delayedNetwork.releaseRequest();

      // Wait for buffering to complete
      AudioView.hasNoBuffering();
      VideoView.hasNoBuffering();
      Paragraphs.hasNoBuffering();

      // Verify both audio elements are synchronized
      SyncGroup.checkSynchronization();

      // Verify playback resumes
      AudioView.hasMediaPlaying();
      VideoView.hasMediaPlaying();
      Paragraphs.hasMediaPlaying();
    });
  });

  describe("Button State Consistency During Seek Buffering", () => {
    const SyncGroup = useSyncGroup([AudioView, VideoView, Paragraphs]);

    it("should maintain consistent button states across all media controls during buffering", () => {
      LabelStudio.params()
        .config(videoAudioParagraphsConfig)
        .data(videoAudioParagraphsData)
        .withResult(videoAudioParagraphsAnnotations)
        .init();

      LabelStudio.waitForObjectsReady();
      AudioView.isReady();

      // Setup network delay
      const delayedNetwork = Network.createControlledDelay("/public/files/opossum_intro.webm", "buttonStateSeek");

      // Perform seek during playback
      AudioView.clickAtRelative(0.5);
      // Start playback first
      AudioView.playButton.click();

      AudioView.hasBuffering();
      VideoView.hasBuffering();
      Paragraphs.hasBuffering();

      AudioView.pauseButton.should("exist");
      VideoView.pauseButton.should("exist");

      // Release network
      delayedNetwork.releaseRequest();

      AudioView.pauseButton.should("exist");
      VideoView.pauseButton.should("exist");

      SyncGroup.checkSynchronization();
    });
  });
});
