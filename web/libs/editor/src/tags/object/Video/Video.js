import { getRoot, types } from 'mobx-state-tree';
import React from 'react';

import { AnnotationMixin } from '../../../mixins/AnnotationMixin';
import IsReadyMixin from '../../../mixins/IsReadyMixin';
import ProcessAttrsMixin from '../../../mixins/ProcessAttrs';
import { SyncableMixin } from '../../../mixins/Syncable';
import { parseValue } from '../../../utils/data';
import ObjectBase from '../Base';

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
  framerate: types.optional(types.string, '24'),
  height: types.optional(types.string, '600'),
  muted: false,
});

const Model = types
  .model({
    type: 'video',
    _value: types.optional(types.string, ''),
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
  .views(self => ({
    get store() {
      return getRoot(self);
    },

    get currentFrame() {
      return self.ref.current?.position ?? 1;
    },

    control() {
      return self.annotation.toNames.get(self.name)?.find(s => !s.type.endsWith('labels'));
    },

    videoControl() {
      return self.annotation.toNames.get(self.name)?.find(s => s.type.includes('video'));
    },

    states() {
      return self.annotation.toNames.get(self.name)?.filter(s => s.type.endsWith('labels'));
    },

    activeStates() {
      const states = self.states();

      return states ? states.filter(c => c.isSelected === true) : null;
    },

    get hasStates() {
      const states = self.states();

      return states && states.length > 0;
    },
  }))
  .actions(self => ({
    afterCreate() {
      // normalize framerate — should be string with number of frames per second
      const framerate = Number(parseValue(self.framerate, self.store.task?.dataObj));

      if (!framerate || isNaN(framerate)) self.framerate = '24';
      else if (framerate < 1) self.framerate = String(1 / framerate);
      else self.framerate = String(framerate);
    },
  }))
  ////// Sync actions
  .actions(self => ({
    ////// Outgoing

    /**
     * Wrapper to always send important data
     * @param {string} event 
     * @param {any} data 
     */
    triggerSync(event, data) {
      if (!self.ref.current) return;

      self.syncSend({
        playing: self.ref.current.playing,
        time: self.ref.current.currentTime,
        ...data,
      }, event);
    },

    triggerSyncPlay() {
      self.triggerSync('play', { playing: true });
    },

    triggerSyncPause() {
      self.triggerSync('pause', { playing: false });
    },

    ////// Incoming

    registerSyncHandlers() {
      ['play', 'pause', 'seek'].forEach(event => {
        self.syncHandlers.set(event, self.handleSync);
      });
      self.syncHandlers.set('speed', self.handleSyncSpeed);
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
      self.triggerSync('seek');
    },

    syncMuted(muted) {
      self.muted = muted;
    },
  }))
  .actions(self => {
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

      addRegion(data) {
        const control = self.videoControl() ?? self.control();

        const sequence = [
          {
            frame: self.frame,
            enabled: true,
            rotation: 0,
            ...data,
          },
        ];

        if (!control) {
          console.error('NO CONTROL');
          return;
        }

        const area = self.annotation.createResult({ sequence }, {}, control, self);

        // add labels
        self.activeStates().forEach(state => {
          area.setValue(state);
        });

        return area;
      },

      deleteRegion(id) {
        self.findRegion(id)?.deleteRegion();
      },

      findRegion(id) {
        return self.regs.find(reg => reg.cleanId === id);
      },
    };
  });

export const VideoModel = types.compose('VideoModel',
  SyncableMixin,
  TagAttrs,
  ProcessAttrsMixin,
  ObjectBase,
  AnnotationMixin,
  Model,
  IsReadyMixin,
);
