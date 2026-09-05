/**
 * Unit tests for ToolManagerMixin (mixins/ToolManagerMixin.js).
 */
import { types } from "mobx-state-tree";
import { ToolManagerMixin } from "../ToolManagerMixin";
import ToolsManager from "../../tools/Manager";

const ControlModel = types
  .model("ToolManagerMixinTestControl", {
    toname: types.optional(types.string, "image"),
    strokewidth: types.optional(types.string, "15"),
    annotationStore: types.frozen(),
  })
  .volatile(() => ({
    toolNames: ["Brush"],
    tools: {},
  }));

const TestControl = types.compose(ControlModel, ToolManagerMixin);
const RootModel = types.model("ToolManagerMixinTestRoot", {
  control: TestControl,
});

describe("ToolManagerMixin", () => {
  afterEach(() => {
    ToolsManager.removeAllTools();
  });

  it("uses configured strokeWidth when creating the Brush tool", () => {
    const root = RootModel.create({
      control: {
        strokewidth: "42",
        annotationStore: { initialized: false },
      },
    });

    expect(root.control.tools.Brush.strokeWidth).toBe(42);
  });
});
