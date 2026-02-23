/**
 * Unit tests for core/TimeTraveller.js (parity-63).
 * Covers views (canUndo, canRedo, hasChanges), freeze/unfreeze, recordNow,
 * onUpdate, addUndoState (skip/replace), reinit, afterCreate/beforeDestroy,
 * undo/redo/set/reset, and FF_DEV_1284 branch.
 */
import { applySnapshot, types } from "mobx-state-tree";

const mockIsFF = jest.fn(() => false);
jest.mock("../../utils/feature-flags", () => ({
  isFF: (...args) => mockIsFF(...args),
  FF_DEV_1284: "fflag_fix_front_dev_1284_auto_detect_undo_281022_short",
}));

import TimeTraveller from "../TimeTraveller";

const TargetStore = types.model("TargetStore", {
  value: types.optional(types.number, 0),
});

// Use env.targetStore so we have a single store reference and onSnapshot fires reliably.
const RootWithEnv = types.model("Root", {
  timeTraveller: TimeTraveller,
});

function createRoot(storeSnapshot = { value: 0 }) {
  const store = TargetStore.create(storeSnapshot);
  const root = RootWithEnv.create({ timeTraveller: {} }, { targetStore: store });
  return { root, store };
}

// Build history without relying on onSnapshot (e.g. [init, { value: 1 }, { value: 2 }]).
function addHistoryStates(tt, states) {
  for (const s of states) {
    tt.addUndoState(s);
  }
}

describe("TimeTraveller", () => {
  beforeEach(() => {
    mockIsFF.mockReturnValue(false);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("views", () => {
    it("canUndo is false when undoIdx is 0", () => {
      const { root } = createRoot();
      expect(root.timeTraveller.canUndo).toBe(false);
    });

    it("canUndo is true when undoIdx > 0", () => {
      const { root } = createRoot();
      addHistoryStates(root.timeTraveller, [{ value: 1 }, { value: 2 }]);
      root.timeTraveller.undo(); // at index 1
      expect(root.timeTraveller.canUndo).toBe(true);
    });

    it("canRedo is false when at end of history", () => {
      const { root, store } = createRoot();
      expect(root.timeTraveller.canRedo).toBe(false);
      applySnapshot(store, { value: 1 });
      expect(root.timeTraveller.canRedo).toBe(false);
    });

    it("canRedo is true after undo", () => {
      const { root, store } = createRoot();
      addHistoryStates(root.timeTraveller, [{ value: 1 }]);
      root.timeTraveller.undo();
      expect(root.timeTraveller.canRedo).toBe(true);
    });

    it("hasChanges is false with single state", () => {
      const { root } = createRoot();
      expect(root.timeTraveller.hasChanges).toBe(false);
    });

    it("hasChanges is true after store change", () => {
      const { root } = createRoot();
      addHistoryStates(root.timeTraveller, [{ value: 1 }]);
      expect(root.timeTraveller.hasChanges).toBe(true);
    });
  });

  describe("freeze / unfreeze", () => {
    it("freeze sets isFrozen and resets changesDuringFreeze", () => {
      const { root } = createRoot();
      expect(root.timeTraveller.isFrozen).toBe(false);
      root.timeTraveller.freeze("key1");
      expect(root.timeTraveller.isFrozen).toBe(true);
      root.timeTraveller.unfreeze("key1");
      expect(root.timeTraveller.isFrozen).toBe(false);
    });

    it("multiple freeze keys keep frozen until all unfreeze", () => {
      const { root } = createRoot();
      root.timeTraveller.freeze("a");
      root.timeTraveller.freeze("b");
      root.timeTraveller.unfreeze("a");
      expect(root.timeTraveller.isFrozen).toBe(true);
      root.timeTraveller.unfreeze("b");
      expect(root.timeTraveller.isFrozen).toBe(false);
    });

    it("unfreeze calls recordNow when changesDuringFreeze was set", () => {
      const { root, store } = createRoot();
      root.timeTraveller.freeze("k");
      applySnapshot(store, { value: 1 }); // no new history while frozen
      const lenBefore = root.timeTraveller.history.length;
      root.timeTraveller.unfreeze("k");
      expect(root.timeTraveller.history.length).toBeGreaterThan(lenBefore);
    });

    it("safeUnfreeze only updates isFrozen", () => {
      const { root } = createRoot();
      root.timeTraveller.freeze("k");
      root.timeTraveller.safeUnfreeze("k");
      expect(root.timeTraveller.isFrozen).toBe(false);
    });

    it("unfreeze then addUndoState appends (replace flag was reset)", () => {
      const { root, store } = createRoot();
      root.timeTraveller.freeze("k");
      root.timeTraveller.unfreeze("k");
      addHistoryStates(root.timeTraveller, [{ value: 1 }, { value: 2 }]);
      root.timeTraveller.undo();
      root.timeTraveller.setReplaceNextUndoState(true);
      root.timeTraveller.addUndoState({ value: 99 });
      expect(root.timeTraveller.history.length).toBe(2);
      root.timeTraveller.set(1);
      expect(store.value).toBe(99);
    });
  });

  describe("setSkipNextUndoState / setReplaceNextUndoState", () => {
    it("setSkipNextUndoState(false) allows next addUndoState to record", () => {
      const { root, store } = createRoot();
      addHistoryStates(root.timeTraveller, [{ value: 1 }]);
      root.timeTraveller.setSkipNextUndoState(false);
      applySnapshot(store, { value: 2 });
      expect(root.timeTraveller.history.length).toBe(3);
    });

    it("setSkipNextUndoState prevents next addUndoState from recording", () => {
      const { root, store } = createRoot();
      addHistoryStates(root.timeTraveller, [{ value: 1 }]);
      const len = root.timeTraveller.history.length;
      root.timeTraveller.setSkipNextUndoState(true);
      applySnapshot(store, { value: 2 });
      expect(root.timeTraveller.history.length).toBe(len);
    });

    it("setReplaceNextUndoState replaces current index instead of appending", () => {
      const { root, store } = createRoot();
      addHistoryStates(root.timeTraveller, [{ value: 1 }, { value: 2 }]);
      root.timeTraveller.undo(); // now at index 1, history has 3 items
      root.timeTraveller.setReplaceNextUndoState(true);
      root.timeTraveller.addUndoState({ value: 99 });
      // replace drops future states: [init, {value:1}, *] -> [init, {value:99}]
      expect(root.timeTraveller.history.length).toBe(2);
      root.timeTraveller.set(1);
      expect(store.value).toBe(99);
    });
  });

  describe("recordNow", () => {
    it("recordNow adds current target store snapshot", () => {
      const { root, store } = createRoot();
      applySnapshot(store, { value: 5 });
      const before = root.timeTraveller.history.length;
      root.timeTraveller.recordNow();
      expect(root.timeTraveller.history.length).toBe(before + 1);
    });

    it("recordNow updates lastAdditionTime", () => {
      const { root, store } = createRoot();
      const before = root.timeTraveller.lastAdditionTime.getTime();
      applySnapshot(store, { value: 1 });
      root.timeTraveller.recordNow();
      expect(root.timeTraveller.lastAdditionTime.getTime()).toBeGreaterThanOrEqual(before);
    });
  });

  describe("onUpdate", () => {
    it("calls handler on set/undo/redo and returns unsubscribe", () => {
      const { root, store } = createRoot();
      const handler = jest.fn();
      const unsub = root.timeTraveller.onUpdate(handler);
      applySnapshot(store, { value: 1 });
      root.timeTraveller.undo(); // triggers triggerHandlers
      expect(handler).toHaveBeenCalledWith(true);
      unsub();
      handler.mockClear();
      root.timeTraveller.redo();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("addUndoState", () => {
    it("when frozen sets changesDuringFreeze and does not add", () => {
      const { root } = createRoot();
      root.timeTraveller.freeze("k");
      const len = root.timeTraveller.history.length;
      root.timeTraveller.addUndoState({ value: 999 });
      expect(root.timeTraveller.history.length).toBe(len);
      root.timeTraveller.unfreeze("k");
    });

    it("when not frozen and not skip appends and updates undoIdx and lastAdditionTime", () => {
      const { root, store } = createRoot();
      const beforeTime = root.timeTraveller.lastAdditionTime.getTime();
      root.timeTraveller.addUndoState({ value: 1 });
      expect(root.timeTraveller.history.length).toBe(2);
      expect(root.timeTraveller.undoIdx).toBe(1);
      expect(root.timeTraveller.lastAdditionTime.getTime()).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe("reinit", () => {
    it("resets history to single state and triggers handlers", () => {
      const { root } = createRoot();
      addHistoryStates(root.timeTraveller, [{ value: 1 }, { value: 2 }]);
      const handler = jest.fn();
      root.timeTraveller.onUpdate(handler);
      root.timeTraveller.reinit();
      expect(root.timeTraveller.history.length).toBe(1);
      expect(root.timeTraveller.undoIdx).toBe(0);
      expect(root.timeTraveller.createdIdx).toBe(0);
      expect(handler).toHaveBeenCalledWith(true);
    });

    it("reinit(false) calls handlers with force false", () => {
      const { root } = createRoot();
      addHistoryStates(root.timeTraveller, [{ value: 1 }]);
      const handler = jest.fn();
      root.timeTraveller.onUpdate(handler);
      root.timeTraveller.reinit(false);
      expect(handler).toHaveBeenCalledWith(false);
    });
  });

  describe("afterCreate", () => {
    it("throws when no targetStore and no targetPath", () => {
      const env = {};
      Object.defineProperty(env, "targetStore", { get: () => undefined });
      expect(() => {
        TimeTraveller.create({}, env);
      }).toThrow("Failed to find target store for TimeTraveller");
    });

    it("uses getEnv(self).targetStore when no targetPath", () => {
      const target = TargetStore.create({ value: 10 });
      const env = { targetStore: target };
      const tt = TimeTraveller.create({}, env);
      expect(tt.history.length).toBe(1);
      expect(tt.createdIdx).toBe(0);
    });

    it("uses targetPath with resolvePath when targetPath is set", () => {
      const RootWithPath = types.model("RootWithPath", {
        store: TargetStore,
        timeTraveller: TimeTraveller,
      });
      const root = RootWithPath.create({
        store: { value: 0 },
        timeTraveller: { targetPath: "../store" },
      });
      expect(root.timeTraveller.history.length).toBe(1);
      expect(root.timeTraveller.createdIdx).toBe(0);
      addHistoryStates(root.timeTraveller, [{ value: 1 }]);
      root.timeTraveller.undo();
      expect(root.store.value).toBe(0);
    });
  });

  describe("beforeDestroy", () => {
    it("disposes snapshot listener and clears state", () => {
      const store = TargetStore.create({ value: 0 });
      const tt = TimeTraveller.create({}, { targetStore: store });
      const handler = jest.fn();
      tt.onUpdate(handler);
      addHistoryStates(tt, [{ value: 1 }]);
      tt.undo();
      expect(handler).toHaveBeenCalled();
      const { destroy } = require("mobx-state-tree");
      destroy(tt);
      handler.mockClear();
      applySnapshot(store, { value: 2 });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("undo / redo / set", () => {
    it("undo applies previous history state", () => {
      const { root, store } = createRoot();
      addHistoryStates(root.timeTraveller, [{ value: 1 }, { value: 2 }]);
      root.timeTraveller.undo();
      expect(store.value).toBe(1);
      root.timeTraveller.undo();
      expect(store.value).toBe(0);
    });

    it("redo applies next history state", () => {
      const { root, store } = createRoot();
      addHistoryStates(root.timeTraveller, [{ value: 1 }, { value: 2 }]);
      root.timeTraveller.undo();
      root.timeTraveller.undo();
      root.timeTraveller.redo();
      expect(store.value).toBe(1);
      root.timeTraveller.redo();
      expect(store.value).toBe(2);
    });

    it("set applies history at index and triggers handlers", () => {
      const { root, store } = createRoot();
      addHistoryStates(root.timeTraveller, [{ value: 1 }, { value: 2 }]);
      const handler = jest.fn();
      root.timeTraveller.onUpdate(handler);
      root.timeTraveller.set(0);
      expect(store.value).toBe(0);
      expect(handler).toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("applies createdIdx state and triggers handlers", () => {
      const { root, store } = createRoot();
      addHistoryStates(root.timeTraveller, [{ value: 1 }, { value: 2 }]);
      root.timeTraveller.reset();
      expect(store.value).toBe(0);
    });
  });

  describe("FF_DEV_1284", () => {
    it("set schedules setSkipNextUndoState(false) when flag is on", () => {
      mockIsFF.mockReturnValue(true);
      const { root, store } = createRoot();
      addHistoryStates(root.timeTraveller, [{ value: 1 }]);
      root.timeTraveller.undo();
      root.timeTraveller.set(1);
      expect(mockIsFF).toHaveBeenCalledWith("fflag_fix_front_dev_1284_auto_detect_undo_281022_short");
      jest.runAllTimers();
      expect(root.timeTraveller.skipNextUndoState).toBe(false);
    });
  });
});
