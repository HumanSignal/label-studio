/**
 * Adapter that exposes a control-tag with InteractivePromptMixin in the
 * shape the primitives (useBackendInference, useInputHandlers,
 * useTrackForward) expect.
 *
 * Mobx reactivity: all getters read `control.interactive*` observables, so
 * reading the adapter inside an observer subscribes to the underlying
 * state — a standard mobx pattern for computed wrappers.
 */

import type { InteractiveBinding } from "./types";

const BITMASK_TYPES = new Set(["bitmask", "bitmasklabels", "bitmaskregion"]);
const RECTANGLE_TYPES = new Set(["rectanglelabels", "rectangle", "videorectanglelabels", "videorectangle"]);
const VIDEO_OBJECT_TYPES = new Set(["video", "videorectangle"]);

export interface InteractiveController {
  // refs resolved from the control + its object tag
  annotation: any;
  imageTag: any;
  selectedControl: any;

  // state
  state: string;
  isActive: boolean;
  isTracking: boolean;
  isVideo: boolean;
  isBoxMode: boolean;
  isBitmask: boolean;
  isRectangle: boolean;

  // prompts / box / mask
  prompts: any[];
  box: any;
  boxDragStart: any;
  maskData: Uint8Array | null;
  maskWidth: number;
  maskHeight: number;

  // tracking
  trackingProgress: number;
  trackingTotal: number;
  trackingCancelled: boolean;
  encodedFrame: number;

  // options
  traceResolution: number;
  smoothing: number;
  prompt: "points" | "box";

  // binding info — the backend id is needed by useBackendInference; the
  // feature flags drive optional UI (e.g., Track Forward button).
  backendId: number;
  features: Set<string>;

  // video
  currentVideoFrame: number;

  // capability toggle
  useAutoAnnotationToggle: boolean;
  autoAnnotationEnabled: boolean;

  // actions (writes)
  setState(s: string): void;
  setError(msg: string): void;
  setMask(data: Uint8Array, w: number, h: number): void;
  clearMask(): void;
  clearMaskPreview(): void;
  addPrompt(x: number, y: number, positive: boolean): void;
  removePromptAt(i: number): void;
  setPrompts(pts: any[]): void;
  undoPrompt(): boolean;
  redoPrompt(): boolean;
  startBoxDrag(x: number, y: number): void;
  updateBoxDrag(x: number, y: number): void;
  endBoxDrag(): any;
  clearBox(): void;
  startTracking(n: number): void;
  setTrackingProgress(n: number): void;
  setTrackingTotal(n: number): void;
  cancelTracking(): void;
  setEncodedFrame(f: number): void;
  stop(): void;
  start(): void;
}

/**
 * Build a controller from an MST control tag that has InteractivePromptMixin
 * composed in. Caller passes the resolved binding (the specific ML backend
 * id + capability features) — the controller carries it so primitives can
 * pick up the backendId without a separate lookup.
 */
export function makeInteractiveController(control: any, binding: InteractiveBinding): InteractiveController {
  return {
    // — refs —
    get annotation() {
      return control.annotation;
    },
    get imageTag() {
      return control.annotation?.names?.get(control.toname) ?? null;
    },
    get selectedControl() {
      return control;
    },

    // — state —
    get state() {
      return control.interactiveState;
    },
    get isActive() {
      return control.isInteractiveActive;
    },
    get isTracking() {
      return control.isInteractiveTracking;
    },
    get isVideo() {
      const tag = this.imageTag;
      const t = (tag?.type ?? "").toLowerCase();
      return VIDEO_OBJECT_TYPES.has(t);
    },
    get isBoxMode() {
      return control.isInteractiveBoxMode;
    },
    get isBitmask() {
      return BITMASK_TYPES.has((control.type ?? "").toLowerCase());
    },
    get isRectangle() {
      return RECTANGLE_TYPES.has((control.type ?? "").toLowerCase());
    },

    // — prompts / box / mask —
    get prompts() {
      return control.interactivePrompts;
    },
    get box() {
      return control.interactiveBox;
    },
    get boxDragStart() {
      return control.interactiveBoxDragStart;
    },
    get maskData() {
      return control.interactiveMaskData;
    },
    get maskWidth() {
      return control.interactiveMaskWidth;
    },
    get maskHeight() {
      return control.interactiveMaskHeight;
    },

    // — tracking —
    get trackingProgress() {
      return control.interactiveTrackingProgress;
    },
    get trackingTotal() {
      return control.interactiveTrackingTotal;
    },
    get trackingCancelled() {
      return control.interactiveTrackingCancelled;
    },
    get encodedFrame() {
      return control.interactiveEncodedFrame;
    },

    // — options —
    get traceResolution() {
      return control.interactiveTraceResolution;
    },
    get smoothing() {
      return control.interactiveSmoothing;
    },
    get prompt() {
      return control.interactivePromptMode;
    },

    // — binding —
    backendId: binding.backendId,
    features: binding.features,

    // — video —
    get currentVideoFrame() {
      const tag = this.imageTag;
      return tag?.frame ?? tag?.currentFrame ?? 0;
    },

    // — auto-annotation —
    useAutoAnnotationToggle: true,
    get autoAnnotationEnabled() {
      return control.annotation?.store?.autoAnnotation ?? false;
    },

    // — actions —
    setState: (s) => control.setInteractiveState(s),
    setError: (msg) => control.setInteractiveError(msg),
    setMask: (data, w, h) => control.setInteractiveMask(data, w, h),
    clearMask: () => control.clearInteractiveMask(),
    clearMaskPreview: () => control.clearInteractiveMaskPreview(),
    addPrompt: (x, y, positive) => control.addInteractivePrompt(x, y, positive),
    removePromptAt: (i) => control.removeInteractivePromptAt(i),
    setPrompts: (pts) => control.setInteractivePrompts(pts),
    undoPrompt: () => control.undoInteractivePrompt(),
    redoPrompt: () => control.redoInteractivePrompt(),
    startBoxDrag: (x, y) => control.startInteractiveBoxDrag(x, y),
    updateBoxDrag: (x, y) => control.updateInteractiveBoxDrag(x, y),
    endBoxDrag: () => control.endInteractiveBoxDrag(),
    clearBox: () => control.clearInteractiveBox(),
    startTracking: (n) => control.startInteractiveTracking(n),
    setTrackingProgress: (n) => control.setInteractiveTrackingProgress(n),
    setTrackingTotal: (n) => control.setInteractiveTrackingTotal(n),
    cancelTracking: () => control.cancelInteractiveTracking(),
    setEncodedFrame: (f) => control.setInteractiveEncodedFrame(f),
    stop: () => control.stopInteractive(),
    start: () => control.startInteractive(),
  };
}
