import { types } from "mobx-state-tree";

import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import Registry from "../core/Registry";
import { AreaMixin } from "../mixins/AreaMixin";
import { VideoRegion } from "./VideoRegion";

/**
 * Interpolate a single vertex between two keyframes.
 * Linear interpolation: prev + (next - prev) * r (i.e. prev.x + (next.x - prev.x) * r).
 * Also interpolates controlPoint1/controlPoint2 when both keyframes have them (bezier).
 */
const interpolateVertex = (prev, next, r) => {
  const result = {
    ...prev,
    x: prev.x + (next.x - prev.x) * r,
    y: prev.y + (next.y - prev.y) * r,
  };

  if (prev.controlPoint1 && next.controlPoint1) {
    result.controlPoint1 = {
      x: prev.controlPoint1.x + (next.controlPoint1.x - prev.controlPoint1.x) * r,
      y: prev.controlPoint1.y + (next.controlPoint1.y - prev.controlPoint1.y) * r,
    };
  }

  if (prev.controlPoint2 && next.controlPoint2) {
    result.controlPoint2 = {
      x: prev.controlPoint2.x + (next.controlPoint2.x - prev.controlPoint2.x) * r,
      y: prev.controlPoint2.y + (next.controlPoint2.y - prev.controlPoint2.y) * r,
    };
  }

  return result;
};

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

const Model = types
  .model("VideoVectorRegionModel", {
    type: "videovectorregion",
  })
  .volatile(() => ({
    vectorRef: null,
  }))
  .views((self) => ({
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
    get closable() {
      return self.control?.closable ?? false;
    },
    get minPoints() {
      const min = self.control?.minpoints;
      return min ? Number.parseInt(min) : undefined;
    },
    get maxPoints() {
      const max = self.control?.maxpoints;
      return max ? Number.parseInt(max) : undefined;
    },
    get vertices() {
      const kf = self.sequence[0];
      return kf?.vertices ?? [];
    },
    get closed() {
      const kf = self.sequence[0];
      return kf?.closed ?? false;
    },
    get atMaxLength() {
      return self.maxPoints && self.vertices.length === self.maxPoints;
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
  }))
  .actions((self) => ({
    setVectorRef(ref) {
      self.vectorRef = ref;
    },

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

    startPoint(x, y) {
      self.vectorRef?.startPoint(x, y);
    },

    updatePoint(x, y) {
      self.vectorRef?.updatePoint(x, y);
    },

    commitPoint(x, y) {
      self.vectorRef?.commitPoint(x, y);
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
