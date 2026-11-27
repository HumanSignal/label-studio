import {
  backendFrameToDisplayFrame,
  finalizeTrackSequence,
  getTrackLifespanCutoffs,
  isShapeBearingKeyframe,
  isValidTrackKeyframe,
} from "../trackFinalize";

const closedTriangle = (frame: number) => ({
  frame,
  enabled: true,
  closed: true,
  vertices: [
    { id: "a", x: 10, y: 10 },
    { id: "b", x: 20, y: 20 },
    { id: "c", x: 30, y: 10 },
  ],
});

const malformedOpen = (frame: number) => ({
  frame,
  enabled: true,
  closed: false,
  vertices: [{ id: "a", x: 1, y: 2 }],
});

describe("backendFrameToDisplayFrame (BROS-1513)", () => {
  it("maps backend timestamps into one-based display frames", () => {
    expect(backendFrameToDisplayFrame({ frame: 99, time_ms: 150 }, 30)).toBe(6);
  });

  it("falls back to the backend frame for older responses", () => {
    expect(backendFrameToDisplayFrame({ frame: 4 }, 30)).toBe(5);
  });

  it("clamps rounded timestamps to the first display frame", () => {
    expect(backendFrameToDisplayFrame({ frame: 0, time_ms: -20 }, 30)).toBe(1);
  });
});

describe("isShapeBearingKeyframe", () => {
  it("rejects lifespan terminators without vertices", () => {
    expect(isShapeBearingKeyframe({ frame: 4, enabled: false })).toBe(false);
  });

  it("accepts keyframes with vertices", () => {
    expect(isShapeBearingKeyframe(closedTriangle(5))).toBe(true);
  });
});

describe("isValidTrackKeyframe", () => {
  const constraints = { closable: true, minPoints: 2 };

  it("requires minPoints and closed when closable", () => {
    expect(isValidTrackKeyframe(malformedOpen(5), constraints)).toBe(false);
    expect(isValidTrackKeyframe(closedTriangle(5), constraints)).toBe(true);
  });

  it("rejects empty vertex lists", () => {
    expect(isValidTrackKeyframe({ frame: 1, enabled: true, closed: true, vertices: [] }, constraints)).toBe(false);
  });
});

describe("finalizeTrackSequence (BROS-1511)", () => {
  const constraints = { closable: true, minPoints: 2 };

  it("prunes malformed earliest backward keyframe and keeps valid prompt frame", () => {
    const result = finalizeTrackSequence(
      [{ frame: 4, enabled: false }, malformedOpen(5), closedTriangle(50)],
      constraints,
    );

    expect(result.shouldDelete).toBe(false);
    expect(result.retained.map((k) => k.frame)).toEqual([50]);
    expect(result.firstValidFrame).toBe(50);
    expect(result.lastValidFrame).toBe(50);
  });

  it("keeps multiple valid frames from a cancelled both-direction run", () => {
    const result = finalizeTrackSequence(
      [malformedOpen(3), closedTriangle(10), closedTriangle(20), { frame: 21, enabled: false }],
      constraints,
    );

    expect(result.retained.map((k) => k.frame)).toEqual([10, 20]);
    expect(result.firstValidFrame).toBe(10);
    expect(result.lastValidFrame).toBe(20);
  });

  it("marks shouldDelete when cancellation leaves no valid shape", () => {
    const result = finalizeTrackSequence([malformedOpen(5), { frame: 4, enabled: false }], constraints);

    expect(result.shouldDelete).toBe(true);
    expect(result.retained).toEqual([]);
  });

  it("before first batch: only prompt frame remains when it is valid", () => {
    const result = finalizeTrackSequence([closedTriangle(12)], constraints);

    expect(result.shouldDelete).toBe(false);
    expect(result.retained).toHaveLength(1);
    expect(result.firstValidFrame).toBe(12);
  });

  it("prunes all invalid geometric keyframes", () => {
    const result = finalizeTrackSequence([malformedOpen(1), closedTriangle(2), malformedOpen(3)], constraints);

    expect(result.retained.map((k) => k.frame)).toEqual([2]);
  });
});

describe("getTrackLifespanCutoffs", () => {
  it.each([
    ["forward", { right: 9 }],
    ["backward", { left: 2 }],
    ["both", { left: 2, right: 9 }],
  ] as const)("returns caps outside retained bounds for %s", (direction, expected) => {
    expect(getTrackLifespanCutoffs(direction, 3, 8, 10)).toEqual(expected);
  });

  it("omits caps at video edges", () => {
    expect(getTrackLifespanCutoffs("both", 1, 10, 10)).toEqual({});
  });
});
