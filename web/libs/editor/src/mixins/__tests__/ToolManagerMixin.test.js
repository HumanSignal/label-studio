/**
 * Unit tests for ToolManagerMixin (mixins/ToolManagerMixin.js).
 */
import { types } from "mobx-state-tree";
import { ToolManagerMixin } from "../ToolManagerMixin";
import ToolsManager from "../../tools/Manager";

const TEST_OBJECT_NAME = "tool-manager-mixin-test-image";

const ControlModel = types
  .model("ToolManagerMixinTestControl", {
    toname: types.optional(types.string, TEST_OBJECT_NAME),
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
  beforeEach(() => {
    ToolsManager.removeAllTools();
    window.localStorage.removeItem(`selected-tool:${TEST_OBJECT_NAME}`);
  });

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
