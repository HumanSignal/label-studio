/**
 * Unit tests for RequiredMixin (mixins/Required.js), perItem branch.
 */
import { types } from "mobx-state-tree";
import RequiredMixin from "../Required";

// perItem control (e.g. TextArea) whose visibility per item is driven by `hiddenItems`,
// standing in for a wrapping <View visibleWhen="choice-selected"> gated by a perItem Choices
const Control = types
  .model("Control", {
    peritem: types.optional(types.boolean, true),
    hiddenItems: types.array(types.number),
  })
  .volatile(() => ({ toNameTag: null, annotation: null, modalShown: false }))
  .views((self) => ({
    isVisibleForItem(idx) {
      return !self.hiddenItems.includes(idx);
    },
  }))
  .actions((self) => ({
    validate() {
      return true;
    },
    requiredModal() {
      self.modalShown = true;
    },
    setEnv(toNameTag, annotation) {
      self.toNameTag = toNameTag;
      self.annotation = annotation;
    },
  }));

const RequiredControl = types.compose(Control, RequiredMixin);

function setup({ hiddenItems = [], valuedItems = [], maxItemIndex = 2 } = {}) {
  const control = RequiredControl.create({ required: true, hiddenItems });
  const objectTag = {
    maxItemIndex,
    currentItemIndex: 0,
    setCurrentItem(idx) {
      this.currentItemIndex = idx;
    },
  };
  const regions = valuedItems.map((idx) => ({
    item_index: idx,
    results: [{ from_name: control, hasValue: true }],
  }));

  control.setEnv(objectTag, { regions });
  return { control, objectTag };
}

describe("RequiredMixin perItem", () => {
  it("skips items where the control is hidden by visibleWhen", () => {
    const { control, objectTag } = setup({ hiddenItems: [1, 2], valuedItems: [0] });

    expect(control.validate()).toBe(true);
    expect(control.modalShown).toBe(false);
    expect(objectTag.currentItemIndex).toBe(0);
  });

  it("still requires a value on every visible item", () => {
    const { control, objectTag } = setup({ hiddenItems: [1], valuedItems: [0] });

    expect(control.validate()).toBe(false);
    expect(control.modalShown).toBe(true);
    expect(objectTag.currentItemIndex).toBe(2);
  });

  it("requires a value on every item when nothing is hidden", () => {
    const { control, objectTag } = setup({ valuedItems: [0, 2] });

    expect(control.validate()).toBe(false);
    expect(objectTag.currentItemIndex).toBe(1);
  });
});
