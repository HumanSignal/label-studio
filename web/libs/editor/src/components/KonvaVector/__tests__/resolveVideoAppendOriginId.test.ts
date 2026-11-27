import { describe, expect, it } from "bun:test";
import { isEndpointVertexId, resolveVideoAppendOriginId } from "../utils";

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

describe("isEndpointVertexId (BROS-1432)", () => {
  const points = makeChain();

  it("treats the head (no prevPointId) as an endpoint", () => {
    expect(isEndpointVertexId(points, "A")).toBe(true);
  });

  it("treats the tail (not referenced by any prevPointId) as an endpoint", () => {
    expect(isEndpointVertexId(points, "D")).toBe(true);
  });

  it("does not treat a mid-chain point as an endpoint", () => {
    expect(isEndpointVertexId(points, "B")).toBe(false);
    expect(isEndpointVertexId(points, "C")).toBe(false);
  });

  it("returns false for an unknown id", () => {
    expect(isEndpointVertexId(points, "missing")).toBe(false);
  });
});

describe("resolveVideoAppendOriginId (BROS-1432)", () => {
  const points = makeChain();

  it("resumes from the selected head endpoint so the segment matches the preview", () => {
    expect(resolveVideoAppendOriginId(points, "A")).toBe("A");
  });

  it("resumes from the selected tail endpoint", () => {
    expect(resolveVideoAppendOriginId(points, "D")).toBe("D");
  });

  it("falls back to the last vertex when nothing is selected (rapid free-draw)", () => {
    expect(resolveVideoAppendOriginId(points, null)).toBe("D");
    expect(resolveVideoAppendOriginId(points, undefined)).toBe("D");
  });

  it("ignores a selected mid-chain point and extends from the last vertex (non-skeleton)", () => {
    expect(resolveVideoAppendOriginId(points, "B")).toBe("D");
  });

  it("ignores a stale id that no longer exists and extends from the last vertex", () => {
    expect(resolveVideoAppendOriginId(points, "gone")).toBe("D");
    expect(resolveVideoAppendOriginId(points, "gone", true)).toBe("D");
  });

  it("returns undefined for an empty path (first point has no origin)", () => {
    expect(resolveVideoAppendOriginId([], "A")).toBeUndefined();
    expect(resolveVideoAppendOriginId([], null)).toBeUndefined();
  });

  describe("skeleton mode — any selected node can start a branch", () => {
    it("resumes from a selected mid-chain node", () => {
      expect(resolveVideoAppendOriginId(points, "B", true)).toBe("B");
      expect(resolveVideoAppendOriginId(points, "C", true)).toBe("C");
    });

    it("still resumes from selected endpoints", () => {
      expect(resolveVideoAppendOriginId(points, "A", true)).toBe("A");
      expect(resolveVideoAppendOriginId(points, "D", true)).toBe("D");
    });

    it("falls back to the last vertex when nothing is selected", () => {
      expect(resolveVideoAppendOriginId(points, null, true)).toBe("D");
    });
  });
});
