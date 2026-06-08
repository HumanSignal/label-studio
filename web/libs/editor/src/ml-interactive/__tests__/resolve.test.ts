/**
 * Unit tests for resolveActiveBinding (ml-interactive/resolve.ts).
 *
 * The resolver picks one (control, binding) pair from the annotation
 * config using two patterns:
 *   1. self-labeled controls (RectangleLabels, VideoVectorLabels, ...)
 *   2. sibling <Labels> + drawing control (VideoRectangle + Labels)
 * and breaks multi-candidate ties via the toolbar's selected tool.
 *
 * We seed the capability store via `spyOn(interactiveCapabilityStore, "getBindings")`
 * so the tests don't have to simulate the network fetch pipeline.
 */

import { resolveActiveBinding } from "../resolve";
import { interactiveCapabilityStore } from "../store";
import type { InteractiveBinding } from "../types";

const RECT_BINDING: InteractiveBinding = {
  backendId: 1,
  controlTag: "RectangleLabels",
  output: "bbox",
  prompts: ["point", "box"],
  features: new Set(),
};
const VIDEORECT_BINDING: InteractiveBinding = {
  backendId: 1,
  controlTag: "VideoRectangle",
  output: "bbox",
  prompts: ["point", "box"],
  features: new Set(["track"]),
};
const VIDEOVECTOR_BINDING: InteractiveBinding = {
  backendId: 1,
  controlTag: "VideoVectorLabels",
  output: "polygon",
  prompts: ["point"],
  features: new Set(["track"]),
};

type MockControl = {
  type: string;
  toname?: string;
  selectedLabels?: Array<{ value: string }>;
  tools?: Record<string, { selected: boolean }>;
  isSeparated?: boolean;
};

/** Build an annotation stub whose `names` map exposes .values() like MST does. */
function makeAnnotation(controls: MockControl[]) {
  return { names: new Map(controls.map((c, i) => [`c${i}`, c])) };
}

let getBindingsSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  getBindingsSpy = spyOn(interactiveCapabilityStore, "getBindings");
});

afterEach(() => {
  getBindingsSpy.mockRestore();
});

describe("resolveActiveBinding — early exits", () => {
  it("returns null when projectId is null", () => {
    getBindingsSpy.mockReturnValue([RECT_BINDING]);
    expect(resolveActiveBinding(makeAnnotation([]), null)).toBeNull();
  });

  it("returns null when annotation is null", () => {
    getBindingsSpy.mockReturnValue([RECT_BINDING]);
    expect(resolveActiveBinding(null, 1)).toBeNull();
  });

  it("returns null when the capability store has no bindings", () => {
    getBindingsSpy.mockReturnValue([]);
    const annotation = makeAnnotation([{ type: "rectanglelabels", toname: "img", selectedLabels: [{ value: "Car" }] }]);
    expect(resolveActiveBinding(annotation, 1)).toBeNull();
  });

  it("returns null when no control has a selected label", () => {
    getBindingsSpy.mockReturnValue([RECT_BINDING]);
    const annotation = makeAnnotation([{ type: "rectanglelabels", toname: "img", selectedLabels: [] }]);
    expect(resolveActiveBinding(annotation, 1)).toBeNull();
  });
});

describe("resolveActiveBinding — Pattern 1 (self-labeled control)", () => {
  it("picks a RectangleLabels control with a selected label", () => {
    getBindingsSpy.mockReturnValue([RECT_BINDING]);
    const rect: MockControl = {
      type: "rectanglelabels",
      toname: "img",
      selectedLabels: [{ value: "Car" }],
    };
    const resolved = resolveActiveBinding(makeAnnotation([rect]), 1);
    expect(resolved).not.toBeNull();
    expect(resolved?.control).toBe(rect);
    expect(resolved?.binding).toBe(RECT_BINDING);
    expect(resolved?.labelSource).toBeUndefined();
  });

  it("breaks multi-candidate ties using the currently-selected tool", () => {
    getBindingsSpy.mockReturnValue([RECT_BINDING, VIDEOVECTOR_BINDING]);

    // Same-object annotation with both a rectangle and a vector-labels control,
    // both carrying a selected label. Only the vector one has an active tool.
    const rect: MockControl = {
      type: "rectanglelabels",
      toname: "img",
      selectedLabels: [{ value: "Car" }],
      tools: { rectangle: { selected: false } },
    };
    const vector: MockControl = {
      type: "videovectorlabels",
      toname: "img",
      selectedLabels: [{ value: "Car" }],
      tools: { vector: { selected: true } },
    };

    const resolved = resolveActiveBinding(makeAnnotation([rect, vector]), 1);
    expect(resolved?.control).toBe(vector);
  });

  it("falls back to the first candidate when no tool is marked selected", () => {
    getBindingsSpy.mockReturnValue([RECT_BINDING, VIDEOVECTOR_BINDING]);
    const rect: MockControl = {
      type: "rectanglelabels",
      toname: "img",
      selectedLabels: [{ value: "Car" }],
    };
    const vector: MockControl = {
      type: "videovectorlabels",
      toname: "img",
      selectedLabels: [{ value: "Car" }],
    };
    const resolved = resolveActiveBinding(makeAnnotation([rect, vector]), 1);
    expect(resolved?.control).toBe(rect);
  });

  it("honors `restrictToObjectName` and skips controls on other objects", () => {
    getBindingsSpy.mockReturnValue([RECT_BINDING]);
    const rectOnA: MockControl = {
      type: "rectanglelabels",
      toname: "imgA",
      selectedLabels: [{ value: "Car" }],
    };
    const rectOnB: MockControl = {
      type: "rectanglelabels",
      toname: "imgB",
      selectedLabels: [{ value: "Car" }],
    };
    const resolved = resolveActiveBinding(makeAnnotation([rectOnA, rectOnB]), 1, "imgB");
    expect(resolved?.control).toBe(rectOnB);
  });
});

describe("resolveActiveBinding — Pattern 2 (sibling <Labels>)", () => {
  it("pairs an external <Labels> tag with a compatible drawing control", () => {
    getBindingsSpy.mockReturnValue([VIDEORECT_BINDING]);
    const labels: MockControl = {
      type: "labels",
      toname: "video",
      selectedLabels: [{ value: "Car" }],
    };
    const videoRect: MockControl = {
      type: "videorectangle",
      toname: "video",
      // no selectedLabels of its own — labels come from the sibling
    };
    const resolved = resolveActiveBinding(makeAnnotation([labels, videoRect]), 1);
    expect(resolved?.control).toBe(videoRect);
    expect(resolved?.labelSource).toBe(labels);
  });

  it("excludes self-labeled controls from the <Labels>-driven candidates", () => {
    // VideoVectorLabels ends with "Labels" and carries its own selection —
    // Pattern 2 should ignore it even when a <Labels> sibling is present.
    getBindingsSpy.mockReturnValue([VIDEORECT_BINDING, VIDEOVECTOR_BINDING]);
    const labels: MockControl = {
      type: "labels",
      toname: "video",
      selectedLabels: [{ value: "Car" }],
    };
    const videoRect: MockControl = {
      type: "videorectangle",
      toname: "video",
    };
    const videoVec: MockControl = {
      type: "videovectorlabels",
      toname: "video",
      // no selected label, so Pattern 1 can't pick it either
      selectedLabels: [],
    };
    const resolved = resolveActiveBinding(makeAnnotation([labels, videoRect, videoVec]), 1);
    expect(resolved?.control).toBe(videoRect);
  });

  it("skips drawing controls that target a different object than the <Labels>", () => {
    getBindingsSpy.mockReturnValue([VIDEORECT_BINDING]);
    const labels: MockControl = {
      type: "labels",
      toname: "videoA",
      selectedLabels: [{ value: "Car" }],
    };
    const videoRectB: MockControl = {
      type: "videorectangle",
      toname: "videoB",
    };
    const resolved = resolveActiveBinding(makeAnnotation([labels, videoRectB]), 1);
    expect(resolved).toBeNull();
  });

  it("pairs an external <Labels> with a separated <VideoVector> control", () => {
    // BROS-1232: `<VideoVector>` (separated, no labels of its own) + sibling
    // `<Labels>` must resolve to the same vector capability the backend
    // advertises as "VideoVectorLabels". The control is label-less
    // (`isSeparated`), so it belongs to Pattern 2 even though its mapped
    // capability tag ends in "Labels".
    getBindingsSpy.mockReturnValue([VIDEOVECTOR_BINDING]);
    const labels: MockControl = {
      type: "labels",
      toname: "video",
      selectedLabels: [{ value: "Human" }],
    };
    const videoVector: MockControl = {
      type: "videovector",
      toname: "video",
      isSeparated: true,
      // no selectedLabels of its own — labels come from the sibling
    };
    const resolved = resolveActiveBinding(makeAnnotation([labels, videoVector]), 1);
    expect(resolved?.control).toBe(videoVector);
    expect(resolved?.binding).toBe(VIDEOVECTOR_BINDING);
    expect(resolved?.labelSource).toBe(labels);
  });

  it("still excludes a self-labeled <VideoVectorLabels> (no isSeparated) from Pattern 2", () => {
    // The combined tag owns its labels — an external <Labels> must not drive
    // it. Without a selected label of its own, it resolves to nothing.
    getBindingsSpy.mockReturnValue([VIDEOVECTOR_BINDING]);
    const labels: MockControl = {
      type: "labels",
      toname: "video",
      selectedLabels: [{ value: "Human" }],
    };
    const videoVectorLabels: MockControl = {
      type: "videovectorlabels",
      toname: "video",
      selectedLabels: [],
    };
    const resolved = resolveActiveBinding(makeAnnotation([labels, videoVectorLabels]), 1);
    expect(resolved).toBeNull();
  });
});
