import { getInteractiveContextResult } from "./interactive-context";

const smartRectangle = {
  type: "rectangleregion",
  results: [{ from_name: { name: "box_target" }, to_name: { name: "image" } }],
};

describe("getInteractiveContextResult", () => {
  it("includes every current rectangle for the smart rectangle control", () => {
    const firstBox = {
      id: "first",
      type: "rectanglelabels",
      from_name: "box_target",
      to_name: "image",
    };
    const secondBox = {
      id: "second",
      type: "rectanglelabels",
      from_name: "box_target",
      to_name: "image",
    };

    const result = getInteractiveContextResult(
      [firstBox, secondBox],
      smartRectangle,
      [{ cleanId: secondBox.id }],
    );

    expect(result).toEqual([firstBox, secondBox]);
  });

  it("excludes deleted and unrelated results from the smart rectangle context", () => {
    const currentBox = {
      id: "current",
      type: "rectanglelabels",
      from_name: "box_target",
      to_name: "image",
    };
    const otherControlBox = {
      id: "other-control",
      type: "rectanglelabels",
      from_name: "other_box_target",
      to_name: "image",
    };
    const brushResult = {
      id: "brush",
      type: "brushlabels",
      from_name: "brush_target",
      to_name: "image",
    };

    const result = getInteractiveContextResult(
      [currentBox, otherControlBox, brushResult],
      smartRectangle,
      [{ cleanId: currentBox.id }],
    );

    expect(result).toEqual([currentBox]);
  });

  it("includes the event region before annotation serialization catches up", () => {
    const currentBox = {
      id: "current",
      type: "rectanglelabels",
      from_name: "box_target",
      to_name: "image",
    };
    const region = {
      ...smartRectangle,
      serialize: () => currentBox,
    };

    const result = getInteractiveContextResult([], region, [{ cleanId: "current" }]);

    expect(result).toEqual([currentBox]);
  });

  it("preserves group-based behavior for non-rectangle smart regions", () => {
    const point = { id: "point", type: "keypointlabels" };
    const unrelatedPoint = { id: "other-point", type: "keypointlabels" };

    const result = getInteractiveContextResult(
      [point, unrelatedPoint],
      { type: "keypointregion", results: [{}] },
      [{ cleanId: point.id }],
    );

    expect(result).toEqual([point]);
  });
});