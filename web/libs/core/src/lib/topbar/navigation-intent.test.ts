import {
  NAVIGATION_INTENT_COUNT,
  NAVIGATION_INTENT_WINDOW_MS,
  WHEEL_GESTURE_GAP_MS,
  WHEEL_INTENT_MIN_DELTA,
  createNavigationIntentDetector,
  createWheelIntentTracker,
} from "./navigation-intent";

describe("createNavigationIntentDetector", () => {
  const T0 = 1_000_000;

  it("does not trigger below the intent count (N-1)", () => {
    const detector = createNavigationIntentDetector();
    let triggered = false;
    for (let i = 0; i < NAVIGATION_INTENT_COUNT - 1; i++) {
      triggered = detector.record(T0 + i);
    }
    expect(triggered).toBe(false);
  });

  it("triggers on the Nth intent inside the window", () => {
    const detector = createNavigationIntentDetector();
    expect(detector.record(T0)).toBe(false);
    expect(detector.record(T0 + NAVIGATION_INTENT_WINDOW_MS - 1)).toBe(true);
  });

  it("counts intents exactly one window apart as inside the window", () => {
    const detector = createNavigationIntentDetector();
    detector.record(T0);
    expect(detector.record(T0 + NAVIGATION_INTENT_WINDOW_MS)).toBe(true);
  });

  it("does not trigger when N intents are spread outside the window", () => {
    const detector = createNavigationIntentDetector();
    detector.record(T0);
    expect(detector.record(T0 + NAVIGATION_INTENT_WINDOW_MS + 1)).toBe(false);
  });

  it("slides the window: an old intent expires but later ones still count", () => {
    const detector = createNavigationIntentDetector();
    detector.record(T0);
    detector.record(T0 + NAVIGATION_INTENT_WINDOW_MS + 1); // expired the first, now holds 1
    expect(detector.record(T0 + NAVIGATION_INTENT_WINDOW_MS + 2)).toBe(true);
  });

  it("honours custom count and window", () => {
    const detector = createNavigationIntentDetector({ count: 3, windowMs: 100 });
    expect(detector.record(0)).toBe(false);
    expect(detector.record(50)).toBe(false);
    expect(detector.record(100)).toBe(true);
  });

  it("forgets recorded intents after reset", () => {
    const detector = createNavigationIntentDetector();
    detector.record(T0);
    detector.reset();
    expect(detector.record(T0 + 1)).toBe(false);
  });
});

describe("createWheelIntentTracker", () => {
  const T0 = 5_000;
  const wheel = (deltaX: number, deltaY: number, extra: { deltaMode?: number; ctrlKey?: boolean } = {}) => ({
    deltaX,
    deltaY,
    deltaMode: 0,
    ctrlKey: false,
    ...extra,
  });

  it("ignores a tiny accidental nudge below the minimum delta", () => {
    const tracker = createWheelIntentTracker();
    expect(tracker.record(wheel(0, WHEEL_INTENT_MIN_DELTA - 1), T0)).toBe(false);
  });

  it("fires once a single event reaches the minimum delta (mouse wheel notch)", () => {
    const tracker = createWheelIntentTracker();
    expect(tracker.record(wheel(0, WHEEL_INTENT_MIN_DELTA), T0)).toBe(true);
  });

  it("accumulates many small trackpad events and fires exactly once per gesture", () => {
    const tracker = createWheelIntentTracker();
    const fired: boolean[] = [];
    for (let i = 0; i < 20; i++) {
      fired.push(tracker.record(wheel(10, 0), T0 + i * 16));
    }
    expect(fired.filter(Boolean)).toHaveLength(1);
  });

  it("treats a pause longer than the gesture gap as a new gesture", () => {
    const tracker = createWheelIntentTracker();
    expect(tracker.record(wheel(WHEEL_INTENT_MIN_DELTA, 0), T0)).toBe(true);
    expect(tracker.record(wheel(WHEEL_INTENT_MIN_DELTA, 0), T0 + WHEEL_GESTURE_GAP_MS + 1)).toBe(true);
  });

  it("keeps momentum events within the gap in the same (already fired) gesture", () => {
    const tracker = createWheelIntentTracker();
    expect(tracker.record(wheel(WHEEL_INTENT_MIN_DELTA, 0), T0)).toBe(true);
    expect(tracker.record(wheel(WHEEL_INTENT_MIN_DELTA, 0), T0 + WHEEL_GESTURE_GAP_MS - 1)).toBe(false);
  });

  it("counts horizontal and vertical deltas alike", () => {
    expect(createWheelIntentTracker().record(wheel(WHEEL_INTENT_MIN_DELTA, 0), T0)).toBe(true);
    expect(createWheelIntentTracker().record(wheel(0, WHEEL_INTENT_MIN_DELTA), T0)).toBe(true);
  });

  it("ignores pinch-zoom wheel events (ctrlKey)", () => {
    const tracker = createWheelIntentTracker();
    expect(tracker.record(wheel(0, WHEEL_INTENT_MIN_DELTA * 5, { ctrlKey: true }), T0)).toBe(false);
  });

  it("normalises line-based deltas (Firefox mouse wheel)", () => {
    const tracker = createWheelIntentTracker();
    // 3 lines per notch in Firefox; must still count as intent
    expect(tracker.record(wheel(0, 3, { deltaMode: 1 }), T0)).toBe(true);
  });
});
