import { describe, expect, it } from "bun:test";
import { linearizeOpenVectorPath } from "../utils";

type V = { id: string; x: number; y: number; prevPointId?: string | null };

// Open polyline A -> B -> C -> D via prevPointId (A head, D tail).
function makeChain(): V[] {
  return [
    { id: "A", x: 0, y: 0, prevPointId: undefined },
    { id: "B", x: 10, y: 0, prevPointId: "A" },
    { id: "C", x: 20, y: 0, prevPointId: "B" },
    { id: "D", x: 30, y: 0, prevPointId: "C" },
  ];
}

// Asserts a clean head→tail chain: head has no prev, every other vertex references its predecessor.
function expectLinearChain(points: V[]) {
  expect(points[0].prevPointId == null).toBe(true);
  for (let i = 1; i < points.length; i++) {
    expect(points[i].prevPointId).toBe(points[i - 1].id);
  }
  // Exactly two endpoints (head + tail) under the prevPointId topology.
  const endpoints = points.filter((p) => {
    const isHead = !p.prevPointId;
    const isTail = !points.some((o) => o.prevPointId === p.id);
    return isHead || isTail;
  });
  expect(endpoints.length).toBe(2);
}

describe("linearizeOpenVectorPath (BROS-1439)", () => {
  it("rebuilds a clean chain after resuming drawing from the first vertex", () => {
    // Repro: A,B,C,D drawn, then resume from head A and append E, F.
    // appendVertex tacks them on the end pointing back at the head → fork: A has children B and E.
    const forked: V[] = [
      { id: "A", x: 0, y: 0, prevPointId: undefined },
      { id: "B", x: 10, y: 0, prevPointId: "A" },
      { id: "C", x: 20, y: 0, prevPointId: "B" },
      { id: "D", x: 30, y: 0, prevPointId: "C" },
      { id: "E", x: -10, y: 0, prevPointId: "A" },
      { id: "F", x: -20, y: 0, prevPointId: "E" },
    ];

    const result = linearizeOpenVectorPath(forked, "F");

    expect(result.map((p) => p.id)).toEqual(["D", "C", "B", "A", "E", "F"]);
    expectLinearChain(result);
    // Freshly appended vertex ends up last so drawing keeps continuing from it.
    expect(result[result.length - 1].id).toBe("F");
  });

  it("places the just-appended vertex (tailId) last", () => {
    // Same fork, but pretend D was the most recent point → D should be the tail.
    const forked: V[] = [
      { id: "A", x: 0, y: 0, prevPointId: undefined },
      { id: "B", x: 10, y: 0, prevPointId: "A" },
      { id: "E", x: -10, y: 0, prevPointId: "A" },
      { id: "D", x: 30, y: 0, prevPointId: "B" },
    ];
    const result = linearizeOpenVectorPath(forked, "D");
    expect(result[result.length - 1].id).toBe("D");
    expectLinearChain(result);
  });

  it("is a no-op for an already-linear chain", () => {
    const chain = makeChain();
    const result = linearizeOpenVectorPath(chain, "D");
    expect(result.map((p) => p.id)).toEqual(["A", "B", "C", "D"]);
    expectLinearChain(result);
  });

  it("leaves a closed cycle untouched (no endpoints)", () => {
    const closed: V[] = [
      { id: "A", x: 0, y: 0, prevPointId: "D" },
      { id: "B", x: 10, y: 0, prevPointId: "A" },
      { id: "C", x: 20, y: 0, prevPointId: "B" },
      { id: "D", x: 30, y: 0, prevPointId: "C" },
    ];
    const result = linearizeOpenVectorPath(closed, "D");
    expect(result).toBe(closed);
  });

  it("leaves a real branch (3 endpoints / skeleton) untouched", () => {
    // A is a branch node with three arms → not a simple path.
    const branched: V[] = [
      { id: "A", x: 0, y: 0, prevPointId: undefined },
      { id: "B", x: 10, y: 0, prevPointId: "A" },
      { id: "C", x: -10, y: 0, prevPointId: "A" },
      { id: "D", x: 0, y: 10, prevPointId: "A" },
    ];
    const result = linearizeOpenVectorPath(branched, "D");
    expect(result).toBe(branched);
  });

  it("returns paths shorter than 3 vertices unchanged", () => {
    const two: V[] = [
      { id: "A", x: 0, y: 0, prevPointId: undefined },
      { id: "B", x: 10, y: 0, prevPointId: "A" },
    ];
    expect(linearizeOpenVectorPath(two, "B")).toBe(two);
  });
});
