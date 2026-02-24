/**
 * Unit tests for ToolsManager (tools/Manager.js).
 * Covers static API (getInstance, allInstances, setRoot, removeAllTools, resetActiveDrawings),
 * instance methods (addTool, unselectAll, selectTool, selectDefault, allTools,
 * addToolsFromControl, findSelectedTool, findDrawingTool, resetActiveDrawing, event,
 * reload, removeAllTools), and getters (preservedTool, root, obj, hasSelected).
 */

const mockDestroy = jest.fn();
jest.mock("mobx-state-tree", () => ({
  destroy: (...args) => mockDestroy(...args),
}));

const mockGuid = jest.fn((n) => `guid-${n ?? 10}`);
jest.mock("../../utils/unique", () => ({
  guidGenerator: (...args) => mockGuid(...args),
}));

const mockFfActive = jest.fn(() => false);
jest.mock("@humansignal/core", () => ({
  ff: { isActive: (flag) => mockFfActive(flag) },
}));

jest.mock("../../utils/feature-flags", () => ({
  FF_DEV_3391: "ff_3391",
}));

const storage = {};
const localStorageMock = {
  getItem: jest.fn((key) => storage[key] ?? null),
  setItem: jest.fn((key, val) => {
    storage[key] = String(val);
  }),
  removeItem: jest.fn((key) => {
    delete storage[key];
  }),
  clear: jest.fn(() => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  }),
};
Object.defineProperty(global, "window", {
  value: { localStorage: localStorageMock },
  writable: true,
});

let ToolsManager;

beforeEach(() => {
  jest.clearAllMocks();
  mockGuid.mockImplementation((n) => `guid-${n ?? 10}`);
  mockFfActive.mockReturnValue(false);
  localStorageMock.getItem.mockImplementation((key) => storage[key] ?? null);
  Object.keys(storage).forEach((k) => delete storage[k]);
  jest.isolateModules(() => {
    ToolsManager = require("../Manager").default;
  });
  // Default root so obj getter does not throw when tests trigger unselectAll/selectTool
  ToolsManager.setRoot({
    annotationStore: { names: new Map(), selected: null },
  });
  // Reset static state by removing all instances
  ToolsManager.removeAllTools();
  const instances = ToolsManager.allInstances();
  instances.forEach((m) => {
    m.removeAllTools();
  });
  ToolsManager.removeAllTools();
  // Re-set root after clear (setRoot is not cleared by removeAllTools)
  ToolsManager.setRoot({
    annotationStore: { names: new Map(), selected: null },
  });
});

describe("ToolsManager", () => {
  describe("static getInstance", () => {
    it("returns undefined when name is not provided", () => {
      expect(ToolsManager.getInstance()).toBeUndefined();
      expect(ToolsManager.getInstance({})).toBeUndefined();
    });

    it("returns same instance for same name", () => {
      const a = ToolsManager.getInstance({ name: "test-manager" });
      const b = ToolsManager.getInstance({ name: "test-manager" });
      expect(a).toBe(b);
      expect(a.name).toBe("test-manager");
    });

    it("returns different instances for different names", () => {
      const a = ToolsManager.getInstance({ name: "m1" });
      const b = ToolsManager.getInstance({ name: "m2" });
      expect(a).not.toBe(b);
    });
  });

  describe("static allInstances", () => {
    it("returns array of all manager instances", () => {
      expect(ToolsManager.allInstances()).toEqual([]);
      const m1 = ToolsManager.getInstance({ name: "a1" });
      const m2 = ToolsManager.getInstance({ name: "a2" });
      const all = ToolsManager.allInstances();
      expect(all).toContain(m1);
      expect(all).toContain(m2);
      expect(all).toHaveLength(2);
    });
  });

  describe("static setRoot", () => {
    it("sets root store used by instances", () => {
      const root = { annotationStore: { names: new Map([["m", "obj"]]) } };
      ToolsManager.setRoot(root);
      const manager = ToolsManager.getInstance({ name: "m" });
      expect(manager.root).toBe(root);
      expect(manager.obj).toBe("obj");
    });
  });

  describe("static removeAllTools", () => {
    it("clears all instances and calls removeAllTools on each", () => {
      const m = ToolsManager.getInstance({ name: "rm" });
      const tool = { setSelected: jest.fn() };
      m.addTool("t1", tool);
      expect(m.allTools()).toHaveLength(1);
      ToolsManager.removeAllTools();
      expect(mockDestroy).toHaveBeenCalled();
      expect(ToolsManager.allInstances()).toHaveLength(0);
    });
  });

  describe("static resetActiveDrawings", () => {
    it("calls resetActiveDrawing on each manager", () => {
      const m = ToolsManager.getInstance({ name: "reset" });
      const resetBeforeAnnotationSwitch = jest.fn();
      const drawingTool = {
        selected: false,
        isDrawing: true,
        currentArea: {},
        resetBeforeAnnotationSwitch,
      };
      m.tools["key#draw"] = drawingTool;
      ToolsManager.resetActiveDrawings();
      expect(resetBeforeAnnotationSwitch).toHaveBeenCalled();
    });
  });

  describe("constructor and getters", () => {
    it("sets name and initial state", () => {
      const m = ToolsManager.getInstance({ name: "ctor" });
      expect(m.name).toBe("ctor");
      expect(m.tools).toEqual({});
      expect(m._default_tool).toBeNull();
      expect(mockGuid).toHaveBeenCalled();
    });

    it("preservedTool returns localStorage value for selected-tool:name", () => {
      const m = ToolsManager.getInstance({ name: "pres" });
      storage["selected-tool:pres"] = "saved-tool";
      expect(m.preservedTool).toBe("saved-tool");
      expect(localStorageMock.getItem).toHaveBeenCalledWith("selected-tool:pres");
    });

    it("root returns static root after setRoot", () => {
      const root = {};
      ToolsManager.setRoot(root);
      const m = ToolsManager.getInstance({ name: "r" });
      expect(m.root).toBe(root);
    });

    it("obj returns annotationStore.names.get(name) when FF_DEV_3391 is off", () => {
      const obj = {};
      const root = {
        annotationStore: { names: new Map([["r", obj]]), selected: null },
      };
      ToolsManager.setRoot(root);
      mockFfActive.mockReturnValue(false);
      const m = ToolsManager.getInstance({ name: "r" });
      expect(m.obj).toBe(obj);
    });

    it("obj returns annotationStore.selected?.names.get(name) when FF_DEV_3391 is on", () => {
      const { FF_DEV_3391 } = require("../../utils/feature-flags");
      const obj = {};
      const root = {
        annotationStore: {
          names: new Map(),
          selected: { names: new Map([["r", obj]]) },
        },
      };
      ToolsManager.setRoot(root);
      mockFfActive.mockImplementation((flag) => flag === FF_DEV_3391);
      const m = ToolsManager.getInstance({ name: "r" });
      expect(m.obj).toBe(obj);
    });
  });

  describe("addTool", () => {
    it("skips tool when tool.smart and tool.control?.smartonly", () => {
      const m = ToolsManager.getInstance({ name: "add" });
      const tool = { smart: true, control: { smartonly: true } };
      m.addTool("smart", tool);
      expect(m.allTools()).toHaveLength(0);
    });

    it("adds tool and uses toolName or tool.toolName as name", () => {
      const m = ToolsManager.getInstance({ name: "add" });
      const tool = { setSelected: jest.fn() };
      m.addTool("myTool", tool);
      expect(m.allTools()).toContain(tool);
      expect(m.allTools()).toHaveLength(1);
    });

    it("sets _default_tool when tool.default is true", () => {
      const m = ToolsManager.getInstance({ name: "add" });
      const def = { default: true, setSelected: jest.fn() };
      m.addTool("def", def);
      expect(m._default_tool).toBe(def);
    });

    it("does not add duplicate when removeDuplicatesNamed matches and key exists", () => {
      const m = ToolsManager.getInstance({ name: "add" });
      const tool = { toolName: "same", setSelected: jest.fn() };
      m.addTool("same", tool);
      m.addTool("same", { ...tool, other: 1 }, "same");
      expect(m.allTools()).toHaveLength(1);
    });

    it("restores preserved tool when tool.fullName === preservedTool and setSelected", () => {
      storage["selected-tool:add"] = "fullNameTool";
      const m = ToolsManager.getInstance({ name: "add" });
      const unselectAll = jest.spyOn(m, "unselectAll");
      const selectTool = jest.spyOn(m, "selectTool");
      const tool = {
        fullName: "fullNameTool",
        shouldPreserveSelectedState: true,
        setSelected: jest.fn(),
      };
      m.addTool("t", tool);
      expect(unselectAll).toHaveBeenCalled();
      expect(selectTool).toHaveBeenCalledWith(tool, true, true);
    });

    it("selects default tool when no tool selected and _default_tool exists", () => {
      const m = ToolsManager.getInstance({ name: "add" });
      const def = { default: true, setSelected: jest.fn() };
      m.addTool("def", def);
      expect(def.setSelected).toHaveBeenCalledWith(true, true);
    });
  });

  describe("unselectAll", () => {
    it("calls setSelected(false) on all tools that have setSelected", () => {
      const m = ToolsManager.getInstance({ name: "unsel" });
      const t1 = { setSelected: jest.fn(), selected: true };
      const t2 = { setSelected: jest.fn(), selected: true };
      m.tools["k1#a"] = t1;
      m.tools["k2#b"] = t2;
      m.unselectAll();
      expect(t1.setSelected).toHaveBeenCalledWith(false);
      expect(t2.setSelected).toHaveBeenCalledWith(false);
    });

    it("sets stage container cursor to default when obj.stageRef exists", () => {
      const container = { style: { cursor: "pointer" } };
      const stage = { container: () => container };
      const root = {
        annotationStore: {
          names: new Map([["unsel", { stageRef: stage }]]),
          selected: null,
        },
      };
      ToolsManager.setRoot(root);
      const m = ToolsManager.getInstance({ name: "unsel" });
      m.unselectAll();
      expect(container.style.cursor).toBe("default");
    });
  });

  describe("selectTool", () => {
    it("when selected=true calls unselectAll and tool.setSelected(true, isInitial)", () => {
      const m = ToolsManager.getInstance({ name: "sel" });
      const tool = { setSelected: jest.fn(), group: "default" };
      m.tools["k#t"] = tool;
      m.selectTool(tool, true, true);
      expect(tool.setSelected).toHaveBeenCalledWith(true, true);
    });

    it("when selected=false selects drawing tool or default", () => {
      const m = ToolsManager.getInstance({ name: "sel" });
      const def = { setSelected: jest.fn(), default: true };
      m._default_tool = def;
      m.tools["k#def"] = def;
      const drawing = { setSelected: jest.fn(), isDrawing: true };
      m.tools["k#draw"] = drawing;
      m.selectTool({ selected: true }, false);
      expect(drawing.setSelected).toHaveBeenCalledWith(true, expect.anything());
    });

    it("calls currentTool.handleToolSwitch and currentTool.complete when switching", () => {
      const m = ToolsManager.getInstance({ name: "sel" });
      const current = {
        setSelected: jest.fn(),
        selected: true,
        handleToolSwitch: jest.fn(),
        complete: jest.fn(),
        group: "other",
      };
      const next = {
        setSelected: jest.fn(),
        group: "default",
        control: { type: "rect" },
      };
      m.tools["k#cur"] = current;
      m.tools["k#next"] = next;
      m.selectTool(next, true);
      expect(current.handleToolSwitch).toHaveBeenCalledWith(next);
      expect(current.complete).toHaveBeenCalled();
    });

    it("unselects unrelated labels when newSelection is segmentation", () => {
      const m = ToolsManager.getInstance({ name: "sel" });
      const tag1 = { type: "brushlabels", unselectAll: jest.fn() };
      const tag2 = { type: "keypointlabels", unselectAll: jest.fn() };
      const current = {
        setSelected: jest.fn(),
        selected: true,
        group: "segmentation",
        control: { type: "brushlabels" },
        obj: { activeStates: () => [tag1, tag2] },
        handleToolSwitch: jest.fn(),
        complete: jest.fn(),
      };
      const next = {
        setSelected: jest.fn(),
        group: "segmentation",
        control: { type: "keypointlabels" },
        obj: { activeStates: () => [tag1, tag2] },
      };
      m.tools["k#cur"] = current;
      m.tools["k#next"] = next;
      m.selectTool(next, true);
      expect(tag1.unselectAll).toHaveBeenCalled();
      expect(tag2.unselectAll).not.toHaveBeenCalled();
    });
  });

  describe("selectDefault", () => {
    it("unselects and selects _default_tool when current tool is dynamic", () => {
      const m = ToolsManager.getInstance({ name: "def" });
      const def = { setSelected: jest.fn(), default: true };
      const current = { setSelected: jest.fn(), selected: true, dynamic: true };
      m._default_tool = def;
      m.tools["k#cur"] = current;
      m.tools["k#d"] = def;
      m.selectDefault();
      expect(def.setSelected).toHaveBeenCalledWith(true);
    });
  });

  describe("allTools and addToolsFromControl", () => {
    it("allTools returns values of this.tools", () => {
      const m = ToolsManager.getInstance({ name: "all" });
      const t1 = {};
      const t2 = {};
      m.tools["a#x"] = t1;
      m.tools["b#y"] = t2;
      expect(m.allTools()).toEqual([t1, t2]);
    });

    it("addToolsFromControl adds tools from control.tools", () => {
      const m = ToolsManager.getInstance({ name: "ctrl" });
      const tool = { setSelected: jest.fn() };
      const control = {
        tools: { rect: tool },
        removeDuplicatesNamed: null,
        name: "ctrlName",
      };
      m.addToolsFromControl(control);
      expect(m.allTools()).toContain(tool);
    });

    it("addToolsFromControl uses control.name or control.id as prefix", () => {
      const m = ToolsManager.getInstance({ name: "ctrl" });
      const tool = { setSelected: jest.fn() };
      const control = { tools: { r: tool }, id: "controlId" };
      m.addToolsFromControl(control);
      expect(m.allTools()).toHaveLength(1);
    });
  });

  describe("findSelectedTool and findDrawingTool", () => {
    it("findSelectedTool returns first tool with selected true", () => {
      const m = ToolsManager.getInstance({ name: "find" });
      const t1 = { selected: false };
      const t2 = { selected: true };
      m.tools["a#x"] = t1;
      m.tools["b#y"] = t2;
      expect(m.findSelectedTool()).toBe(t2);
    });

    it("findDrawingTool returns first tool with isDrawing true", () => {
      const m = ToolsManager.getInstance({ name: "find" });
      const t1 = { isDrawing: false };
      const t2 = { isDrawing: true };
      m.tools["a#x"] = t1;
      m.tools["b#y"] = t2;
      expect(m.findDrawingTool()).toBe(t2);
    });
  });

  describe("resetActiveDrawing", () => {
    it("calls resetBeforeAnnotationSwitch on drawing tool when currentArea exists", () => {
      const m = ToolsManager.getInstance({ name: "reset" });
      const reset = jest.fn();
      const drawingTool = { isDrawing: true, currentArea: {}, resetBeforeAnnotationSwitch: reset };
      m.tools["k#d"] = drawingTool;
      m.resetActiveDrawing();
      expect(reset).toHaveBeenCalled();
    });

    it("no-op when no drawing tool or no currentArea", () => {
      const m = ToolsManager.getInstance({ name: "reset" });
      expect(() => m.resetActiveDrawing()).not.toThrow();
      m.tools["k#d"] = { isDrawing: true };
      expect(() => m.resetActiveDrawing()).not.toThrow();
    });
  });

  describe("event", () => {
    it("dispatches to selected tool when one is selected", () => {
      const m = ToolsManager.getInstance({ name: "ev" });
      const tool = { selected: true, event: jest.fn() };
      m.tools["k#t"] = tool;
      m.event("click", { clientX: 1 }, "a", "b");
      expect(tool.event).toHaveBeenCalledWith("click", { clientX: 1 }, ["a", "b"]);
    });

    it("does nothing when no tool selected", () => {
      const m = ToolsManager.getInstance({ name: "ev" });
      expect(() => m.event("click", {})).not.toThrow();
    });
  });

  describe("reload", () => {
    it("re-registers instance with new name and clears tools", () => {
      const m = ToolsManager.getInstance({ name: "old" });
      m.tools["k#t"] = { setSelected: jest.fn() };
      m.reload({ name: "new" });
      expect(m.name).toBe("new");
      expect(m.allTools()).toHaveLength(0);
      expect(ToolsManager.getInstance({ name: "new" })).toBe(m);
    });
  });

  describe("removeAllTools", () => {
    it("destroys all tools and clears state", () => {
      const m = ToolsManager.getInstance({ name: "rm" });
      const t1 = {};
      m.tools["k#a"] = t1;
      m._default_tool = t1;
      m.removeAllTools();
      expect(mockDestroy).toHaveBeenCalledWith(t1);
      expect(m.tools).toEqual({});
      expect(m._default_tool).toBeNull();
    });
  });

  describe("hasSelected", () => {
    it("returns true when any tool has selected true", () => {
      const m = ToolsManager.getInstance({ name: "has" });
      m.tools["k#a"] = { selected: false };
      m.tools["k#b"] = { selected: true };
      expect(m.hasSelected).toBe(true);
    });

    it("returns false when no tool selected", () => {
      const m = ToolsManager.getInstance({ name: "has" });
      m.tools["k#a"] = { selected: false };
      expect(m.hasSelected).toBe(false);
    });
  });
});
