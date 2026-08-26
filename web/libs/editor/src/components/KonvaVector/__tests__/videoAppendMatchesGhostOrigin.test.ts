import { describe, expect, it } from "bun:test";
import { resolveVideoAppendOriginIdFromGhost } from "../utils";

// Open polyline A -> B -> C -> D, connectivity expressed via prevPointId (the same
// topology the renderer uses). A is the head (no prevPointId), D is the tail.
function makeChain() {
  return [
    { id: "A", x: 0, y: 0, prevPointId: undefined },
    { id: "B", x: 10, y: 0, prevPointId: "A" },
    { id: "C", x: 20, y: 0, prevPointId: "B" },
    { id: "D", x: 30, y: 0, prevPointId: "C" },
  ];
}

describe("resolveVideoAppendOriginIdFromGhost (BROS-1438)", () => {
  const points = makeChain();

  it("prefers the live ghost origin over a stale/null resume id (the reported bug)", () => {
    // The ghost line draws from the selected head A (activePointId resolved A), but the
    // append previously read only the cached resume id (null here) and wrongly connected
    // from the last vertex D. The committed segment must now follow the preview to A.
    expect(resolveVideoAppendOriginIdFromGhost(points, "A", null)).toBe("A");
  });

  it("prefers the ghost origin even when a different resume id is cached", () => {
    // Ghost points at A; a stale resume id still says D. The preview wins.
    expect(resolveVideoAppendOriginIdFromGhost(points, "A", "D")).toBe("A");
  });

  it("resumes from the selected tail endpoint", () => {
    expect(resolveVideoAppendOriginIdFromGhost(points, "D", null)).toBe("D");
  });

  it("falls back to the cached resume id when the ghost origin is unavailable", () => {
    // First click before KonvaVector's ref/state has resolved a ghost origin: the cached
    // resume id (captured via onPointSelected) still drives the append.
    expect(resolveVideoAppendOriginIdFromGhost(points, null, "A")).toBe("A");
    expect(resolveVideoAppendOriginIdFromGhost(points, undefined, "D")).toBe("D");
  });

  it("falls back to the last vertex when neither source resolves (rapid free-draw)", () => {
    expect(resolveVideoAppendOriginIdFromGhost(points, null, null)).toBe("D");
  });

  it("skeleton mode resumes from a selected mid-chain node, matching the preview", () => {
    expect(resolveVideoAppendOriginIdFromGhost(points, "B", null, true)).toBe("B");
  });

  it("non-skeleton mode ignores a mid-chain origin and extends from the last vertex", () => {
    // activePointId is only ever an endpoint in non-skeleton mode, but guard anyway:
    // a mid-chain origin is not a valid resume point, so fall back to the last vertex.
    expect(resolveVideoAppendOriginIdFromGhost(points, "B", null, false)).toBe("D");
  });

  it("returns undefined for an empty path (first point has no origin)", () => {
    expect(resolveVideoAppendOriginIdFromGhost([], "A", "A")).toBeUndefined();
  });
});
