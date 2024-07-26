import { getRoot, types } from "mobx-state-tree";
import React from "react";

import { AnnotationMixin } from "../../../mixins/AnnotationMixin";
import IsReadyMixin from "../../../mixins/IsReadyMixin";
import ProcessAttrsMixin from "../../../mixins/ProcessAttrs";
import { SyncableMixin } from "../../../mixins/Syncable";
import { parseValue } from "../../../utils/data";
import ObjectBase from "../Base";

/**
 * Video tag plays a simple video file. Use for video annotation tasks such as classification and transcription.
 *
 * Use with the following data types: video
 * @example
 * <!--Labeling configuration to display a video on the labeling interface-->
 * <View>
 *   <Video name="video" value="$video" />
 * </View>
 * @example
 * <!-- Video classification -->
 * <View>
 *   <Video name="video" value="$video" />
 *   <Choices name="ch" toName="video">
 *     <Choice value="Positive" />
 *     <Choice value="Negative" />
 *   </Choices>
 * </View>
 * @example
 * <!-- Video transcription -->
 * <View>
 *   <Video name="video" value="$video" />
 *   <TextArea name="ta" toName="video" />
 * </View>
 * @name Video
 * @meta_title Video Tag for Video Labeling
 * @meta_description Customize Label Studio with the Video tag for basic video annotation tasks for machine learning and data science projects.
 * @param {string} name Name of the element
 * @param {string} value URL of the video
 * @param {number} [frameRate=24] video frame rate per second; default is 24; can use task data like `$fps`
 * @param {string} [sync] object name to sync with
 * @param {boolean} [muted=false] muted video
 * @param {number} [height=600] height of the video
 */

const TagAttrs = types.model({
  value: types.maybeNull(types.string),
  hotkey: types.maybeNull(types.string),
  framerate: types.optional(types.string, "24"),
  height: types.optional(types.string, "600"),
  muted: false,
});

const Model = types
  .model({
    type: "video",
    _value: types.optional(types.string, ""),
    // special flag to store labels inside result, but under original type
    // @todo make it able to be disabled
    mergeLabelsAndResults: true,
  })
  .volatile(() => ({
    errors: [],
    speed: 1,
    ref: React.createRef(),
    frame: 1,
    length: 1,
  }))
  .views((self) => ({
    get store() {
      return getRoot(self);
    },

    get currentFrame() {
      return self.ref.current?.position ?? 1;
    },

    control() {
      return self.annotation.toNames.get(self.name)?.find((s) => !s.type.endsWith("labels"));
    },

    videoControl() {
      return self.annotation.toNames.get(self.name)?.find((s) => s.type.includes("video"));
    },

    states() {
      return self.annotation.toNames.get(self.name)?.filter((s) => s.type.endsWith("labels"));
    },

    activeStates() {
      const states = self.states();

      return states ? states.filter((c) => c.isSelected === true) : null;
    },

    get hasStates() {
      const states = self.states();

      return states && states.length > 0;
    },
  }))
  .actions((self) => ({
    afterCreate() {
      // normalize framerate — should be string with number of frames per second
      const framerate = Number(parseValue(self.framerate, self.store.task?.dataObj));

      if (!framerate || isNaN(framerate)) self.framerate = "24";
      else if (framerate < 1) self.framerate = String(1 / framerate);
      else self.framerate = String(framerate);
    },
  }))
  ////// Sync actions
  .actions((self) => ({
    ////// Outgoing

    /**
     * Wrapper to always send important data
     * @param {string} event
     * @param {any} data
     */
    triggerSync(event, data) {
      if (!self.ref.current) return;

      self.syncSend(
        {
          playing: self.ref.current.playing,
          time: self.ref.current.currentTime,
          ...data,
        },
        event,
      );
    },

    triggerSyncPlay() {
      self.triggerSync("play", { playing: true });
    },

    triggerSyncPause() {
      self.triggerSync("pause", { playing: false });
    },

    ////// Incoming

    registerSyncHandlers() {
      ["play", "pause", "seek"].forEach((event) => {
        self.syncHandlers.set(event, self.handleSync);
      });
      self.syncHandlers.set("speed", self.handleSyncSpeed);
    },

    handleSync(data) {
      if (!self.ref.current) return;

      const video = self.ref.current;

      if (data.playing) {
        if (!video.playing) video.play();
      } else {
        if (video.playing) video.pause();
      }

      if (data.speed) {
        self.speed = data.speed;
      }

      video.currentTime = data.time;
    },

    handleSyncSpeed({ speed }) {
      self.speed = speed;
    },

    handleSeek() {
      self.triggerSync("seek");
    },

    syncMuted(muted) {
      self.muted = muted;
    },
  }))
  .actions((self) => {
    return {
      setLength(length) {
        self.length = length;
      },

      setOnlyFrame(frame) {
        if (self.frame !== frame) {
          self.frame = frame;
        }
      },

      setFrame(frame) {
        if (self.frame !== frame && self.framerate) {
          self.frame = frame;
          self.ref.current.currentTime = frame / self.framerate;
        }
      },

      /**
       * Update per frame classifications view; analogue for `updateFromResult()` but with data for current frame
       */
      updatePerFrameViews() {
        const perFrameClassifications = self.annotationStore.toNames.get(self.name).filter(t => t.perframe);
        const regions = self.regs.filter(reg => reg.choices && reg.isInLifespan(self.frame));
        // @todo `choices` are too specific
        const values = regions.map(reg => reg.choices).flat();

        perFrameClassifications.forEach((tag) => tag.updateFromResult(values));
      },

      /**
       * Update the region, associated with `tag` and `value` to reflect the action in control.
       * For Choices it will add keypoint when we select checkbox and remove when we unselect.
       * @todo this is specific solution for per-frame Choices, it will need corrections to support other types.
       * @todo for example `selected` might be changed for broader semantics like whether to add value or to remove.
       * @todo or `value` might be stored in sequence, not right after it.
       * @param {object} controlTag the tag to manage regions from
       * @param {*} value value for current region
       * @param {boolean} selected are we creating keypoints, because value was just added? or removing?
       */
      updatePerFrameRegion(controlTag, value, selected) {
        const video = controlTag.toNameTag;
        const resultType = controlTag.resultType;
        // for Choices we have one result/region per one choice, so pick the relevant one
        const perFrameResult = self.annotation.results.find((r) =>
          r.from_name === controlTag && String(r.value[resultType]) === String(value)
        );
        let region = perFrameResult?.area;

        if (selected) {
          // 1. we need to add keypoint or create a region if we are adding
          if (region) {
            region.addKeypoint(video.frame);
          } else {
            region = video.addRegion(
              { enabled: false },
              { [resultType]: value },
              controlTag,
            );
          }
        } else {
          // basically it's impossible case, because we can remove value only if we have one;
          // and we can have value only when region exists. but checking just in case.
          if (!region) return;
          // 2. we need to remove keypoint (and even a region) if we are removing
          const closestKeypoint = region.closestKeypoint(video.frame);
          if (closestKeypoint.frame === video.frame) {
            region.removeKeypoint(video.frame);
            if (!region.sequence.length) {
              region.deleteRegion();
            }
          } else {
            region.toggleLifespan(video.frame);
          }
        }

        // always select the region if possible to do move action afterwards
        if (region?.sequence.length) self.annotation.selectArea(region);
      },

      addRegion(data, resultValue = {}, anotherControl = null) {
        const control = anotherControl ?? self.videoControl() ?? self.control();

        const sequence = [
          {
            // @todo maybe better not to allow to override frame?
            frame: self.frame,
            enabled: true,
            // @todo too specific property
            rotation: 0,
            ...data,
          },
        ];

        if (!control) {
          console.error("NO CONTROL");
          return;
        }

        const area = self.annotation.createResult({ ...resultValue, sequence }, resultValue, control, self);

        // add labels
        self.activeStates().forEach((state) => {
          area.setValue(state);
        });

        return area;
      },

      deleteRegion(id) {
        self.findRegion(id)?.deleteRegion();
      },

      findRegion(id) {
        return self.regs.find((reg) => reg.cleanId === id);
      },
    };
  });

export const VideoModel = types.compose(
  "VideoModel",
  SyncableMixin,
  TagAttrs,
  ProcessAttrsMixin,
  ObjectBase,
  AnnotationMixin,
  Model,
  IsReadyMixin,
);
