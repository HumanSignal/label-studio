/**
 * Unit tests for VisibilityMixin (mixins/Visibility.js)
 */
import { types } from "mobx-state-tree";
import VisibilityMixin, { isNodeVisibleForItem } from "../Visibility";

const WithAnnotation = types
  .model("WithAnnotation", {})
  .volatile(() => ({ annotation: null }))
  .actions((self) => ({
    setAnnotation(a) {
      self.annotation = a;
    },
  }));

// Tree required: VisibilityMixin calls getParent(self, 2), which throws if no parent at depth 2.
// getParent(node, 1) = middle, getParent(node, 2) = tree, so tree must have isVisible.
const NodeWithVisibility = types.compose(VisibilityMixin, WithAnnotation);
const Tree = types.model("Tree", {
  isVisible: types.optional(types.boolean, true),
  middle: types.model("Middle", { node: NodeWithVisibility }),
});

/** Create a tree with node; use tree.middle.node for tests so getParent(self, 2) exists. */
function createTree(nodeProps = {}, parentVisible = true) {
  return Tree.create({
    isVisible: parentVisible,
    middle: { node: nodeProps },
  });
}

function createAnnotation(overrides = {}) {
  return {
    highlightedNode: null,
    names: new Map(),
    ...overrides,
  };
}

describe("VisibilityMixin", () => {
  describe("isVisible (no visiblewhen)", () => {
    it("returns true when visiblewhen and whenchoicevalue are unset", () => {
      const tree = createTree({});
      tree.middle.node.setAnnotation(createAnnotation());
      expect(tree.middle.node.isVisible).toBe(true);
    });

    it("returns true when annotation is null (default)", () => {
      const tree = createTree({});
      expect(tree.middle.node.isVisible).toBe(true);
    });
  });

  describe("isVisible (parent visibility)", () => {
    it("returns false when getParent(self, 2).isVisible is false", () => {
      const tree = createTree({}, false);
      tree.middle.node.setAnnotation(createAnnotation());
      expect(tree.middle.node.isVisible).toBe(false);
    });
  });

  describe("isVisible (visiblewhen: no-region-selected)", () => {
    it("returns true when no region is highlighted", () => {
      const tree = createTree({ visiblewhen: "no-region-selected" });
      tree.middle.node.setAnnotation(createAnnotation({ highlightedNode: null }));
      expect(tree.middle.node.isVisible).toBe(true);
    });

    it("returns false when a region is highlighted", () => {
      const tree = createTree({ visiblewhen: "no-region-selected" });
      tree.middle.node.setAnnotation(createAnnotation({ highlightedNode: {} }));
      expect(tree.middle.node.isVisible).toBe(false);
    });
  });

  describe("isVisible (visiblewhen: region-selected)", () => {
    it("returns false when no highlightedNode", () => {
      const tree = createTree({ visiblewhen: "region-selected" });
      tree.middle.node.setAnnotation(createAnnotation({ highlightedNode: null }));
      expect(tree.middle.node.isVisible).toBe(false);
    });

    it("returns false when tagName does not match area.from_name", () => {
      const tree = createTree({
        visiblewhen: "region-selected",
        whentagname: "other-tag",
      });
      tree.middle.node.setAnnotation(
        createAnnotation({
          highlightedNode: {
            labeling: { from_name: { name: "my-tag" } },
          },
        }),
      );
      expect(tree.middle.node.isVisible).toBe(false);
    });

    it("returns true when no tagName and area exists", () => {
      const tree = createTree({ visiblewhen: "region-selected" });
      tree.middle.node.setAnnotation(
        createAnnotation({
          highlightedNode: { labeling: {} },
        }),
      );
      expect(tree.middle.node.isVisible).toBe(true);
    });

    it("returns true when tagName matches and no labelValue", () => {
      const tree = createTree({
        visiblewhen: "region-selected",
        whentagname: "my-tag",
      });
      tree.middle.node.setAnnotation(
        createAnnotation({
          highlightedNode: {
            labeling: { from_name: { name: "my-tag" } },
          },
        }),
      );
      expect(tree.middle.node.isVisible).toBe(true);
    });

    it("returns true when labelValue matches area label", () => {
      const tree = createTree({
        visiblewhen: "region-selected",
        whentagname: "my-tag",
        whenlabelvalue: "LabelA",
      });
      tree.middle.node.setAnnotation(
        createAnnotation({
          highlightedNode: {
            labeling: { from_name: { name: "my-tag" } },
            hasLabel: (v) => v === "LabelA",
          },
        }),
      );
      expect(tree.middle.node.isVisible).toBe(true);
    });

    it("returns false when labelValue does not match", () => {
      const tree = createTree({
        visiblewhen: "region-selected",
        whentagname: "my-tag",
        whenlabelvalue: "LabelA",
      });
      tree.middle.node.setAnnotation(
        createAnnotation({
          highlightedNode: {
            labeling: { from_name: { name: "my-tag" } },
            hasLabel: () => false,
          },
        }),
      );
      expect(tree.middle.node.isVisible).toBe(false);
    });

    it("returns true when roleValue matches area chatmessage.role", () => {
      const tree = createTree({
        visiblewhen: "region-selected",
        whentagname: "my-tag",
        whenrole: "user",
      });
      tree.middle.node.setAnnotation(
        createAnnotation({
          highlightedNode: {
            labeling: { from_name: { name: "my-tag" } },
            chatmessage: { role: "user" },
          },
        }),
      );
      expect(tree.middle.node.isVisible).toBe(true);
    });

    it("returns false when roleValue does not match", () => {
      const tree = createTree({
        visiblewhen: "region-selected",
        whentagname: "my-tag",
        whenrole: "assistant",
      });
      tree.middle.node.setAnnotation(
        createAnnotation({
          highlightedNode: {
            labeling: { from_name: { name: "my-tag" } },
            chatmessage: { role: "user" },
          },
        }),
      );
      expect(tree.middle.node.isVisible).toBe(false);
    });
  });

  describe("isVisible (visiblewhen: choice-selected)", () => {
    it("returns true when no tagName and any choices have selection", () => {
      const tree = createTree({ visiblewhen: "choice-selected" });
      tree.middle.node.setAnnotation(
        createAnnotation({
          names: new Map([
            [
              "ch",
              {
                type: "choices",
                selectedValues: () => ["A"],
              },
            ],
          ]),
        }),
      );
      expect(tree.middle.node.isVisible).toBe(true);
    });

    it("returns false when no tagName and no choices have selection", () => {
      const tree = createTree({ visiblewhen: "choice-selected" });
      tree.middle.node.setAnnotation(
        createAnnotation({
          names: new Map([["ch", { type: "choices", selectedValues: () => [] }]]),
        }),
      );
      expect(tree.middle.node.isVisible).toBe(false);
    });

    it("returns false when tag has no hasChoiceSelection and no choiceValue", () => {
      const tree = createTree({
        visiblewhen: "choice-selected",
        whentagname: "ch",
      });
      tree.middle.node.setAnnotation(
        createAnnotation({
          names: new Map([["ch", { hasChoiceSelection: undefined, selectedValues: () => [] }]]),
        }),
      );
      expect(tree.middle.node.isVisible).toBe(false);
    });

    it("returns false when tag.isVisible is false", () => {
      const tree = createTree({
        visiblewhen: "choice-selected",
        whentagname: "ch",
        whenchoicevalue: "A",
      });
      tree.middle.node.setAnnotation(
        createAnnotation({
          names: new Map([
            [
              "ch",
              {
                isVisible: false,
                hasChoiceSelection: (vals, selected) => vals.some((v) => selected.includes(v)),
                selectedValues: () => ["A"],
              },
            ],
          ]),
        }),
      );
      expect(tree.middle.node.isVisible).toBe(false);
    });

    it("returns true when tag hasChoiceSelection matches choiceValue", () => {
      const tree = createTree({
        visiblewhen: "choice-selected",
        whentagname: "ch",
        whenchoicevalue: "A",
      });
      tree.middle.node.setAnnotation(
        createAnnotation({
          names: new Map([
            [
              "ch",
              {
                isVisible: true,
                hasChoiceSelection: (vals, selected) => vals.some((v) => selected.includes(v)),
                selectedValues: () => ["A", "B"],
              },
            ],
          ]),
        }),
      );
      expect(tree.middle.node.isVisible).toBe(true);
    });
  });

  describe("isVisible (visiblewhen: choice-unselected)", () => {
    it("returns true when choice-selected would be false (no selection)", () => {
      const tree = createTree({ visiblewhen: "choice-unselected" });
      tree.middle.node.setAnnotation(
        createAnnotation({
          names: new Map([["ch", { type: "choices", selectedValues: () => [] }]]),
        }),
      );
      expect(tree.middle.node.isVisible).toBe(true);
    });

    it("returns false when choice-selected would be true", () => {
      const tree = createTree({ visiblewhen: "choice-unselected" });
      tree.middle.node.setAnnotation(
        createAnnotation({
          names: new Map([
            [
              "ch",
              {
                type: "choices",
                selectedValues: () => ["A"],
              },
            ],
          ]),
        }),
      );
      expect(tree.middle.node.isVisible).toBe(false);
    });
  });

  describe("isVisible (whenchoicevalue without visiblewhen)", () => {
    it("returns true when a choice selectedValues contains whenchoicevalue", () => {
      const tree = createTree({ whenchoicevalue: "X" });
      tree.middle.node.setAnnotation(
        createAnnotation({
          names: new Map([["ch", { selectedValues: () => ["X", "Y"] }]]),
        }),
      );
      expect(tree.middle.node.isVisible).toBe(true);
    });

    it("returns false when no choice matches whenchoicevalue", () => {
      const tree = createTree({ whenchoicevalue: "Z" });
      tree.middle.node.setAnnotation(
        createAnnotation({
          names: new Map([["ch", { selectedValues: () => ["X", "Y"] }]]),
        }),
      );
      expect(tree.middle.node.isVisible).toBe(false);
    });

    it("returns false when names have no selectedValues", () => {
      const tree = createTree({ whenchoicevalue: "X" });
      tree.middle.node.setAnnotation(
        createAnnotation({
          names: new Map([["ch", {}]]),
        }),
      );
      expect(tree.middle.node.isVisible).toBe(false);
    });
  });

  describe("isVisibleForItem (perItem gating tag)", () => {
    // perItem Choices with "A" selected on item 0 only; the current item (1) has nothing selected
    const perItemChoices = (overrides = {}) => ({
      type: "choices",
      peritem: true,
      selectedValues: () => [],
      selectedValuesForItem: (idx) => (idx === 0 ? ["A"] : []),
      selectedChoicesMatch: (a, b) => a === b,
      hasChoiceSelection: () => false,
      isVisibleForItem: () => true,
      ...overrides,
    });

    it("uses the gating choice on the given item, not the current one", () => {
      const tree = createTree({ visiblewhen: "choice-selected", whentagname: "ch", whenchoicevalue: "A" });
      tree.middle.node.setAnnotation(createAnnotation({ names: new Map([["ch", perItemChoices()]]) }));

      expect(tree.middle.node.isVisible).toBe(false);
      expect(tree.middle.node.isVisibleForItem(0)).toBe(true);
      expect(tree.middle.node.isVisibleForItem(1)).toBe(false);
    });

    it("treats any selection on the item as a match when whenchoicevalue is unset", () => {
      const tree = createTree({ visiblewhen: "choice-selected", whentagname: "ch" });
      tree.middle.node.setAnnotation(createAnnotation({ names: new Map([["ch", perItemChoices()]]) }));

      expect(tree.middle.node.isVisibleForItem(0)).toBe(true);
      expect(tree.middle.node.isVisibleForItem(2)).toBe(false);
    });

    it("inverts per item for choice-unselected", () => {
      const tree = createTree({ visiblewhen: "choice-unselected", whentagname: "ch", whenchoicevalue: "A" });
      tree.middle.node.setAnnotation(createAnnotation({ names: new Map([["ch", perItemChoices()]]) }));

      expect(tree.middle.node.isVisibleForItem(0)).toBe(false);
      expect(tree.middle.node.isVisibleForItem(1)).toBe(true);
    });

    it("is hidden when the gating tag is itself hidden on that item", () => {
      const tree = createTree({ visiblewhen: "choice-selected", whentagname: "ch", whenchoicevalue: "A" });
      const ch = perItemChoices({ isVisibleForItem: () => false });
      tree.middle.node.setAnnotation(createAnnotation({ names: new Map([["ch", ch]]) }));

      expect(tree.middle.node.isVisibleForItem(0)).toBe(false);
    });

    it("is hidden when the parent is hidden", () => {
      const tree = createTree({}, false);
      tree.middle.node.setAnnotation(createAnnotation());

      expect(tree.middle.node.isVisibleForItem(0)).toBe(false);
    });

    it("matches isVisible when the gating tag is not perItem", () => {
      const tree = createTree({ visiblewhen: "choice-selected", whentagname: "ch", whenchoicevalue: "A" });
      const ch = {
        type: "choices",
        hasChoiceSelection: (vals, selected) => vals.some((v) => selected.includes(v)),
        selectedValues: () => ["A"],
      };
      tree.middle.node.setAnnotation(createAnnotation({ names: new Map([["ch", ch]]) }));

      expect(tree.middle.node.isVisibleForItem(0)).toBe(true);
      expect(tree.middle.node.isVisibleForItem(1)).toBe(true);
    });
  });

  describe("isNodeVisibleForItem", () => {
    // Number/DateTime/Rating have no VisibilityMixin and inherit visibility from their parent View
    const Parent = types
      .model("Parent", {
        hiddenItems: types.array(types.number),
        middle: types.model("Middle", { node: types.model("Plain", {}) }),
      })
      .views((self) => ({
        isVisibleForItem(idx) {
          return !self.hiddenItems.includes(idx);
        },
      }));

    it("defers to the parent's per-item visibility for nodes without the mixin", () => {
      const tree = Parent.create({ hiddenItems: [1], middle: { node: {} } });

      expect(isNodeVisibleForItem(tree.middle.node, 0)).toBe(true);
      expect(isNodeVisibleForItem(tree.middle.node, 1)).toBe(false);
    });

    it("uses the node's own isVisibleForItem when present", () => {
      const tree = createTree({}, false);
      tree.middle.node.setAnnotation(createAnnotation());

      expect(isNodeVisibleForItem(tree.middle.node, 0)).toBe(false);
    });
  });

  describe("visiblewhen not in known keys", () => {
    it("falls through when visiblewhen is unknown string", () => {
      const tree = createTree({ visiblewhen: "unknown-mode" });
      tree.middle.node.setAnnotation(createAnnotation());
      expect(tree.middle.node.isVisible).toBe(true);
    });
  });
});
