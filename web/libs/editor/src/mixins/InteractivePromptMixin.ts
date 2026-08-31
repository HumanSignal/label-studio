/**
 * MST mixin that adds interactive-ML-prompt state to a control tag.
 *
 * Composed into control tags that can be driven by an ML backend (SAM et al).
 * When the user selects a label in the control AND a capability binding is
 * registered for the control's tag type AND the global auto-annotation
 * toggle is on, clicks/drags on the bound object tag's stage are routed
 * through this state instead of the default draw tool.
 *
 * All state names are prefixed with `interactive` to avoid collisions with
 * existing control-tag fields (some controls already use `state`,
 * `prompts`, etc.).
 */

import { types, type Instance } from "mobx-state-tree";
import { ff } from "@humansignal/core";

const PROMPT_MODE_STORAGE_KEY = "ls.sam.promptMode";

/**
 * The last prompt mode the user picked. Read once at module load instead of
 * on every control-tag instantiation — every RectangleLabels / VectorLabels /
 * etc. in a project would otherwise hit localStorage in its volatile init.
 */
const INITIAL_PROMPT_MODE: "points" | "box" = (() => {
  try {
    const v = window.localStorage.getItem(PROMPT_MODE_STORAGE_KEY);
    if (v === "points" || v === "box") return v;
  } catch {
    // localStorage unavailable (private mode, SSR) — fall through
  }
  return "points";
})();

function writeStoredPromptMode(mode: "points" | "box") {
  try {
    window.localStorage.setItem(PROMPT_MODE_STORAGE_KEY, mode);
  } catch {
    // localStorage write blocked — tolerate silently
  }
}

export type InteractiveState =
  | "idle" // not bound / not active — the control behaves as a plain control
  | "resolving"
  | "stopped"
  | "started"
  | "encoding"
  | "prompting"
  | "tracking"
  | "error";

export interface InteractivePromptPoint {
  x: number;
  y: number;
  positive: boolean;
}

export interface InteractivePromptBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Exported separately from the gated `InteractivePromptMixin` alias below so
// tests can instantiate the real mixin without relying on module-load flag
// state (Bun's module cache isn't reliably bustable per-test).
export const InteractivePromptMixinImpl = types
  .model("InteractivePromptMixin", {})
  .volatile(() => ({
    interactiveState: "idle" as InteractiveState,
    interactiveErrorMessage: "",
    interactiveBackendId: null as number | null,
    interactivePromptMode: INITIAL_PROMPT_MODE,
    interactivePrompts: [] as InteractivePromptPoint[],
    interactivePromptUndoStack: [] as InteractivePromptPoint[][],
    interactivePromptRedoStack: [] as InteractivePromptPoint[][],
    interactiveBox: null as InteractivePromptBox | null,
    interactiveBoxDragStart: null as { x: number; y: number } | null,
    interactiveMaskData: null as Uint8Array | null,
    interactiveMaskWidth: 0,
    interactiveMaskHeight: 0,
    interactiveTrackingProgress: 0,
    interactiveTrackingTotal: 0,
    interactiveTrackingCancelled: false,
    interactiveEncodedFrame: -1,
    interactiveTraceResolution: 512,
    interactiveSmoothing: 0.8,
  }))
  .views((self) => ({
    get isInteractiveActive(): boolean {
      return (
        self.interactiveState === "started" ||
        self.interactiveState === "encoding" ||
        self.interactiveState === "prompting" ||
        self.interactiveState === "tracking"
      );
    },
    get isInteractiveBoxMode(): boolean {
      return self.interactivePromptMode === "box";
    },
    get isInteractiveTracking(): boolean {
      return self.interactiveState === "tracking";
    },
    get hasInteractiveMask(): boolean {
      return self.interactiveMaskData !== null;
    },
    // True whenever an interactive-ML (SAM2) backend is bound to this control.
    // SAM2 always emits a closed mask, so skeleton mode (branching open paths)
    // is meaningless while it's driving the control — vector renderers read
    // this to suppress the control's `skeleton` attribute (BROS-1434).
    get hasInteractiveBackend(): boolean {
      return self.interactiveBackendId !== null;
    },
  }))
  .actions((self) => ({
    setInteractiveBackend(id: number | null) {
      self.interactiveBackendId = id;
      if (id !== null) {
        // Only transition from terminal states — don't clobber an in-flight
        // session (encoding / prompting / tracking) on a re-bind.
        if (self.interactiveState === "idle" || self.interactiveState === "error") {
          self.interactiveState = "stopped";
        }
        return;
      }
      // Unbinding — reset to idle so the next bind re-enters the lifecycle
      // cleanly. Without this, deselect→reselect leaves state stuck in an
      // "active" value, so downstream effects see no change, `ready`
      // never propagates, and the cursor + input capture stay off.
      self.interactiveState = "idle";
      self.interactiveErrorMessage = "";
      self.interactivePrompts = [];
      self.interactivePromptUndoStack = [];
      self.interactivePromptRedoStack = [];
      self.interactiveMaskData = null;
      self.interactiveMaskWidth = 0;
      self.interactiveMaskHeight = 0;
      self.interactiveBox = null;
      self.interactiveBoxDragStart = null;
      self.interactiveTrackingCancelled = true;
    },
    setInteractiveState(state: InteractiveState) {
      self.interactiveState = state;
    },
    setInteractiveError(msg: string) {
      self.interactiveErrorMessage = msg;
      // A BE error used to leave state in "error", which made `isActive`
      // false → cursor stuck in "wait", draft box stuck on screen, and the
      // prompt that caused the error still in the prompts array. Reset the
      // failed prompt (via the undo stack) and clear any in-flight box
      // drag so the user can retry immediately.
      if (self.interactivePromptUndoStack.length > 0) {
        const prev = self.interactivePromptUndoStack[self.interactivePromptUndoStack.length - 1];
        self.interactivePromptUndoStack = self.interactivePromptUndoStack.slice(0, -1);
        self.interactivePrompts = prev;
      } else {
        self.interactivePrompts = [];
      }
      self.interactivePromptRedoStack = [];
      self.interactiveBox = null;
      self.interactiveBoxDragStart = null;
      // If a previously-good mask is still on screen (multi-click refine
      // case), stay in "prompting" so the existing mask preview remains.
      // Otherwise go back to "started" for a fresh attempt.
      self.interactiveState = self.interactiveMaskData ? "prompting" : "started";
    },
    setInteractivePromptMode(mode: "points" | "box") {
      self.interactivePromptMode = mode;
      writeStoredPromptMode(mode);
    },
    startInteractive() {
      if (self.interactiveState === "stopped") {
        self.interactiveState = "started";
        self.interactivePrompts = [];
        self.interactivePromptUndoStack = [];
        self.interactivePromptRedoStack = [];
        self.interactiveMaskData = null;
        self.interactiveMaskWidth = 0;
        self.interactiveMaskHeight = 0;
        self.interactiveBox = null;
        self.interactiveBoxDragStart = null;
      }
    },
    stopInteractive() {
      self.interactiveState = "stopped";
      self.interactivePrompts = [];
      self.interactivePromptUndoStack = [];
      self.interactivePromptRedoStack = [];
      self.interactiveMaskData = null;
      self.interactiveMaskWidth = 0;
      self.interactiveMaskHeight = 0;
      self.interactiveBox = null;
      self.interactiveBoxDragStart = null;
      self.interactiveTrackingCancelled = true;
    },
    setInteractiveMask(data: Uint8Array, width: number, height: number) {
      self.interactiveMaskData = data;
      self.interactiveMaskWidth = width;
      self.interactiveMaskHeight = height;
      // The box was a prompt; the mask is the result — clear the draft box.
      self.interactiveBox = null;
      self.interactiveBoxDragStart = null;
      // A fresh result invalidates any prior error.
      self.interactiveErrorMessage = "";
    },
    clearInteractiveMask() {
      self.interactiveMaskData = null;
      self.interactiveMaskWidth = 0;
      self.interactiveMaskHeight = 0;
      self.interactivePrompts = [];
      self.interactivePromptUndoStack = [];
      self.interactivePromptRedoStack = [];
      self.interactiveBox = null;
      self.interactiveBoxDragStart = null;
    },
    clearInteractiveMaskPreview() {
      self.interactiveMaskData = null;
    },
    addInteractivePrompt(x: number, y: number, positive: boolean) {
      self.interactivePromptUndoStack = [...self.interactivePromptUndoStack, [...self.interactivePrompts]];
      self.interactivePromptRedoStack = [];
      self.interactivePrompts = [...self.interactivePrompts, { x, y, positive }];
      // A retry clears the previous error banner.
      self.interactiveErrorMessage = "";
    },
    removeInteractivePromptAt(index: number) {
      if (index < 0 || index >= self.interactivePrompts.length) return;
      self.interactivePromptUndoStack = [...self.interactivePromptUndoStack, [...self.interactivePrompts]];
      self.interactivePromptRedoStack = [];
      self.interactivePrompts = self.interactivePrompts.filter((_, i) => i !== index);
    },
    setInteractivePrompts(pts: InteractivePromptPoint[]) {
      self.interactivePrompts = pts;
    },
    undoInteractivePrompt(): boolean {
      if (self.interactivePromptUndoStack.length === 0) return false;
      self.interactivePromptRedoStack = [...self.interactivePromptRedoStack, [...self.interactivePrompts]];
      const prev = self.interactivePromptUndoStack[self.interactivePromptUndoStack.length - 1];
      self.interactivePromptUndoStack = self.interactivePromptUndoStack.slice(0, -1);
      self.interactivePrompts = prev;
      return true;
    },
    redoInteractivePrompt(): boolean {
      if (self.interactivePromptRedoStack.length === 0) return false;
      self.interactivePromptUndoStack = [...self.interactivePromptUndoStack, [...self.interactivePrompts]];
      const next = self.interactivePromptRedoStack[self.interactivePromptRedoStack.length - 1];
      self.interactivePromptRedoStack = self.interactivePromptRedoStack.slice(0, -1);
      self.interactivePrompts = next;
      return true;
    },
    startInteractiveBoxDrag(x: number, y: number) {
      self.interactiveBoxDragStart = { x, y };
      self.interactiveBox = { x, y, width: 0, height: 0 };
      // A retry clears the previous error banner.
      self.interactiveErrorMessage = "";
    },
    updateInteractiveBoxDrag(x: number, y: number) {
      if (!self.interactiveBoxDragStart) return;
      const sx = self.interactiveBoxDragStart.x;
      const sy = self.interactiveBoxDragStart.y;
      self.interactiveBox = {
        x: Math.min(sx, x),
        y: Math.min(sy, y),
        width: Math.abs(x - sx),
        height: Math.abs(y - sy),
      };
    },
    endInteractiveBoxDrag(): InteractivePromptBox | null {
      const b = self.interactiveBox;
      self.interactiveBoxDragStart = null;
      if (!b || b.width < 4 || b.height < 4) {
        self.interactiveBox = null;
        return null;
      }
      return { ...b };
    },
    clearInteractiveBox() {
      self.interactiveBox = null;
      self.interactiveBoxDragStart = null;
    },
    startInteractiveTracking(totalFrames: number) {
      self.interactiveState = "tracking";
      self.interactiveTrackingProgress = 0;
      self.interactiveTrackingTotal = totalFrames;
      self.interactiveTrackingCancelled = false;
    },
    setInteractiveTrackingProgress(n: number) {
      self.interactiveTrackingProgress = n;
    },
    setInteractiveTrackingTotal(n: number) {
      self.interactiveTrackingTotal = n;
    },
    cancelInteractiveTracking() {
      self.interactiveTrackingCancelled = true;
    },
    setInteractiveEncodedFrame(frame: number) {
      self.interactiveEncodedFrame = frame;
    },
  }));

/**
 * Empty stub used when the SAM feature flag is off. Composing this adds
 * zero volatile fields and zero actions, so control tags pay no runtime
 * cost for the feature when it's disabled. Consumers in `ml-interactive/`
 * feature-detect via `typeof c.setInteractiveBackend === "function"` before
 * touching any `interactive*` state.
 */
export const InteractivePromptMixinNoop = types.model("InteractivePromptMixinNoop", {});

export const InteractivePromptMixin = ff.isActive(ff.FF_SEGMENT_ANYTHING_ML_BACKEND)
  ? InteractivePromptMixinImpl
  : InteractivePromptMixinNoop;

export type IInteractivePromptMixin = Instance<typeof InteractivePromptMixinImpl>;
