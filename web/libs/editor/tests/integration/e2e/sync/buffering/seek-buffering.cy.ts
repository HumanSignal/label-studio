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

      // Perform seek operation (y must stay in the waveform strip; see Visualizer.handleSeek).
      cy.log("Performing seek operation with slow network");
      AudioView.clickAtRelative(0.3, 0.12);
      cy.wait(TWO_FRAMES_TIMEOUT);
      AudioView.playButton.click();

      cy.log("Releasing held media response");
      delayedNetwork.releaseRequest();

      cy.log("Waiting for playback to resume and sync");
      AudioView.waitForPlayState(true, 20000, true);
      SyncGroup.checkSynchronization(0.5, null, 15);

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

      cy.log("Releasing held media response");
      delayedNetwork.releaseRequest();

      AudioView.waitForPlayState(true, 20000, true);
      SyncGroup.checkSynchronization(0.5, null, 15);

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

      AudioView.clickAtRelative(0.5, 0.12);
      AudioView.playButton.click();

      delayedNetwork.releaseRequest();

      AudioView.waitForPlayState(true, 20000, true);
      AudioView.pauseButton.should("exist");
      VideoView.pauseButton.should("exist");

      SyncGroup.checkSynchronization(0.5, null, 15);
    });
  });
});
