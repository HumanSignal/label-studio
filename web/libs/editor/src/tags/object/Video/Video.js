import { getRoot, types } from "mobx-state-tree";
import React from "react";

import { AnnotationMixin } from "../../../mixins/AnnotationMixin";
import IsReadyMixin from "../../../mixins/IsReadyMixin";
import PersistentStateMixin from "../../../mixins/PersistentState";
import ProcessAttrsMixin from "../../../mixins/ProcessAttrs";
import { SyncableMixin } from "../../../mixins/Syncable";
import { parseValue } from "../../../utils/data";
import { FF_VIDEO_FRAME_SEEK_PRECISION, isFF } from "../../../utils/feature-flags";
import { ff } from "@humansignal/core";
import ObjectBase from "../Base";
import { isDefined } from "../../../utils/utilities";

const isSyncedBuffering = ff.isActive(ff.FF_SYNCED_BUFFERING);

/**
 * Video tag plays a simple video file. Use for video annotation tasks such as classification and transcription.
 *
 * Use with the following data types: video
 *
 * ### Video format
 *
 * Label Studio relies on your web browser to play videos and evaluate the total frame number. So, it's essential that your videos use a format and codecs that are universally supported. To ensure maximum compatibility, we recommend using an MP4 container with video encoded using the H.264 (AVC) codec and audio encoded with AAC. This combination is widely supported across all modern browsers and minimizes issues like incorrect total duration detection or problems with playback. In addition, it's important to convert your videos to a constant frame rate (CFR), ideally around 30 fps, to avoid discrepancies in frame counts and issues with duplicated or missing frames. All audio and video streams from your file must have the same durations; otherwise, you will have extra total frames.
 *
 * Converting your videos to this recommended format will help ensure that they play smoothly in Label Studio and that the frame rate and duration are correctly recognized for accurate annotations. To convert any video to this format, you can use FFmpeg. For example, the following commands convert an input video to MP4 with H.264 video, AAC audio, and a constant frame rate of 30 fps:
 *
 * ```bash
 * # Extract the exact video stream duration in seconds
 * DUR=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of default=nokey=1:noprint_wrappers=1 input.mp4)
 * # Re-encode media file to recommended format
 * ffmpeg -i input_video.mp4 -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p -r 30 -c:a aac -b:a 128k -to $DUR output_video.mp4
 * ```
 *
 * In this command:
 * - `-i input_video.mp4` specifies your source video.
 * - `-c:v libx264` uses the H.264 codec for video encoding.
 * - `-profile:v high -level 4.0` sets compatibility parameters for a broad range of devices.
 * - `-pix_fmt yuv420p` ensures the pixel format is compatible with most browsers.
 * - `-r 30` forces a constant frame rate of 30 fps. You can also omit the -r option, ffmpeg will save your current frame rate. This is fine if you are 100% certain that your video has a constant frame rate.
 * - `-c:a aac -b:a 128k` encodes the audio in AAC at 128 kbps.
 * - `-to` stops writing output as soon as the container clock hits your video's end timestamp, so any extra audio tail is automatically dropped.
 * - `output_video.mp4` is the converted video file ready for use in Label Studio.
 *
 * Using this FFmpeg command to re-encode your videos will help eliminate playback issues and ensure that Label Studio detects the total video duration accurately, providing a smooth annotation experience.
 *
 * It is a good idea to check all parameters of your video using this command:
 * ```bash
 * ffprobe -v error -show_format -show_streams -print_format json input.mp4
 * ```
 *
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
 * @param {number} [height=600] height of the video player
 * @param {number} [timelineHeight=64] height of the timeline with regions
 * @param {number} [defaultPlaybackSpeed=1] default playback speed the player should start with when loaded
 * @param {number} [minPlaybackSpeed=1] minimum allowed playback speed; defaultPlaybackSpeed cannot be set below this value
 */

const TagAttrs = types.model({
  value: types.maybeNull(types.string),
  hotkey: types.maybeNull(types.string),
  framerate: types.optional(types.string, "24"),
  height: types.optional(types.string, "600"),
  timelineheight: types.maybeNull(types.string),
  muted: false,
  defaultplaybackspeed: types.optional(types.union(types.string, types.number), "1"),
  minplaybackspeed: types.optional(types.union(types.string, types.number), "0.25"),
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
    drawingRegion: null,
    loopTimelineRegion: false,
  }))
  .views((self) => ({
    get store() {
      return getRoot(self);
    },

    get currentFrame() {
      return self.ref.current?.position ?? 1;
    },

    get timelineControl() {
      return self.annotation.toNames.get(self.name)?.find((s) => s.type.includes("timeline"));
    },

    get videoControl() {
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

    get fullFrameRange() {
      return { start: 1, end: self.length };
    },

    get timelineRegions() {
      return self.annotation.regionStore.selection.list.filter((reg) => reg.type === "timelineregion");
    },

    get hasSelectedRange() {
      return self.timelineRegions.length > 0;
    },

    get selectedFrameRange() {
      const regions = self.timelineRegions;
      if (regions.length === 0) return null;
      let start = regions[0].ranges[0].start;
      let end = regions[0].ranges[0].end;
      regions.forEach((reg) => {
        reg.ranges.forEach((range) => {
          if (range.start < start) start = range.start;
          if (range.end > end) end = range.end;
        });
      });
      return { start, end };
    },

    get persistentValuesKey() {
      return "ls:video-tag:settings";
    },
    get persistentValues() {
      return {
        loopTimelineRegion: self.loopTimelineRegion,
      };
    },
  }))
  .actions((self) => ({
    afterCreate() {
      // normalize framerate — should be string with number of frames per second
      const framerate = Number(parseValue(self.framerate, self.store.task?.dataObj));

      if (!framerate || Number.isNaN(framerate)) self.framerate = "24";
      else if (framerate < 1) self.framerate = String(1 / framerate);
      else self.framerate = String(framerate);

      // normalize playback speed parameters
      const data = self.store.task?.dataObj;
      const defaultPlaybackSpeed = Number(parseValue(String(self.defaultplaybackspeed), data));
      const minPlaybackSpeed = Number(parseValue(String(self.minplaybackspeed), data));

      // validate and set minPlaybackSpeed
      self.minplaybackspeed =
        !minPlaybackSpeed || isNaN(minPlaybackSpeed) || minPlaybackSpeed < 0.05 ? 0.25 : minPlaybackSpeed;

      // validate and set defaultPlaybackSpeed
      self.defaultplaybackspeed =
        !defaultPlaybackSpeed || isNaN(defaultPlaybackSpeed) || defaultPlaybackSpeed < 0.05
          ? 1
          : Math.max(defaultPlaybackSpeed, self.minplaybackspeed);

      // set initial speed to defaultPlaybackSpeed
      self.speed = self.defaultplaybackspeed;
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
          time: self.ref.current.frameSteppedTime(),
          ...data,
        },
        event,
      );
    },

    triggerSyncPlay(isManual = false) {
      if (isSyncedBuffering && self.isBuffering && !isManual) return;
      self.wasPlayingBeforeBuffering = true;
      self.triggerSync("play", { playing: true });
    },

    triggerSyncPause(isManual = false) {
      if (isSyncedBuffering && self.isBuffering && !isManual) return;
      self.wasPlayingBeforeBuffering = false;
      self.triggerSync("pause", { playing: false });
    },

    triggerSyncBuffering(isBuffering) {
      if (!self.ref.current) return;

      const playing = self.wasPlayingBeforeBuffering;

      self.triggerSync("buffering", {
        buffering: isBuffering,
        playing,
      });
    },

    ////// Incoming

    registerSyncHandlers() {
      for (const event of ["play", "pause", "seek"]) {
        self.syncHandlers.set(event, self.handleSync);
      }
      self.syncHandlers.set("speed", self.handleSyncSpeed);
      if (isSyncedBuffering) {
        self.syncHandlers.set("buffering", self.handleSyncBuffering);
      }
    },

    handleSyncBuffering({ playing, ...data }) {
      self.isBuffering = self.syncManager?.isBuffering;
      if (data.buffering) {
        self.wasPlayingBeforeBuffering = playing;
        self.ref.current?.pause();
      }
      if (!self.isBuffering && !data.buffering) {
        if (playing) {
          self.ref.current?.play();
        }
      }
      // process other data
      self.handleSync(data);
    },

    handleSync(data, event) {
      if (!self.ref.current) return;

      const video = self.ref.current;
      const isBuffering = self.syncManager?.isBuffering;

      if (!isSyncedBuffering || (!isBuffering && isDefined(data.playing))) {
        if (data.playing) {
          if (!video.playing) video.play();
        } else {
          if (video.playing) video.pause();
        }
      }
      // during the buffering only these events has real `playing` values (in other cases it's paused all the time)
      if (["play", "pause"].indexOf(event) > -1) {
        self.wasPlayingBeforeBuffering = data.playing;
      }

      if (data.speed) {
        self.speed = data.speed;
      }

      if (isDefined(data.time) && (!isSyncedBuffering || video.currentTime !== data.time)) {
        video.currentTime = data.time;
      }
    },

    handleSyncSpeed(data) {
      if (isDefined(data.speed)) {
        self.speed = data.speed;
      }
    },

    handleSpeed(speed) {
      // enforce minimum playback speed
      const constrainedSpeed = Math.max(speed, self.minplaybackspeed);

      self.speed = constrainedSpeed;
      self.triggerSync("speed", { speed: constrainedSpeed });
    },

    handleSeek() {
      self.triggerSync("seek", isSyncedBuffering ? { playing: self.wasPlayingBeforeBuffering } : {});
    },

    handleBuffering(isBuffering) {
      if (!isSyncedBuffering) return;
      if (self.syncManager?.isBufferingOrigin(self.name) === isBuffering) return;
      const isAlreadyBuffering = self.syncManager?.isBuffering;
      const isLastCauseOfBuffering =
        self.syncManager?.bufferingOrigins.size === 1 && self.syncManager?.isBufferingOrigin(self.name);
      const willStartBuffering = !isAlreadyBuffering && isBuffering;
      const willStopBuffering = isLastCauseOfBuffering && !isBuffering;

      if (willStopBuffering) {
        if (self.wasPlayingBeforeBuffering) {
          self.ref.current?.play();
        }
      }

      self.triggerSyncBuffering(isBuffering);

      // The real value, relevant for all medias synced together we have only after triggering the buffering event
      self.isBuffering = self.syncManager?.isBuffering;

      if (willStartBuffering) {
        if (self.ref.current?.playing) {
          self.ref.current?.pause();
        }
      }
    },

    syncMuted(muted) {
      self.muted = muted;
    },
  }))
  .actions((self) => {
    return {
      setLoopTimelineRegion(loop) {
        self.loopTimelineRegion = loop;
      },

      setLength(length) {
        self.length = length;
      },

      setOnlyFrame(frame) {
        if (self.frame !== frame) {
          self.frame = frame;
        }
      },

      setFrame(frame) {
        if (self.frame !== frame && self.framerate && self.ref.current) {
          self.frame = frame;

          // Seek immediately - batching is handled at a higher level
          if (!self.ref.current) return;

          try {
            if (isFF(FF_VIDEO_FRAME_SEEK_PRECISION)) {
              self.ref.current.goToFrame(frame);
            } else {
              self.ref.current.currentTime = frame / self.framerate;
            }
          } catch (error) {
            console.warn("Error seeking video:", error);
          }
        }
      },

      addVideoRegion(data) {
        const control = self.videoControl;

        if (!control) {
          console.error("No video control is found");
          return;
        }

        const sequence = [
          {
            frame: self.frame,
            enabled: true,
            rotation: 0,
            ...data,
          },
        ];

        const activeStates = self.activeStates();
        const area = ff.isActive(ff.FF_MULTIPLE_LABELS_REGIONS)
          ? self.annotation.createResult({ sequence }, {}, control, self, false, activeStates)
          : self.annotation.createResult({ sequence }, {}, control, self, false);

        if (!ff.isActive(ff.FF_MULTIPLE_LABELS_REGIONS)) {
          // add labels
          for (const tag of self.activeStates()) {
            area.setValue(tag);
          }
        }
        return area;
      },

      addTimelineRegion(data) {
        const control = self.timelineControl;

        if (!control) {
          console.error("No video timeline control is found");
          return;
        }

        const frame = data.frame ?? self.frame;
        const value = {
          ranges: [{ start: frame, end: frame }],
        };
        let labeling;
        let additionalStates;
        if (ff.isActive(ff.FF_MULTIPLE_LABELS_REGIONS)) {
          const activeStates = self.activeStates();
          additionalStates = activeStates.filter((state) => state !== control);
          labeling = {
            [control.valueType]: control.selectedValues(),
          };
        } else {
          const labels = self.activeStates()?.[0];
          labeling = {
            [labels.valueType]: labels.selectedValues(),
          };
        }

        return ff.isActive(ff.FF_MULTIPLE_LABELS_REGIONS)
          ? self.annotation.createResult(value, labeling, control, self, false, additionalStates)
          : self.annotation.createResult(value, labeling, control, self, false);
      },

      deleteRegion(id) {
        self.findRegion(id)?.deleteRegion();
      },

      findRegion(id) {
        return self.regs.find((reg) => reg.cleanId === id);
      },

      /**
       * Create a new timeline region at a given `frame` (only if labels are selected) or edit an existing one if `region` is provided
       * @param {Object} options
       * @param {number} options.frame current frame under the cursor
       * @param {string} options.region region id to search for it in the store; used to edit existing region
       * @returns {Object} created region
       */
      startDrawing({ frame, region: id }) {
        // don't create or edit regions in read-only mode
        if (self.annotation.isReadOnly()) return null;

        if (id) {
          const region = self.annotation.regions.find((r) => r.cleanId === id);
          const range = region?.ranges?.[0];
          return range && [range.start, range.end].includes(frame) ? region : null;
        }
        const control = self.timelineControl;
        // labels should be selected or allow to create region without labels
        if (!control?.selectedLabels?.length && !control?.allowempty) return null;

        self.drawingRegion = self.addTimelineRegion({ frame, enabled: false });

        return self.drawingRegion;
      },

      /**
       * Finish drawing a region and save its final state to the store if it was edited
       * @param {Object} options
       * @param {string} options.mode "new" if we are creating a new region, "edit" if we are editing an existing one
       */
      finishDrawing({ mode }) {
        self.drawingRegion = null;
        if (mode === "edit") {
          self.annotation.history.recordNow();
        }
      },
    };
  });

export const VideoModel = types.compose(
  "VideoModel",
  SyncableMixin,
  TagAttrs,
  ProcessAttrsMixin,
  ObjectBase,
  PersistentStateMixin,
  AnnotationMixin,
  Model,
  IsReadyMixin,
);
