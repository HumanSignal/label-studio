/**
 * Unit tests for Tool mixin (mixins/Tool.js).
 * Covers model defaults, views (obj, manager, control, viewClass, fullName,
 * getActiveShape, getSelectedShape, extraShortcuts, shouldPreserveSelectedState, isPreserved),
 * and actions (setSelected, afterUpdateSelected, event, shouldSkipInteractions, disable, enable).
 */

import { getEnv, types } from "mobx-state-tree";
import ToolMixinComposed from "../Tool";

const mockFfIsActive = jest.fn(() => false);
jest.mock("@humansignal/core", () => ({
  ff: {
    isActive: (flag) => mockFfIsActive(flag),
  },
}));

jest.mock("../../utils/feature-flags", () => ({
  FF_DEV_3391: "ff_3391",
  isFF: jest.fn(() => false),
}));

// Stub that provides toolName and dynamic so ToolMixin views work
const StubTool = types.model("StubTool", {}).views((self) => ({
  get toolName() {
    return "TestTool";
  },
  get dynamic() {
    return getEnv(self).dynamic ?? false;
  },
}));

const TestTool = types.compose("TestTool", ToolMixinComposed, StubTool);

const SettingsModel = types.model("Settings", {
  preserveSelectedTool: types.optional(types.boolean, false),
});

const ObjModel = types.model("Obj", {
  name: types.optional(types.string, "test-obj"),
  regs: types.optional(types.array(types.frozen()), []),
});

const RootModel = types.model("Root", {
  settings: types.optional(SettingsModel, {}),
  obj: types.optional(ObjModel, {}),
  tool: types.optional(TestTool, {}),
});

function createManager(overrides = {}) {
  return {
    name: "test-manager",
    root: null,
    ...overrides,
  };
}

function createControl(overrides = {}) {
  return {
    name: "test-control",
    annotation: null,
    ...overrides,
  };
}

// Create root so that tool's env.object is root.obj (MST node), enabling getRoot(self.obj).settings
function createRoot(options = {}) {
  const { preserveSelectedTool = false, objRegs = [], annotation = null } = options;
  const manager = createManager();
  const control = createControl({
    annotation: annotation ?? { highlightedNode: null, hasSelection: false },
  });
  let rootRef;
  const env = {
    manager,
    control,
    get object() {
      return rootRef ? rootRef.obj : null;
    },
  };
  const root = RootModel.create(
    {
      settings: { preserveSelectedTool },
      obj: { name: "test-obj", regs: objRegs },
      tool: {},
    },
    env,
  );
  rootRef = root;
  manager.root = root;
  return root;
}

describe("Tool mixin", () => {
  beforeEach(() => {
    mockFfIsActive.mockReturnValue(false);
    jest.clearAllMocks();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  });

  describe("model defaults", () => {
    it("has default selected false", () => {
      const root = createRoot();
      expect(root.tool.selected).toBe(false);
    });

    it("has default group 'default'", () => {
      const root = createRoot();
      expect(root.tool.group).toBe("default");
    });

    it("has default shortcut null", () => {
      const root = createRoot();
      expect(root.tool.shortcut).toBeNull();
    });

    it("has default disabled false", () => {
      const root = createRoot();
      expect(root.tool.disabled).toBe(false);
    });
  });

  describe("views", () => {
    it("manager returns env.manager", () => {
      const root = createRoot();
      expect(root.tool.manager).toEqual(expect.objectContaining({ name: "test-manager" }));
    });

    it("control returns env.control", () => {
      const root = createRoot();
      expect(root.tool.control).toEqual(expect.objectContaining({ name: "test-control" }));
    });

    it("obj returns env.object when manager.obj is not set", () => {
      const root = createRoot();
      expect(root.tool.obj).toEqual(expect.objectContaining({ name: "test-obj" }));
    });

    it("viewClass returns a function that returns null", () => {
      const root = createRoot();
      expect(typeof root.tool.viewClass).toBe("function");
      expect(root.tool.viewClass()).toBeNull();
    });

    it("fullName returns toolName when not dynamic", () => {
      const root = createRoot();
      expect(root.tool.fullName).toBe("TestTool");
    });

    it("fullName returns toolName-dynamic when dynamic", () => {
      const manager = createManager();
      let rootRef;
      const env = {
        manager,
        control: createControl(),
        get object() {
          return rootRef ? rootRef.obj : null;
        },
        dynamic: true,
      };
      const root = RootModel.create({ settings: {}, obj: { name: "test-obj", regs: [] }, tool: {} }, env);
      rootRef = root;
      manager.root = root;
      expect(root.tool.fullName).toBe("TestTool-dynamic");
    });

    it("getActiveShape returns last reg when obj has regs", () => {
      const lastReg = { id: "last" };
      const root = createRoot({ objRegs: [{ id: "first" }, lastReg] });
      expect(root.tool.getActiveShape).toBe(lastReg);
    });

    it("getActiveShape returns undefined when obj has no regs", () => {
      const root = createRoot();
      expect(root.tool.getActiveShape).toBeUndefined();
    });

    it("getSelectedShape returns control.annotation.highlightedNode", () => {
      const node = { id: "highlighted" };
      const root = createRoot({
        annotation: { highlightedNode: node, hasSelection: true },
      });
      expect(root.tool.getSelectedShape).toBe(node);
    });

    it("extraShortcuts returns empty object", () => {
      const root = createRoot();
      expect(root.tool.extraShortcuts).toEqual({});
    });

    it("shouldPreserveSelectedState is false when settings.preserveSelectedTool is false", () => {
      const root = createRoot({ preserveSelectedTool: false });
      expect(root.tool.shouldPreserveSelectedState).toBe(false);
    });

    it("shouldPreserveSelectedState is true when settings.preserveSelectedTool is true", () => {
      const root = createRoot({ preserveSelectedTool: true });
      expect(root.tool.shouldPreserveSelectedState).toBe(true);
    });

    it("isPreserved is false when localStorage does not store this tool", () => {
      const root = createRoot();
      expect(root.tool.isPreserved).toBe(false);
    });

    it("isPreserved is true when localStorage has selected-tool:obj.name equal to fullName", () => {
      const root = createRoot();
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("selected-tool:test-obj", "TestTool");
      }
      expect(root.tool.isPreserved).toBe(true);
    });
  });

  describe("actions", () => {
    it("setSelected sets selected and calls afterUpdateSelected", () => {
      const root = createRoot();
      const spy = jest.spyOn(root.tool, "afterUpdateSelected");
      root.tool.setSelected(true, true);
      expect(root.tool.selected).toBe(true);
      expect(spy).toHaveBeenCalled();
    });

    it("setSelected when not initial and selected and shouldPreserveSelectedState sets localStorage", () => {
      const root = createRoot({ preserveSelectedTool: true });
      root.tool.setSelected(true, false);
      expect(root.tool.selected).toBe(true);
      if (typeof window !== "undefined" && window.localStorage) {
        expect(window.localStorage.getItem("selected-tool:test-obj")).toBe("TestTool");
      }
    });

    it("setSelected when isInitial does not set localStorage", () => {
      const root = createRoot({ preserveSelectedTool: true });
      root.tool.setSelected(true, true);
      if (typeof window !== "undefined" && window.localStorage) {
        expect(window.localStorage.getItem("selected-tool:test-obj")).toBeNull();
      }
    });

    it("afterUpdateSelected is no-op by default", () => {
      const root = createRoot();
      expect(() => root.tool.afterUpdateSelected()).not.toThrow();
    });

    it("event calls nameEv when defined", () => {
      const root = createRoot();
      const ev = {};
      const args = [];
      root.tool.clickEv = jest.fn();
      root.tool.event("click", ev, args);
      expect(root.tool.clickEv).toHaveBeenCalledWith(ev, args);
    });

    it("event does not throw when nameEv is not defined", () => {
      const root = createRoot();
      expect(() => root.tool.event("unknown", {}, [])).not.toThrow();
    });

    it("shouldSkipInteractions returns true when ctrl pressed and no selection", () => {
      const root = createRoot({
        annotation: { highlightedNode: null, hasSelection: false },
      });
      expect(
        root.tool.shouldSkipInteractions({
          evt: { metaKey: true, ctrlKey: false },
        }),
      ).toBe(true);
      expect(
        root.tool.shouldSkipInteractions({
          evt: { metaKey: false, ctrlKey: true },
        }),
      ).toBe(true);
    });

    it("shouldSkipInteractions returns false when ctrl pressed but has selection", () => {
      const root = createRoot({
        annotation: { highlightedNode: {}, hasSelection: true },
      });
      expect(
        root.tool.shouldSkipInteractions({
          evt: { metaKey: true, ctrlKey: false },
        }),
      ).toBe(false);
    });

    it("shouldSkipInteractions returns false when no ctrl and no selection", () => {
      const root = createRoot();
      expect(
        root.tool.shouldSkipInteractions({
          evt: { metaKey: false, ctrlKey: false },
        }),
      ).toBe(false);
    });

    it("shouldSkipInteractions returns false when ev.evt is missing", () => {
      const root = createRoot();
      expect(root.tool.shouldSkipInteractions({})).toBe(false);
    });

    it("disable sets disabled to true", () => {
      const root = createRoot();
      root.tool.disable();
      expect(root.tool.disabled).toBe(true);
    });

    it("enable sets disabled to false", () => {
      const root = createRoot();
      root.tool.disable();
      root.tool.enable();
      expect(root.tool.disabled).toBe(false);
    });
  });

  describe("FF_DEV_3391 branches", () => {
    it("obj uses root.annotationStore.selected.names.get when FF_DEV_3391 active", () => {
      mockFfIsActive.mockReturnValue(true);
      const selectedNames = new Map();
      const objFromSelected = { name: "from-selected", regs: [] };
      selectedNames.set("test-manager", objFromSelected);
      const manager = createManager({ root: null });
      const root = RootModel.create(
        { settings: {}, obj: {}, tool: {} },
        {
          manager,
          control: createControl(),
          object: { name: "test-obj", regs: [] },
        },
      );
      manager.root = root;
      root.annotationStore = {
        selected: { names: selectedNames },
      };
      expect(root.tool.obj).toBe(objFromSelected);
    });

    it("control uses root.annotationStore.selected.names.get when FF_DEV_3391 active", () => {
      mockFfIsActive.mockReturnValue(true);
      const selectedNames = new Map();
      const controlFromSelected = { name: "control-from-selected", annotation: null };
      selectedNames.set("test-control", controlFromSelected);
      const manager = createManager({ root: null });
      const root = RootModel.create(
        { settings: {}, obj: {}, tool: {} },
        {
          manager,
          control: createControl(),
          object: { name: "test-obj", regs: [] },
        },
      );
      manager.root = root;
      root.annotationStore = {
        selected: { names: selectedNames },
      };
      expect(root.tool.control).toBe(controlFromSelected);
    });
  });
});
