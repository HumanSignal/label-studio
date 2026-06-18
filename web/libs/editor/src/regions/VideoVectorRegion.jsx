import { types } from "mobx-state-tree";

import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import Registry from "../core/Registry";
import { AreaMixin } from "../mixins/AreaMixin";
import { VideoRegion } from "./VideoRegion";
import ToolsManager from "../tools/Manager";

/**
 * Interpolate a single vertex between two keyframes.
 * Linear interpolation: prev + (next - prev) * r.
 */
const interpolateVertex = (prev, next, r) => ({
  ...prev,
  x: prev.x + (next.x - prev.x) * r,
  y: prev.y + (next.y - prev.y) * r,
});

/**
 * Interpolate all vertices between two keyframes.
 * Matches vertices by ID; unmatched vertices from prev are kept as-is.
 */
const interpolateVertices = (prevKeyframe, nextKeyframe, frame) => {
  const r = (frame - prevKeyframe.frame) / (nextKeyframe.frame - prevKeyframe.frame);

  const prevVertices = prevKeyframe.vertices || [];
  const nextVertices = nextKeyframe.vertices || [];

  const nextMap = new Map(nextVertices.map((v) => [v.id, v]));

  return prevVertices.map((prevV) => {
    const nextV = nextMap.get(prevV.id);

    if (!nextV) return prevV;
    return interpolateVertex(prevV, nextV, r);
  });
};

/**
 * VideoVectorRegion — Vector graphics region for video annotation.
 *
 * Follows the same structure as the image VectorRegion, but stores coordinates
 * as percentages (0-100) in a keyframe `sequence` (via the VideoRegion mixin).
 * The view component (VideoVectorShape) handles percent-to-pixel conversion.
 *
 * Coordinate flow:
 *   MobX store (% in sequence) <-> VideoVectorShape (px for KonvaVector)
 */
const Model = types
  .model("VideoVectorRegionModel", {
    type: "videovectorregion",

    readonly: types.optional(types.boolean, false),

    transformMode: false,
  })
  .volatile(() => ({
    mouseOverStartPoint: false,
    selectedPoint: null,
    hideable: true,
    _supportsTransform: true,
    useTransformer: false,
    preferTransformer: false,
    supportsRotate: true,
    supportsScale: true,
    vectorRef: null,
    groupRef: null,
    // Set by the view (VideoVector.jsx). Appends a single vertex at canvas pixel
    // coords, reading the live store each call so rapid clicks never drop a point.
    appendVertexFn: null,
  }))
  .views((self) => ({
    // --- Video-specific views ---

    getShape(frame) {
      let prev;
      let next;

      for (const item of self.sequence) {
        if (item.frame === frame) {
          return { vertices: item.vertices || [], closed: item.closed ?? false };
        }

        if (item.frame > frame) {
          next = item;
          break;
        }
        prev = item;
      }

      if (!prev) return null;
      if (!next) return { vertices: prev.vertices || [], closed: prev.closed ?? false };

      return {
        vertices: interpolateVertices(prev, next, frame),
        closed: prev.closed ?? false,
      };
    },

    getVisibility() {
      return true;
    },

    get control() {
      return self.results.find((result) => result.from_name.tools)?.from_name;
    },

    get vertices() {
      const kf = self.sequence[0];
      return kf?.vertices ?? [];
    },

    get closed() {
      const kf = self.sequence[0];
      return kf?.closed ?? false;
    },

    // --- Ported from image VectorRegion ---

    get closable() {
      // A region that is already a closed contour is, by definition, closable —
      // e.g. SAM2 always produces closed polygons (BROS-1422) even when the
      // control's `closable` attribute is false. Without this, finished/incomplete
      // would treat such a region as an unfinished open path.
      return self.closed || (self.control?.closable ?? false);
    },
    get minPoints() {
      const min = self.control?.minpoints;
      return min ? Number.parseInt(min) : undefined;
    },
    get maxPoints() {
      const max = self.control?.maxpoints;
      return max ? Number.parseInt(max) : undefined;
    },
    get incomplete() {
      if (self.atMaxLength) return false;
      const notClosed = self.closable === true && self.closed === false;
      const notFinished = self.minPoints && self.vertices.length < self.minPoints;
      return notClosed || notFinished;
    },
    get finished() {
      if (self.closable) return !self.incomplete;
      if (self.atMaxLength) return true;
      return false;
    },
    get atMaxLength() {
      return self.maxPoints && self.vertices.length === self.maxPoints;
    },

    get pointEnabledSize() {
      const customEnabledSize = self.control?.pointsizeenabled;
      return customEnabledSize ? Number.parseInt(customEnabledSize) : 5;
    },
    get pointDisabledSize() {
      const customDisabledSize = self.control?.pointsizedisabled;
      return customDisabledSize ? Number.parseInt(customDisabledSize) : 3;
    },
    get pointRadiusFromSize() {
      const size = self.control?.pointsize ?? "small";
      switch (size) {
        case "small":
          return { enabled: 4, disabled: 3 };
        case "medium":
          return { enabled: 6, disabled: 4 };
        case "large":
          return { enabled: 8, disabled: 6 };
        default:
          return { enabled: 6, disabled: 4 };
      }
    },
    get pointStyle() {
      return self.control?.pointstyle ?? "circle";
    },
    get disabled() {
      const objectTag = self.object;
      const manager = objectTag ? ToolsManager.getInstance({ name: objectTag.name }) : null;
      const tool = manager?.findSelectedTool?.();
      return (tool?.disabled ?? false) || self.isReadOnly() || (!self.selected && !self.isDrawing);
    },
  }))
  .actions((self) => ({
    // --- Video-specific actions ---

    updateShape(data, frame) {
      const newItem = {
        ...data,
        frame,
        enabled: true,
      };

      const kp = self.closestKeypoint(frame);
      const index = self.sequence.findIndex((item) => item.frame >= frame);

      if (index < 0) {
        self.sequence = [...self.sequence, newItem];
      } else {
        const keypoint = {
          ...(self.sequence[index] ?? {}),
          ...data,
          enabled: kp?.enabled ?? true,
          frame,
        };

        self.sequence = [
          ...self.sequence.slice(0, index),
          keypoint,
          ...self.sequence.slice(index + (self.sequence[index].frame === frame)),
        ];
      }
    },

    // --- Ported from image VectorRegion ---

    setMouseOverStartPoint(value) {
      self.mouseOverStartPoint = value;
    },

    closePoly() {
      if (!self.closable) return;
      self.vectorRef?.close();
    },

    _selectArea(additiveMode = false, preserveTransformMode = false) {
      const annotation = self.annotation;
      if (!preserveTransformMode) {
        self.setTransformMode(false);
      }
      if (!annotation) return;

      if (additiveMode) {
        annotation.toggleRegionSelection(self);
      } else {
        const wasNotSelected = !self.selected;

        if (wasNotSelected) {
          annotation.selectArea(self);
        } else {
          annotation.unselectAll();
        }
      }
    },

    setHighlight(val) {
      self._highlighted = val;
    },

    isTransforming() {
      if (!self.vectorRef || !self.selected) {
        return false;
      }
      try {
        const selection = self.vectorRef.getSelectedPointIds();
        return selection.length > 1;
      } catch {
        return false;
      }
    },

    segGroupRef(ref) {
      self.groupRef = ref;
    },

    setKonvaVectorRef(ref) {
      self.vectorRef = ref;
    },

    setAppendVertexFn(fn) {
      self.appendVertexFn = fn;
    },

    /**
     * Append a vertex at the given canvas pixel coordinates.
     *
     * Delegates to the handler registered by the view, which reads the current
     * vertices straight from the MobX store on every call. This avoids the race
     * where point creation rebuilt the list from a stale React-prop snapshot and
     * silently dropped points during rapid clicking (BROS-1206). Returns false
     * when no handler is registered yet (e.g. the very first click before the
     * region's view has mounted), letting the caller fall back to the legacy path.
     */
    addVertexAtCanvasPoint(x, y) {
      if (typeof self.appendVertexFn !== "function") return false;
      self.appendVertexFn(x, y);
      return true;
    },

    selectRegion(preserveTransformMode = false) {
      if (!preserveTransformMode) {
        self.setTransformMode(false);
      }
    },

    startPoint(x, y) {
      if (self.isReadOnly()) return;
      self.vectorRef?.startPoint(x, y);
    },

    updatePoint(x, y) {
      if (self.isReadOnly()) return;
      self.vectorRef?.updatePoint(x, y);
    },

    commitPoint(x, y) {
      if (self.isReadOnly()) return;
      self.vectorRef?.commitPoint(x, y);
    },

    handleFinish() {
      const objectTag = self.object;
      const manager = objectTag ? ToolsManager.getInstance({ name: objectTag.name }) : null;
      const tool = manager?.findSelectedTool?.();

      if (tool?.currentArea) {
        tool.commitDrawingRegion?.();
      } else {
        self.annotation?.toggleRegionSelection(self);
      }
      tool?.complete?.();
    },

    toggleTransformMode() {
      self.setTransformMode(!self.transformMode);
    },

    setTransformMode(transformMode) {
      self.transformMode = transformMode;
    },

    applyTransform() {
      if (!self.vectorRef) return;

      if (typeof self.vectorRef.commitMultiRegionTransform === "function") {
        self.vectorRef.commitMultiRegionTransform();
      }
    },

    deleteRegion() {
      const isMultiRegionSelected = self.object?.selectedRegions?.length > 1;

      if (!isMultiRegionSelected) {
        if (self.vectorRef && typeof self.vectorRef.getSelectedPointIds === "function") {
          const selectedPointIds = self.vectorRef.getSelectedPointIds();
          const totalPoints = self.vertices.length;

          if (selectedPointIds.length > 0 && selectedPointIds.length < totalPoints) {
            if (typeof self.vectorRef.deletePointsByIds === "function") {
              self.vectorRef.deletePointsByIds(selectedPointIds);
              return;
            }
          }
        }
      }

      const objectTag = self.object;
      const manager = objectTag ? ToolsManager.getInstance({ name: objectTag.name }) : null;
      const selectedTool = manager?.findSelectedTool?.();
      selectedTool?.enable?.();

      // If this region is the tool's active (still unfinished) drawing area,
      // clear the tool's drawing state before it is destroyed. Otherwise the
      // tool stays stuck in "drawing" mode pointing at a dead region and no new
      // region can be started afterwards. BROS-1207.
      if (selectedTool?.getCurrentArea?.() === self || selectedTool?.currentArea === self) {
        selectedTool.resetDrawingState?.();
      }

      if (self.annotation?.isReadOnly()) return;
      if (self.isReadOnly()) return;
      if (self.selected) self.annotation.unselectAll(true);
      if (self.destroyRegion) self.destroyRegion();
      self.annotation.deleteRegion(self);
    },
  }));

const VideoVectorRegionModel = types.compose(
  "VideoVectorRegionModel",
  RegionsMixin,
  VideoRegion,
  AreaMixin,
  NormalizationMixin,
  Model,
);

Registry.addRegionType(VideoVectorRegionModel, "video", (value) => {
  if (value.vertices) return true;
  if (value.sequence?.[0]?.vertices !== undefined) return true;
  return false;
});

export { VideoVectorRegionModel };
