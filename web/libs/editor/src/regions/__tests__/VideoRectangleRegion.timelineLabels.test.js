/**
 * Unit tests for the states the Video tag passes to new shapes.
 * A shape drawn while a TimelineLabels label is selected must not get a `timelinelabels` result.
 *
 * This file needs the real VideoModel. In the ordered run it must stay before
 * VideoVectorRegion.test.js, which replaces the Video module with a mock.
 */
import { destroy, types } from "mobx-state-tree";

describe("Video shape regions", () => {
  let TestRoot;
  let root;
  let annotation;

  const rectangleControl = { name: "box", type: "videorectangle" };
  const vectorControl = { name: "vector", type: "videovector" };
  const timelineLabels = {
    name: "frame_range",
    type: "timelinelabels",
    isSelected: true,
    valueType: "timelinelabels",
    selectedValues: () => ["motion"],
  };
  const labels = { name: "videoLabels", type: "labels", isSelected: true };

  beforeAll(() => {
    const { VideoModel } = require("../../tags/object/Video/Video");

    TestRoot = types
      .model("TestRoot", {
        video: types.optional(VideoModel, { id: "vid1", name: "vid1" }),
      })
      .volatile(() => ({
        annotationStore: null,
      }))
      .actions((self) => ({
        setAnnotationStore(store) {
          self.annotationStore = store;
        },
      }));
  });

  beforeEach(() => {
    annotation = {
      toNames: new Map([["vid1", [rectangleControl, vectorControl, timelineLabels, labels]]]),
      createResult: jest.fn(() => ({})),
    };
    root = TestRoot.create({ video: { id: "vid1", name: "vid1" } });
    root.setAnnotationStore({ selected: annotation, selectedHistory: annotation });
  });

  afterEach(() => {
    if (root) destroy(root);
  });

  it("does not pass selected TimelineLabels to a new VideoRectangle region", () => {
    root.video.addVideoRegion({ x: 10, y: 10, width: 20, height: 20 });

    expect(annotation.createResult).toHaveBeenCalledTimes(1);
    const [, , control, , , additionalStates] = annotation.createResult.mock.calls[0];

    expect(control).toBe(rectangleControl);
    expect(additionalStates).toEqual([labels]);
  });

  it("does not pass selected TimelineLabels to a new VideoVector region", () => {
    root.video.addVideoVectorRegion({ points: [] });

    expect(annotation.createResult).toHaveBeenCalledTimes(1);
    const [, , control, , , additionalStates] = annotation.createResult.mock.calls[0];

    expect(control).toBe(vectorControl);
    expect(additionalStates).toEqual([labels]);
  });

  it("still labels a new timeline region with the selected TimelineLabels", () => {
    root.video.addTimelineRegion({ frame: 5 });

    expect(annotation.createResult).toHaveBeenCalledTimes(1);
    const [value, labeling, control, , , additionalStates] = annotation.createResult.mock.calls[0];

    expect(value).toEqual({ ranges: [{ start: 5, end: 5 }] });
    expect(labeling).toEqual({ timelinelabels: ["motion"] });
    expect(control).toBe(timelineLabels);
    expect(additionalStates).toEqual([labels]);
  });
});
