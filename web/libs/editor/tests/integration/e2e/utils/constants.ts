/**
 * Constants for tests
 *
 * Prefer deterministic waits over fixed timeouts where possible:
 * - Instead of cy.wait(TWO_FRAMES_TIMEOUT), wait for a DOM/canvas condition, e.g.:
 *   cy.get('.konva-transformer').should('exist') or
 *   ImageView.drawingArea.find('.konva-shape').should('have.length.at.least', 1)
 * - Use ImageView.waitForImage() before interacting with the canvas.
 */

/**
 * Wait time for processing a single animation frame (in ms)
 * Used for waiting for fast renders and DOM updates
 */
export const SINGLE_FRAME_TIMEOUT = 16;

/**
 * Wait time for processing two animation frames (in ms)
 * Used for waiting for fast renders which could be done in two steps for some reason
 * Prefer deterministic waits (see file comment) to reduce flakiness.
 */
export const TWO_FRAMES_TIMEOUT = SINGLE_FRAME_TIMEOUT * 2;

/**
 * Wait time for canvas rendering to stabilize (in ms)
 * Used for audio/video components that need canvas rendering to complete
 */
export const CANVAS_STABILIZATION_TIMEOUT = 100;

/**
 * Wait time for state transitions in audio components (in ms)
 * Used after user interactions that change visual state.
 * Prefer event-based or ready-state waits (e.g. AudioView.waitForCanvasStable(),
 * AudioView.isReady()) over fixed cy.wait() to reduce flakiness.
 */
export const AUDIO_STATE_TRANSITION_TIMEOUT = 50;
