/**
 * Pure helpers that decide when a user is repeatedly trying to page through the horizontal
 * annotations carousel (the signal behind the "switch to vertical panel" nudge).
 *
 * Intent comes only from deliberate input (chevron clicks, wheel / trackpad gestures), never
 * from scroll offsets, which also change programmatically (scroll-to-selected, snap-to-start).
 */

/** How many navigation intents inside {@link NAVIGATION_INTENT_WINDOW_MS} count as "repeated". */
export const NAVIGATION_INTENT_COUNT = 2;
export const NAVIGATION_INTENT_WINDOW_MS = 10_000;

/**
 * Accumulated wheel travel (CSS px) before a gesture counts as intent. One mouse-wheel notch is
 * ~100px in Chromium and 3 lines (48px after normalisation) in Firefox; a brush of the trackpad is
 * far less.
 */
export const WHEEL_INTENT_MIN_DELTA = 40;
/** A pause between wheel events longer than this starts a new gesture (trackpad momentum stays inside one). */
export const WHEEL_GESTURE_GAP_MS = 250;

const WHEEL_LINE_HEIGHT_PX = 16;
const WHEEL_PAGE_HEIGHT_PX = 400;
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;

export type NavigationIntentSource = "chevron" | "wheel";

export interface NavigationIntentDetectorOptions {
  count?: number;
  windowMs?: number;
}

export interface NavigationIntentDetector {
  /** Records an intent at `now` and returns true when `count` intents fall within `windowMs` (inclusive). */
  record(now?: number): boolean;
  reset(): void;
}

export function createNavigationIntentDetector({
  count = NAVIGATION_INTENT_COUNT,
  windowMs = NAVIGATION_INTENT_WINDOW_MS,
}: NavigationIntentDetectorOptions = {}): NavigationIntentDetector {
  let timestamps: number[] = [];

  return {
    record(now = Date.now()) {
      timestamps = [...timestamps.filter((t) => now - t <= windowMs), now];
      return timestamps.length >= count;
    },
    reset() {
      timestamps = [];
    },
  };
}

type WheelLike = Pick<WheelEvent, "deltaX" | "deltaY" | "deltaMode" | "ctrlKey">;

export interface WheelIntentTracker {
  /** Returns true once per gesture, when the gesture's accumulated travel reaches the minimum. */
  record(event: WheelLike, now?: number): boolean;
}

export function createWheelIntentTracker({
  minDelta = WHEEL_INTENT_MIN_DELTA,
  gestureGapMs = WHEEL_GESTURE_GAP_MS,
}: {
  minDelta?: number;
  gestureGapMs?: number;
} = {}): WheelIntentTracker {
  let lastEventAt = Number.NEGATIVE_INFINITY;
  let accumulated = 0;
  let fired = false;

  return {
    record(event, now = Date.now()) {
      // Pinch-to-zoom is reported as ctrl+wheel and is not navigation.
      if (event.ctrlKey) return false;

      if (now - lastEventAt > gestureGapMs) {
        accumulated = 0;
        fired = false;
      }
      lastEventAt = now;

      const unit =
        event.deltaMode === DOM_DELTA_LINE
          ? WHEEL_LINE_HEIGHT_PX
          : event.deltaMode === DOM_DELTA_PAGE
            ? WHEEL_PAGE_HEIGHT_PX
            : 1;
      accumulated += Math.hypot(event.deltaX, event.deltaY) * unit;

      if (fired || accumulated < minDelta) return false;
      fired = true;
      return true;
    },
  };
}
