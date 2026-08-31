/**
 * Unit tests for InteractivePromptMixin (mixins/InteractivePromptMixin.ts).
 *
 * We test the concrete `InteractivePromptMixinImpl` / `InteractivePromptMixinNoop`
 * models directly rather than going through the flag-gated `InteractivePromptMixin`
 * alias — Bun's module cache isn't reliably bustable per-test, and the alias
 * is a trivial one-liner (ternary on `ff.isActive(...)`) that doesn't warrant
 * per-case reimport machinery.
 *
 * Coverage:
 *  - bind / unbind (setInteractiveBackend)
 *  - error recovery (setInteractiveError rolls back the failed prompt)
 *  - prompt history (add / undo / redo)
 *  - prompt-mode localStorage persistence
 *  - noop fallback shape
 */

import { types } from "mobx-state-tree";

import { InteractivePromptMixinImpl, InteractivePromptMixinNoop } from "../InteractivePromptMixin";

const TestModel = types.compose(InteractivePromptMixinImpl, types.model({}));

describe("InteractivePromptMixinNoop", () => {
  it("exposes none of the interactive* fields or actions", () => {
    const m = InteractivePromptMixinNoop.create({});
    expect((m as any).interactiveState).toBeUndefined();
    expect(typeof (m as any).setInteractiveBackend).toBe("undefined");
  });
});

describe("InteractivePromptMixinImpl", () => {
  // In-memory Storage-compatible map spied into Storage.prototype so other
  // test files' `spyOn(Storage.prototype, ...)` calls still intercept
  // localStorage traffic. Previous attempts replaced `window.localStorage`
  // outright, which made sibling tests silently miss their own spies
  // (OutlinerTree's `collapsed-label-pos` assertion was the canary).
  const storage = new Map<string, string>();
  let getSpy: ReturnType<typeof spyOn>;
  let setSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    storage.clear();
    getSpy = spyOn(Storage.prototype, "getItem").mockImplementation((k: string) =>
      storage.has(k) ? (storage.get(k) as string) : null,
    );
    setSpy = spyOn(Storage.prototype, "setItem").mockImplementation((k: string, v: string) => {
      storage.set(k, v);
    });
  });

  afterEach(() => {
    getSpy.mockRestore();
    setSpy.mockRestore();
  });

  describe("setInteractiveBackend", () => {
    it("transitions idle → stopped when bound", () => {
      const m = TestModel.create({});
      expect(m.interactiveState).toBe("idle");
      m.setInteractiveBackend(7);
      expect(m.interactiveState).toBe("stopped");
      expect(m.interactiveBackendId).toBe(7);
    });

    it("does not clobber an in-flight `encoding` state on re-bind", () => {
      const m = TestModel.create({});
      m.setInteractiveBackend(7);
      m.setInteractiveState("encoding");
      m.setInteractiveBackend(7);
      expect(m.interactiveState).toBe("encoding");
    });

    it("unbind resets to idle and clears all draft state", () => {
      const m = TestModel.create({});
      m.setInteractiveBackend(7);
      m.setInteractiveState("started");
      m.addInteractivePrompt(10, 20, true);
      m.setInteractiveMask(new Uint8Array([1, 0]), 1, 2);
      m.startInteractiveBoxDrag(0, 0);

      m.setInteractiveBackend(null);

      expect(m.interactiveBackendId).toBeNull();
      expect(m.interactiveState).toBe("idle");
      expect(m.interactivePrompts).toEqual([]);
      expect(m.interactiveMaskData).toBeNull();
      expect(m.interactiveBox).toBeNull();
      expect(m.interactiveBoxDragStart).toBeNull();
    });
  });

  describe("hasInteractiveBackend", () => {
    // Drives skeleton suppression for vector controls: SAM2 always emits a
    // closed mask, so a bound backend means skeleton mode must be ignored
    // (BROS-1434).
    it("is false when idle / unbound", () => {
      const m = TestModel.create({});
      expect(m.hasInteractiveBackend).toBe(false);
    });

    it("is true once a backend is bound", () => {
      const m = TestModel.create({});
      m.setInteractiveBackend(7);
      expect(m.hasInteractiveBackend).toBe(true);
    });

    it("is false again after unbinding", () => {
      const m = TestModel.create({});
      m.setInteractiveBackend(7);
      m.setInteractiveBackend(null);
      expect(m.hasInteractiveBackend).toBe(false);
    });
  });

  describe("setInteractiveError", () => {
    it("rolls back the last prompt and returns to `started` when no mask exists", () => {
      const m = TestModel.create({});
      m.setInteractiveBackend(7);
      m.setInteractiveState("started");
      m.addInteractivePrompt(1, 1, true);
      m.setInteractiveState("encoding");

      m.setInteractiveError("backend kaboom");

      expect(m.interactivePrompts).toEqual([]);
      expect(m.interactiveState).toBe("started");
      expect(m.interactiveErrorMessage).toBe("backend kaboom");
    });

    it("preserves an earlier good mask and returns to `prompting` on refine failure", () => {
      const m = TestModel.create({});
      m.setInteractiveBackend(7);
      m.addInteractivePrompt(1, 1, true);
      m.setInteractiveMask(new Uint8Array([1]), 1, 1); // first click: good mask
      m.addInteractivePrompt(2, 2, true); // second click…

      m.setInteractiveError("second predict failed");

      // Second prompt rolled back, mask from first click still visible.
      expect(m.interactivePrompts).toEqual([{ x: 1, y: 1, positive: true }]);
      expect(m.interactiveMaskData).not.toBeNull();
      expect(m.interactiveState).toBe("prompting");
    });

    it("clears any in-flight draft box on error", () => {
      const m = TestModel.create({});
      m.setInteractiveBackend(7);
      m.startInteractiveBoxDrag(0, 0);
      m.updateInteractiveBoxDrag(50, 50);

      m.setInteractiveError("box predict failed");

      expect(m.interactiveBox).toBeNull();
      expect(m.interactiveBoxDragStart).toBeNull();
    });
  });

  describe("prompt history", () => {
    it("undo restores the previous prompt list and redo re-applies it", () => {
      const m = TestModel.create({});
      m.setInteractiveBackend(7);

      m.addInteractivePrompt(1, 1, true);
      m.addInteractivePrompt(2, 2, false);
      expect(m.interactivePrompts).toHaveLength(2);

      expect(m.undoInteractivePrompt()).toBe(true);
      expect(m.interactivePrompts).toHaveLength(1);
      expect(m.interactivePrompts[0]).toEqual({ x: 1, y: 1, positive: true });

      expect(m.redoInteractivePrompt()).toBe(true);
      expect(m.interactivePrompts).toHaveLength(2);
    });

    it("undo returns false on an empty history", () => {
      const m = TestModel.create({});
      m.setInteractiveBackend(7);
      expect(m.undoInteractivePrompt()).toBe(false);
    });

    it("adding a new prompt after undo clears the redo stack", () => {
      const m = TestModel.create({});
      m.setInteractiveBackend(7);
      m.addInteractivePrompt(1, 1, true);
      m.addInteractivePrompt(2, 2, false);
      m.undoInteractivePrompt();
      m.addInteractivePrompt(3, 3, true);

      expect(m.redoInteractivePrompt()).toBe(false);
    });

    it("addInteractivePrompt clears a prior error message (retry)", () => {
      const m = TestModel.create({});
      m.setInteractiveBackend(7);
      m.setInteractiveError("previous failure");
      expect(m.interactiveErrorMessage).toBe("previous failure");

      m.addInteractivePrompt(1, 1, true);
      expect(m.interactiveErrorMessage).toBe("");
    });
  });

  describe("prompt-mode persistence", () => {
    it("setInteractivePromptMode writes to localStorage", () => {
      const m = TestModel.create({});
      m.setInteractivePromptMode("box");
      expect(storage.get("ls.sam.promptMode")).toBe("box");
    });
  });

  describe("setInteractiveMask", () => {
    it("clears the draft box and any pending error", () => {
      const m = TestModel.create({});
      m.setInteractiveBackend(7);
      m.startInteractiveBoxDrag(0, 0);
      m.setInteractiveError("transient"); // clears box, but leaves message
      m.setInteractiveMask(new Uint8Array([1]), 1, 1);

      expect(m.interactiveMaskData).not.toBeNull();
      expect(m.interactiveBox).toBeNull();
      expect(m.interactiveErrorMessage).toBe("");
    });
  });
});
