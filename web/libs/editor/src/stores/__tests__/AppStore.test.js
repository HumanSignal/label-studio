/**
 * Unit tests for AppStore (stores/AppStore.js).
 * Target: coverage parity 56.44%.
 */
if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

jest.mock("keymaster", () => {
  const keymaster = () => {};
  keymaster.unbind = () => {};
  keymaster.setScope = () => {};
  return { __esModule: true, default: keymaster };
});

jest.mock("../../core/Hotkey", () => {
  const mockHotkey = {
    unbindAll: jest.fn(),
    addNamed: jest.fn(),
  };
  const HotkeyFn = () => mockHotkey;
  HotkeyFn.setScope = jest.fn();
  HotkeyFn.DEFAULT_SCOPE = "default";
  HotkeyFn.unbindAll = jest.fn();
  return {
    __esModule: true,
    Hotkey: HotkeyFn,
    unbindAll: jest.fn(),
  };
});

jest.mock("../../tools/Manager", () => ({
  __esModule: true,
  default: {
    setRoot: jest.fn(),
    removeAllTools: jest.fn(),
    allInstances: jest.fn(() => []),
    resetActiveDrawings: jest.fn(),
  },
}));

const mockInvoke = jest.fn();
const mockInvokeFirst = jest.fn();
const mockHasEvent = jest.fn(() => false);
jest.mock("../../components/Infomodal/Infomodal", () => ({
  __esModule: true,
  default: {
    warning: jest.fn(),
    error: jest.fn(),
  },
}));

import "../../tags/visual/View";
import "../../tags/object/RichText";
import Tree from "../../core/Tree";
import Registry from "../../core/Registry";
import AppStore from "../AppStore";

const MINIMAL_CONFIG = `<View><Text name="t1" value="$text" /></View>`;

function createTestEnv(overrides = {}) {
  return {
    events: {
      hasEvent: mockHasEvent,
      invoke: mockInvoke,
      invokeFirst: mockInvokeFirst,
    },
    messages: {
      CONFIRM_TO_DELETE_ALL_REGIONS: "Delete all?",
    },
    settings: {},
    forceAutoAnnotation: false,
    forceAutoAcceptSuggestions: false,
    ...overrides,
  };
}

function createStore(snapshot = {}, envOverrides) {
  const env = createTestEnv(envOverrides);
  return AppStore.create(
    {
      config: MINIMAL_CONFIG,
      task: { id: 1, data: JSON.stringify({ text: "Hello" }) },
      interfaces: ["basic"],
      ...snapshot,
    },
    env,
  );
}

describe("AppStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasEvent.mockReturnValue(false);
    localStorage.setItem("autoAnnotation", "false");
    localStorage.setItem("autoAcceptSuggestions", "false");
    window.APP_SETTINGS = undefined;
  });

  describe("creation and preProcessSnapshot", () => {
    it("creates store with minimal config and task", () => {
      const store = createStore();
      expect(store.config).toBe(MINIMAL_CONFIG);
      expect(store.task).toBeDefined();
      expect(store.task.id).toBe(1);
      expect(store.interfaces).toEqual(["basic"]);
    });

    it("preProcessSnapshot converts customButtons array to map with _replace", () => {
      const store = AppStore.create(
        {
          config: MINIMAL_CONFIG,
          task: { id: 1, data: "{}" },
          interfaces: [],
          customButtons: [{ name: "submit", title: "Submit" }],
        },
        createTestEnv(),
      );
      const replaced = store.customButtons.get("_replace");
      expect(Array.isArray(replaced)).toBe(true);
      expect(replaced[0].name).toBe("submit");
    });

    it("preProcessSnapshot reads autoAnnotation and autoAcceptSuggestions from localStorage", () => {
      localStorage.setItem("autoAnnotation", "true");
      localStorage.setItem("autoAcceptSuggestions", "true");
      const store = createStore();
      expect(store._autoAnnotation).toBe(true);
      expect(store._autoAcceptSuggestions).toBe(true);
    });

    it("preProcessSnapshot resolves user object to id and merges into users", () => {
      window.APP_SETTINGS = { user: { id: 42, first_name: "Test" } };
      const store = AppStore.create(
        {
          config: MINIMAL_CONFIG,
          task: { id: 1, data: "{}" },
          interfaces: [],
          user: { id: 42, first_name: "Test" },
        },
        createTestEnv(),
      );
      expect(store.users.length).toBe(1);
      expect(store.users[0].id).toBe(42);
    });
  });

  describe("views", () => {
    it("events returns getEnv(self).events", () => {
      const store = createStore();
      expect(store.events).toBeDefined();
      expect(store.events.invoke).toBeDefined();
      expect(store.events.hasEvent).toBeDefined();
    });

    it("hasSegmentation is false when no segmentation tools", () => {
      const store = createStore();
      store.initializeStore({});
      expect(store.hasSegmentation).toBe(false);
    });

    it("canGoNextTask is false when taskHistory has zero or one entry", () => {
      const store = createStore();
      store.initializeStore({});
      expect(store.canGoNextTask).toBe(false);
    });

    it("canGoNextTask is true when current task is not last in history", () => {
      const store = createStore();
      store.initializeStore({});
      store.setTaskHistory([
        { taskId: 1, annotationId: null },
        { taskId: 2, annotationId: null },
      ]);
      store.assignTask({ id: 1, data: "{}" });
      expect(store.canGoNextTask).toBe(true);
    });

    it("canGoPrevTask is false when single task in history", () => {
      const store = createStore();
      store.initializeStore({});
      expect(store.canGoPrevTask).toBe(false);
    });

    it("canGoPrevTask is true when current task is not first in history", () => {
      const store = createStore();
      store.setTaskHistory([
        { taskId: 1, annotationId: null },
        { taskId: 2, annotationId: null },
      ]);
      store.assignTask({ id: 2, data: "{}" });
      expect(store.canGoPrevTask).toBe(true);
    });

    it("autoAnnotation reflects forceAutoAnnotation when true", () => {
      const store = createStore({}, { forceAutoAnnotation: true });
      expect(store.autoAnnotation).toBe(true);
    });

    it("autoAnnotation reflects _autoAnnotation when force is false", () => {
      localStorage.setItem("autoAnnotation", "true");
      const store = createStore();
      expect(store.autoAnnotation).toBe(true);
    });

    it("autoAcceptSuggestions reflects forceAutoAcceptSuggestions when true", () => {
      const store = createStore({}, { forceAutoAcceptSuggestions: true });
      expect(store.autoAcceptSuggestions).toBe(true);
    });
  });

  describe("setFlags", () => {
    it("updates only provided flag names", () => {
      const store = createStore();
      store.setFlags({ showingSettings: true, isLoading: true });
      expect(store.showingSettings).toBe(true);
      expect(store.isLoading).toBe(true);
      store.setFlags({ overlapReachedMessage: "Custom message" });
      expect(store.overlapReachedMessage).toBe("Custom message");
    });
  });

  describe("interfaces", () => {
    it("hasInterface returns true when name is in interfaces", () => {
      const store = createStore({ interfaces: ["submit", "skip"] });
      expect(store.hasInterface("submit")).toBe(true);
      expect(store.hasInterface("skip")).toBe(true);
      expect(store.hasInterface("review")).toBe(false);
    });

    it("addInterface appends name to interfaces", () => {
      const store = createStore({ interfaces: ["basic"] });
      store.addInterface("submit");
      expect(store.interfaces).toContain("submit");
    });

    it("toggleInterface adds when value true and not present", () => {
      const store = createStore({ interfaces: ["basic"] });
      store.toggleInterface("submit", true);
      expect(store.interfaces).toContain("submit");
    });

    it("toggleInterface removes when value false", () => {
      const store = createStore({ interfaces: ["basic", "submit"] });
      store.toggleInterface("submit", false);
      expect(store.interfaces).not.toContain("submit");
    });

    it("toggleInterface with no value toggles (add if missing)", () => {
      const store = createStore({ interfaces: ["basic"] });
      store.toggleInterface("submit");
      expect(store.interfaces).toContain("submit");
    });
  });

  describe("toggle state", () => {
    it("toggleSettings flips showingSettings", () => {
      const store = createStore();
      expect(store.showingSettings).toBe(false);
      store.toggleSettings();
      expect(store.showingSettings).toBe(true);
      store.toggleSettings();
      expect(store.showingSettings).toBe(false);
    });

    it("toggleDescription flips showingDescription", () => {
      const store = createStore();
      store.toggleDescription();
      expect(store.showingDescription).toBe(true);
      store.toggleDescription();
      expect(store.showingDescription).toBe(false);
    });

    it("toggleComments sets showComments", () => {
      const store = createStore();
      store.toggleComments(true);
      expect(store.showComments).toBe(true);
      store.toggleComments(false);
      expect(store.showComments).toBe(false);
    });
  });

  describe("task and history", () => {
    it("assignTask creates task and appends to taskHistory when new", () => {
      const store = createStore();
      store.initializeStore({});
      store.assignTask({ id: 99, data: JSON.stringify({ x: 1 }) });
      expect(store.task.id).toBe(99);
      expect(store.taskHistory.some((h) => h.taskId === 99)).toBe(true);
    });

    it("assignTask stringifies task.data when not already string", () => {
      const store = createStore();
      store.initializeStore({});
      store.assignTask({ id: 2, data: { foo: "bar" } });
      expect(store.task.data).toBe(JSON.stringify({ foo: "bar" }));
    });

    it("setTaskHistory replaces taskHistory", () => {
      const store = createStore();
      store.setTaskHistory([
        { taskId: 10, annotationId: "a1" },
        { taskId: 20, annotationId: null },
      ]);
      expect(store.taskHistory.length).toBe(2);
      expect(store.taskHistory[0].taskId).toBe(10);
    });

    it("incrementQueuePosition clamps between 1 and queueTotal", () => {
      const store = createStore({ queueTotal: 5, queuePosition: 2 });
      store.incrementQueuePosition(1);
      expect(store.queuePosition).toBe(3);
      store.incrementQueuePosition(10);
      expect(store.queuePosition).toBe(5);
      store.incrementQueuePosition(-10);
      expect(store.queuePosition).toBe(1);
    });

    it("addAnnotationToTaskHistory updates current task entry", () => {
      const store = createStore();
      store.initializeStore({});
      store.assignTask({ id: 1, data: "{}" });
      store.addAnnotationToTaskHistory("ann-123");
      const entry = store.taskHistory.find((h) => h.taskId === 1);
      expect(entry.annotationId).toBe("ann-123");
    });
  });

  describe("users", () => {
    it("setUsers replaces users array", () => {
      const store = createStore();
      store.setUsers([
        { id: 1, firstName: "A" },
        { id: 2, firstName: "B" },
      ]);
      expect(store.users.length).toBe(2);
      expect(store.users[0].id).toBe(1);
      expect(store.users[0].firstName).toBe("A");
    });

    it("mergeUsers merges and dedupes by id", () => {
      const store = createStore();
      store.setUsers([{ id: 1, firstName: "A" }]);
      store.mergeUsers([
        { id: 2, firstName: "B" },
        { id: 1, firstName: "A2" },
      ]);
      expect(store.users.length).toBe(2);
      const u1 = store.users.find((u) => u.id === 1);
      expect(u1.firstName).toBe("A");
    });

    it("enrichUsers merges new data into existing users by id", () => {
      const store = createStore();
      store.setUsers([
        { id: 1, firstName: "A" },
        { id: 2, firstName: "B" },
      ]);
      store.enrichUsers([
        { id: 1, email: "a@test.com" },
        { id: 3, firstName: "C" },
      ]);
      const u1 = store.users.find((u) => u.id === 1);
      expect(u1.firstName).toBe("A");
      expect(u1.email).toBe("a@test.com");
      expect(store.users.length).toBe(3);
    });
  });

  describe("assignConfig", () => {
    it("sets config and calls annotationStore.initRoot", () => {
      const store = createStore();
      store.initializeStore({});
      const newConfig = `<View><Labels name="l1" /></View>`;
      store.assignConfig(newConfig);
      expect(store.config).toBe(newConfig);
    });
  });

  describe("auto annotation/suggestions persistence", () => {
    it("setAutoAnnotation updates _autoAnnotation and localStorage", () => {
      const store = createStore();
      store.setAutoAnnotation(true);
      expect(store._autoAnnotation).toBe(true);
      expect(localStorage.getItem("autoAnnotation")).toBe("true");
    });

    it("setAutoAcceptSuggestions updates _autoAcceptSuggestions and localStorage", () => {
      const store = createStore();
      store.setAutoAcceptSuggestions(true);
      expect(store._autoAcceptSuggestions).toBe(true);
      expect(localStorage.getItem("autoAcceptSuggestions")).toBe("true");
    });
  });

  describe("app controls", () => {
    it("setAppControls stores controls", () => {
      const store = createStore();
      const controls = { clear: jest.fn(), render: jest.fn(), isRendered: () => false };
      store.setAppControls(controls);
      store.clearApp();
      expect(controls.clear).toHaveBeenCalled();
      store.renderApp();
      expect(controls.render).toHaveBeenCalled();
    });
  });

  describe("resetAnnotationStore", () => {
    it("calls beforeReset and resetAnnotations on annotation store when present", () => {
      const store = createStore();
      store.initializeStore({});
      const beforeReset = jest.fn();
      const resetAnnotations = jest.fn();
      store.annotationStore.beforeReset = beforeReset;
      store.annotationStore.resetAnnotations = resetAnnotations;
      store.resetAnnotationStore();
      expect(beforeReset).toHaveBeenCalled();
      expect(resetAnnotations).toHaveBeenCalled();
    });
  });

  describe("submitDraft", () => {
    it("resolves when no submitDraft event", async () => {
      const store = createStore();
      store.initializeStore({});
      mockHasEvent.mockReturnValue(false);
      await expect(store.submitDraft(store.annotationStore.selected)).resolves.toBeUndefined();
    });
  });

  describe("initializeStore", () => {
    it("sets initialized and invokes storageInitialized when not yet initialized", () => {
      const store = createStore();
      store.initializeStore({ annotations: [], predictions: [] });
      expect(store.initialized).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith("storageInitialized", store);
    });

    it("enrichUsers is called when annotations have user refs", () => {
      const store = createStore();
      store.initializeStore({
        annotations: [
          { user: 10, result: [] },
          { completed_by: 20, result: [] },
        ],
      });
      expect(store.users.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("setHistory", () => {
    it("clears history when no history or selected has no pk", () => {
      const store = createStore();
      store.initializeStore({ annotations: [] });
      store.setHistory([{ annotation_id: 99, result: [] }]);
      expect(store.annotationStore.history.length).toBe(0);
    });
  });

  describe("showModal", () => {
    it("calls InfoModal with message and type", async () => {
      const InfoModal = require("../../components/Infomodal/Infomodal").default;
      const store = createStore();
      store.showModal("Test message", "warning");
      expect(InfoModal.warning).toHaveBeenCalledWith("Test message");
    });
  });

  describe("waitForDraftSubmission", () => {
    it("resolves immediately when selected is not draft saving", async () => {
      const store = createStore();
      store.initializeStore({ annotations: [{ result: [] }] });
      await expect(store.waitForDraftSubmission()).resolves.toBeUndefined();
    });
  });

  describe("presignUrlForProject", () => {
    it("returns first url from events.invoke result", async () => {
      const store = createStore();
      mockInvoke.mockResolvedValue(["https://presigned.example/url"]);
      const result = await store.presignUrlForProject("https://example.com/key");
      expect(result).toBe("https://presigned.example/url");
    });
  });

  describe("nextTask", () => {
    it("invokes nextTask event when canGoNextTask", () => {
      const store = createStore();
      store.setTaskHistory([
        { taskId: 1, annotationId: null },
        { taskId: 2, annotationId: "a2" },
      ]);
      store.assignTask({ id: 1, data: "{}" });
      store.initializeStore({});
      store.nextTask();
      expect(mockInvoke).toHaveBeenCalledWith("nextTask", 2, "a2");
    });
  });

  describe("prevTask", () => {
    it("invokes prevTask event when canGoPrevTask", () => {
      const store = createStore();
      store.setTaskHistory([
        { taskId: 1, annotationId: "a1" },
        { taskId: 2, annotationId: null },
      ]);
      store.assignTask({ id: 2, data: "{}" });
      store.initializeStore({});
      store.prevTask();
      expect(mockInvoke).toHaveBeenCalledWith("prevTask", 1, "a1");
    });
  });

  describe("skipTask", () => {
    it("invokes skipTask when not enterprise", () => {
      window.APP_SETTINGS = { billing: {} };
      const store = createStore();
      store.initializeStore({});
      store.assignTask({ id: 1, data: "{}" });
      store.skipTask();
      expect(mockInvoke).toHaveBeenCalledWith("skipTask", store, undefined);
      window.APP_SETTINGS = undefined;
    });

    it("does not invoke skipTask when enterprise and allow_skip false and user not manager", () => {
      const store = createStore();
      store.initializeStore({});
      store.assignTask({ id: 1, data: "{}", allow_skip: false });
      window.APP_SETTINGS = { billing: { enterprise: true }, user: { id: 1, role: "AN" } };
      const spy = jest.spyOn(console, "warn").mockImplementation();
      store.skipTask();
      expect(mockInvoke).not.toHaveBeenCalledWith("skipTask", expect.anything(), expect.anything());
      spy.mockRestore();
      window.APP_SETTINGS = undefined;
    });

    it("invokes skipTask when enterprise and user has manager role even if allow_skip false", () => {
      const store = createStore();
      store.initializeStore({});
      store.assignTask({ id: 1, data: "{}", allow_skip: false });
      window.APP_SETTINGS = { billing: { enterprise: true }, user: { id: 1, role: "OW" } };
      store.skipTask();
      expect(mockInvoke).toHaveBeenCalledWith("skipTask", store, undefined);
      window.APP_SETTINGS = undefined;
    });
  });

  describe("unskipTask", () => {
    it("invokes unskipTask event", () => {
      const store = createStore();
      store.initializeStore({});
      store.unskipTask();
      expect(mockInvoke).toHaveBeenCalledWith("unskipTask", store);
    });
  });

  describe("assignTask does not duplicate taskHistory", () => {
    it("does not push when taskId already in taskHistory", () => {
      const store = createStore();
      store.initializeStore({});
      store.assignTask({ id: 1, data: "{}" });
      const len = store.taskHistory.length;
      store.assignTask({ id: 1, data: "{}" });
      expect(store.taskHistory.length).toBe(len);
    });
  });

  describe("submitDraft with event", () => {
    it("resolves when invokeFirst returns a thenable", async () => {
      const store = createStore();
      store.initializeStore({});
      mockHasEvent.mockReturnValue(true);
      mockInvokeFirst.mockReturnValue(Promise.resolve());
      await expect(store.submitDraft(store.annotationStore.selected)).resolves.toBeUndefined();
    });
  });

  describe("isSubmitting guard", () => {
    it("submitAnnotation returns early when isSubmitting", () => {
      const store = createStore();
      store.initializeStore({ annotations: [{ result: [] }] });
      store.setFlags({ isSubmitting: true });
      store.submitAnnotation();
      expect(mockInvoke).not.toHaveBeenCalledWith("submitAnnotation", expect.anything(), expect.anything());
    });

    it("skipTask returns early when isSubmitting", () => {
      const store = createStore();
      store.initializeStore({});
      store.assignTask({ id: 1, data: "{}" });
      store.setFlags({ isSubmitting: true });
      store.skipTask();
      expect(mockInvoke).not.toHaveBeenCalledWith("skipTask", expect.anything(), expect.anything());
    });
  });

  describe("loadSuggestions", () => {
    it("sets awaitingSuggestions and parses response", async () => {
      const store = createStore();
      store.initializeStore({ annotations: [{ result: [] }] });
      const dataParser = jest.fn((r) => r.suggestions);
      const request = Promise.resolve({ suggestions: [{ result: [] }] });
      store.loadSuggestions(request, dataParser);
      expect(store.awaitingSuggestions).toBe(true);
      await request;
      await new Promise((r) => setTimeout(r, 50));
      expect(store.awaitingSuggestions).toBe(false);
      expect(dataParser).toHaveBeenCalled();
    });
  });

  describe("postponeTask", () => {
    it("invokes nextTask after saving draft", async () => {
      const store = createStore();
      store.initializeStore({ annotations: [{ result: [] }] });
      store.annotationStore.selected.saveDraft = jest.fn().mockResolvedValue(undefined);
      mockInvoke.mockResolvedValue(undefined);
      await store.postponeTask();
      expect(store.annotationStore.selected.saveDraft).toHaveBeenCalledWith({ was_postponed: true });
      expect(mockInvoke).toHaveBeenCalledWith("nextTask");
    });
  });

  describe("beforeDestroy", () => {
    it("removes tools and clears appControls", () => {
      const ToolsManager = require("../../tools/Manager").default;
      const store = createStore();
      store.setAppControls({ clear: jest.fn(), render: jest.fn() });
      store.beforeDestroy();
      expect(ToolsManager.removeAllTools).toHaveBeenCalled();
    });
  });

  describe("prevTask with shouldGoBack", () => {
    it("uses taskHistory[length-1] when shouldGoBack true", () => {
      const store = createStore();
      store.setTaskHistory([
        { taskId: 1, annotationId: "a1" },
        { taskId: 2, annotationId: "a2" },
      ]);
      store.assignTask({ id: 2, data: "{}" });
      store.initializeStore({});
      store.prevTask(null, true);
      expect(mockInvoke).toHaveBeenCalledWith("prevTask", 2, "a2");
    });
  });

  describe("incrementQueuePosition with custom number", () => {
    it("increments by given number", () => {
      const store = createStore({ queueTotal: 10, queuePosition: 3 });
      store.incrementQueuePosition(2);
      expect(store.queuePosition).toBe(5);
    });

    it("decrements when given negative number", () => {
      const store = createStore({ queueTotal: 10, queuePosition: 5 });
      store.incrementQueuePosition(-2);
      expect(store.queuePosition).toBe(3);
    });
  });

  describe("setHistory with matching annotation", () => {
    it("adds history when selected pk matches first item", () => {
      const store = createStore();
      store.initializeStore({
        annotations: [{ id: "a1", pk: 100, result: [] }],
      });
      store.setHistory([
        { annotation_id: 100, result: [] },
        { annotation_id: 99, result: [] },
      ]);
      expect(store.annotationStore.history.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("FIT-720 stub/hydrate: history item pk and hydrateHistoryItem", () => {
    it("preserves numeric pk from API in history items so hydrate can use it", () => {
      const store = createStore();
      store.initializeStore({
        annotations: [{ id: "a1", pk: 100, result: [] }],
      });
      const historyRowId = 46597;
      store.setHistory([
        {
          id: historyRowId,
          annotation_id: 100,
          action: "submitted",
          result: [],
          is_stub: true,
        },
      ]);
      expect(store.annotationStore.history.length).toBe(1);
      const first = store.annotationStore.history[0];
      expect(Number(first.pk)).toBe(historyRowId);
    });

    it("hydrateHistoryItem finds item by pk (not MST id) and hydrates then selects", () => {
      const store = createStore();
      store.initializeStore({
        annotations: [{ id: "a1", pk: 100, result: [] }],
      });
      const historyRowId = 46597;
      store.setHistory([
        {
          id: historyRowId,
          annotation_id: 100,
          action: "submitted",
          result: [],
          is_stub: true,
        },
      ]);
      expect(store.annotationStore.history.length).toBe(1);
      const fullItem = {
        id: historyRowId,
        annotation_id: 100,
        action: "submitted",
        result: [
          {
            value: { choices: ["neg"] },
            from_name: "label",
            to_name: "text",
            type: "choices",
          },
        ],
      };
      store.hydrateHistoryItem(historyRowId, fullItem);
      expect(store.annotationStore.selectedHistory).toBe(store.annotationStore.history[0]);
      expect(store.annotationStore.selectedHistory.pk).toBeDefined();
      expect(Number(store.annotationStore.selectedHistory.pk)).toBe(historyRowId);
    });
  });

  describe("version volatile", () => {
    it("exposes version from LSF_VERSION or default", () => {
      const store = createStore();
      expect(typeof store.version).toBe("string");
      expect(store.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("submit/update/accept/reject/handleCustomButton when isSubmitting", () => {
    it("updateAnnotation returns early when isSubmitting", () => {
      const store = createStore();
      store.initializeStore({ annotations: [{ result: [] }] });
      store.setFlags({ isSubmitting: true });
      store.updateAnnotation();
      expect(mockInvoke).not.toHaveBeenCalledWith(
        "updateAnnotation",
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it("acceptAnnotation returns early when isSubmitting", () => {
      const store = createStore();
      store.initializeStore({ annotations: [{ result: [] }] });
      store.setFlags({ isSubmitting: true });
      store.acceptAnnotation();
      expect(mockInvoke).not.toHaveBeenCalledWith("acceptAnnotation", expect.anything(), expect.anything());
    });

    it("rejectAnnotation returns early when isSubmitting", () => {
      const store = createStore();
      store.initializeStore({ annotations: [{ result: [] }] });
      store.setFlags({ isSubmitting: true });
      store.rejectAnnotation({});
      expect(mockInvoke).not.toHaveBeenCalledWith("rejectAnnotation", expect.anything(), expect.anything());
    });

    it("handleCustomButton returns early when isSubmitting", () => {
      const store = createStore();
      store.initializeStore({ annotations: [{ result: [] }] });
      store.setFlags({ isSubmitting: true });
      store.handleCustomButton({ name: "submit", title: "Submit" });
      expect(mockInvoke).not.toHaveBeenCalledWith(
        "customButton",
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe("submitAnnotation when validate fails", () => {
    it("does not invoke event when entity.validate returns false", () => {
      const store = createStore();
      store.initializeStore({ annotations: [{ result: [] }] });
      store.annotationStore.selected.validate = jest.fn().mockReturnValue(false);
      store.submitAnnotation();
      expect(mockInvoke).not.toHaveBeenCalledWith("submitAnnotation", expect.anything(), expect.anything());
    });
  });

  describe("submitAnnotation when validate passes", () => {
    it("invokes submitAnnotation event and incrementQueuePosition", async () => {
      const store = createStore({ queueTotal: 5, queuePosition: 0 });
      store.initializeStore({ annotations: [{ result: [] }] });
      const entity = store.annotationStore.selected;
      entity.beforeSend = jest.fn();
      entity.validate = jest.fn().mockReturnValue(true);
      entity.sendUserGenerate = jest.fn();
      entity.dropDraft = jest.fn();
      mockInvoke.mockResolvedValue(undefined);
      store.submitAnnotation();
      await new Promise((r) => setTimeout(r, 300));
      expect(mockInvoke).toHaveBeenCalledWith("submitAnnotation", store, entity);
      expect(store.queuePosition).toBe(1);
    });
  });

  describe("updateAnnotation when validate passes", () => {
    it("invokes updateAnnotation event", async () => {
      const store = createStore();
      store.initializeStore({ annotations: [{ result: [] }] });
      const entity = store.annotationStore.selected;
      entity.beforeSend = jest.fn();
      entity.validate = jest.fn().mockReturnValue(true);
      entity.sendUserGenerate = jest.fn();
      entity.dropDraft = jest.fn();
      mockInvoke.mockResolvedValue(undefined);
      store.updateAnnotation({ extra: "data" });
      await new Promise((r) => setTimeout(r, 300));
      expect(mockInvoke).toHaveBeenCalledWith("updateAnnotation", store, entity, { extra: "data" });
    });
  });
});
