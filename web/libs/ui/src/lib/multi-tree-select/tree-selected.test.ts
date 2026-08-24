import { filterChildrenOfSelectedParents } from "./tree-selected";

describe("filterChildrenOfSelectedParents", () => {
  it("preserves selection order instead of sorting alphabetically", () => {
    expect(filterChildrenOfSelectedParents(["zeta", "alpha", "middle"])).toEqual(["zeta", "alpha", "middle"]);
  });

  it("hides child path ids when an ancestor is selected", () => {
    expect(filterChildrenOfSelectedParents(["ws-b", "ws-a", "ws-a-p1", "ws-b-p2", "ws-c-p3"])).toEqual([
      "ws-b",
      "ws-a",
      "ws-c-p3",
    ]);
  });

  it("hides deep descendants when a mid-level ancestor is selected", () => {
    expect(filterChildrenOfSelectedParents(["root-child", "root-child-leaf", "other"])).toEqual([
      "root-child",
      "other",
    ]);
  });
});
