import type { MediaView, ViewWithMedia } from "./types";

export function withMedia<T extends new (...args: any[]) => ViewWithMedia>(
  Base: T,
): T & (new (...args: any[]) => MediaView) {
  return class extends Base implements MediaView {
    /** Shared by timeline controls, Paragraphs, and VideoCanvas buffering overlays */
    _bufferingIndicatorSelector = '[aria-label="Buffering Media Source"]';
    /**
     * Buffering overlays are not scoped under the audio or video tag roots (see Timeline Controls,
     * ParagraphAudio, VideoCanvas). Query globally so AudioView / VideoView / Paragraphs helpers
     * observe the same sync buffering UI.
     */
    get bufferingIndicator() {
      return cy.get(this._bufferingIndicatorSelector);
    }
    /**
     * Check if Tag is in buffering state
     */
    hasBuffering() {
      // Multiple overlays can exist; at least one must be visible (others may be in hidden layout).
      cy.get(this._bufferingIndicatorSelector).filter(":visible").should("have.length.at.least", 1);
    }
    /**
     * Check if Tag is not in buffering state
     */
    hasNoBuffering() {
      cy.get("body").find(this._bufferingIndicatorSelector).filter(":visible").should("have.length", 0);
    }

    /**
     * Check if media is playing
     */
    hasMediaPlaying() {
      this.mediaElement.should(($media) => {
        const mediaElement = $media[0] as HTMLMediaElement;
        expect(mediaElement.paused).to.be.false;
      });
    }

    /**
     * Check if media is paused during buffering
     */
    hasMediaPaused() {
      this.mediaElement.should(($media) => {
        const mediaElement = $media[0] as HTMLMediaElement;
        expect(mediaElement.paused).to.be.true;
      });
    }

    /**
     * Get current media time
     */
    getCurrentTime(): Cypress.Chainable<number> {
      return this.mediaElement.then(($media) => {
        const mediaElement = $media[0] as HTMLMediaElement;
        return mediaElement.currentTime;
      });
    }

    /**
     * Get media duration
     */
    getDuration(): Cypress.Chainable<number> {
      return this.mediaElement.then(($media) => {
        const mediaElement = $media[0] as HTMLMediaElement;
        return mediaElement.duration;
      });
    }

    /**
     * Get media network state
     */
    getNetworkState(): Cypress.Chainable<number> {
      return this.mediaElement.then(($media) => {
        const mediaElement = $media[0] as HTMLMediaElement;
        return mediaElement.networkState;
      });
    }

    /**
     * Get media ready state
     */
    getReadyState(): Cypress.Chainable<number> {
      return this.mediaElement.then(($media) => {
        const mediaElement = $media[0] as HTMLMediaElement;
        return mediaElement.readyState;
      });
    }

    /**
     * Check if media is paused
     */
    isPaused(): Cypress.Chainable<boolean> {
      return this.mediaElement.then(($media) => {
        const mediaElement = $media[0] as HTMLMediaElement;
        return mediaElement.paused;
      });
    }
  };
}
