import { types } from "mobx-state-tree";

import { guidGenerator } from "../core/Helpers";
import { AreaMixin } from "../mixins/AreaMixin";
import { AnnotationMixin } from "../mixins/AnnotationMixin";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import { VideoModel } from "../tags/object/Video";

export const onlyProps = (props, obj) => {
  return Object.fromEntries(props.map((prop) => [prop, obj[prop]]));
};

const Model = types
  .model("VideoRegionModel", {
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    object: types.late(() => types.reference(VideoModel)),

    sequence: types.frozen([]),
  })
  .preProcessSnapshot((snapshot) => {
    return { ...snapshot, sequence: snapshot.sequence || snapshot.value.sequence };
  })
  .volatile(() => ({
    hideable: true,
  }))
  .views((self) => ({
    get parent() {
      return self.object;
    },

    getShape() {
      throw new Error("Method getShape be implemented on a shape level");
    },

    getVisibility() {
      return true;
    },
  }))
  .actions((self) => ({
    updateShape() {
      throw new Error("Method updateShape must be implemented on a shape level");
    },

    onSelectInOutliner() {
      // skip video to the first frame of this region
      // @todo hidden/disabled timespans?
      self.object.setFrame(self.sequence[0].frame);
    },

    serialize() {
      const { framerate, length: framesCount } = self.object;

      const duration = self.object?.ref?.current?.duration ?? 0;

      const value = {
        framesCount,
        duration,
        sequence: self.sequence.map((keyframe) => {
          return { ...keyframe, time: keyframe.frame / framerate };
        }),
      };

      return { value };
    },

    /**
     * Insert or replace the keypoint at `frame` with the given `enabled`
     * state. Needed because `updateShape` force-sets `enabled: true`, which
     * makes it impossible to terminate a tracked region's lifespan from
     * outside this model.
     */
    setLifespanAt(frame, enabled) {
      const existingIndex = self.sequence.findIndex((k) => k.frame === frame);
      const keypoint = { frame, enabled };
      if (existingIndex >= 0) {
        self.sequence = [
          ...self.sequence.slice(0, existingIndex),
          { ...self.sequence[existingIndex], ...keypoint },
          ...self.sequence.slice(existingIndex + 1),
        ];
      } else {
        self.sequence = [...self.sequence, keypoint].sort((a, b) => a.frame - b.frame);
      }
    },

    toggleLifespan(frame) {
      const keypoint = self.closestKeypoint(frame, true);

      if (keypoint) {
        const index = self.sequence.indexOf(keypoint);

        self.sequence = [
          ...self.sequence.slice(0, index),
          { ...keypoint, enabled: !keypoint.enabled },
          ...self.sequence.slice(index + 1),
        ];
      }
    },

    addKeypoint(frame) {
      const sequence = Array.from(self.sequence);
      const closestKeypoint = self.closestKeypoint(frame);
      const newKeypoint = {
        ...(self.getShape(frame) ??
          closestKeypoint ?? {
            x: 0,
            y: 0,
          }),
        enabled: closestKeypoint?.enabled ?? true,
        frame,
      };

      sequence.push(newKeypoint);

      sequence.sort((a, b) => a.frame - b.frame);

      self.sequence = sequence;

      self.updateShape(
        {
          ...newKeypoint,
        },
        newKeypoint.frame,
      );
    },

    removeKeypoint(frame) {
      self.sequence = self.sequence.filter((closestKeypoint) => closestKeypoint.frame !== frame);
    },

    /**
     * Replace the entire keyframe sequence atomically (e.g. after tracking
     * cancel prune — BROS-1511).
     */
    replaceSequence(next) {
      self.sequence = Array.isArray(next) ? next : [];
    },

    isInLifespan(targetFrame) {
      const closestKeypoint = self.closestKeypoint(targetFrame);

      if (closestKeypoint) {
        const { enabled, frame } = closestKeypoint;

        if (frame === targetFrame && !enabled) return true;
        return enabled;
      }
      return false;
    },

    closestKeypoint(targetFrame, onlyPrevious = false) {
      const seq = self.sequence;
      let result;

      const keypoints = seq.filter(({ frame }) => frame <= targetFrame);

      result = keypoints[keypoints.length - 1];

      if (!result && onlyPrevious !== true) {
        result = seq.find(({ frame }) => frame >= targetFrame);
      }

      return result;
    },
  }));

const VideoRegion = types.compose(
  "VideoRegionModel",
  RegionsMixin,
  AreaMixin,
  AnnotationMixin,
  NormalizationMixin,
  Model,
);

export { VideoRegion };
