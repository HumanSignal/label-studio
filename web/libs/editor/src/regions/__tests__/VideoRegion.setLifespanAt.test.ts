/**
 * Unit tests for VideoRegion.setLifespanAt (regions/VideoRegion.js).
 *
 * The real VideoRegion composes AreaMixin / RegionsMixin / AnnotationMixin
 * and holds a typed reference to VideoModel, which makes direct
 * instantiation in a unit test disproportionately complex. Instead we
 * replicate the Model's sequence-shape + action on a bare MST model so
 * we can assert the contract: `setLifespanAt(frame, enabled)` inserts or
 * replaces exactly one keypoint while preserving sort order and sibling
 * fields.
 *
 * Any change to the real action body in VideoRegion.js should mirror here.
 */

import { types } from "mobx-state-tree";

type Keypoint = { frame: number; enabled: boolean; [k: string]: unknown };

// Keep these in sync with regions/VideoRegion.js#Model.setLifespanAt
const TestModel = types
  .model("VideoRegionSetLifespanTest", {
    sequence: types.frozen<Keypoint[]>([]),
  })
  .actions((self) => ({
    setLifespanAt(frame: number, enabled: boolean) {
      const existingIndex = self.sequence.findIndex((k) => k.frame === frame);
      const keypoint: Keypoint = { frame, enabled };
      if (existingIndex >= 0) {
        self.sequence = [
          ...self.sequence.slice(0, existingIndex),
          { ...self.sequence[existingIndex], ...keypoint },
          ...self.sequence.slice(existingIndex + 1),
        ];
      } else {
        self.sequence = [...self.sequence, keypoint].sort((a, b) => a.frame - b.frame);
      }
    },
  }));

describe("VideoRegion.setLifespanAt", () => {
  it("inserts a new keypoint into an empty sequence", () => {
    const m = TestModel.create({ sequence: [] });
    m.setLifespanAt(5, false);
    expect(m.sequence).toEqual([{ frame: 5, enabled: false }]);
  });

  it("replaces the `enabled` flag on an existing keypoint at the same frame", () => {
    const m = TestModel.create({
      sequence: [{ frame: 10, x: 1, y: 2, enabled: true }],
    });
    m.setLifespanAt(10, false);
    expect(m.sequence).toHaveLength(1);
    // Preserves sibling shape fields that `updateShape` populated earlier.
    expect(m.sequence[0]).toEqual({ frame: 10, x: 1, y: 2, enabled: false });
  });

  it("keeps keypoints sorted by frame after insert", () => {
    const m = TestModel.create({
      sequence: [
        { frame: 1, enabled: true },
        { frame: 10, enabled: true },
      ],
    });
    m.setLifespanAt(5, false);
    const frames = m.sequence.map((k: Keypoint) => k.frame);
    expect(frames).toEqual([1, 5, 10]);
  });

  it("does not mutate the input sequence array reference", () => {
    const initial = [{ frame: 1, enabled: true }];
    const m = TestModel.create({ sequence: initial });
    m.setLifespanAt(2, false);
    // Frozen input stays intact; MST replaced the entire array.
    expect(initial).toEqual([{ frame: 1, enabled: true }]);
    expect(m.sequence).not.toBe(initial);
  });

  it("is idempotent when called twice with the same args", () => {
    const m = TestModel.create({
      sequence: [{ frame: 7, x: 0, y: 0, enabled: true }],
    });
    m.setLifespanAt(7, false);
    const afterFirst = m.sequence.map((k: any) => ({ ...k }));
    m.setLifespanAt(7, false);
    expect(m.sequence).toEqual(afterFirst);
  });
});
