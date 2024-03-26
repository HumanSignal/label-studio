import { types } from 'mobx-state-tree';

import NormalizationMixin from '../mixins/Normalization';
import RegionsMixin from '../mixins/Regions';
import Registry from '../core/Registry';
import { AreaMixin } from '../mixins/AreaMixin';
import { onlyProps, VideoRegion } from './VideoRegion';
import { interpolateProp } from '../utils/props';

/**
 * @example
 * 
 * 
 * 
 * {
 *   "value": {
 *     "framesCount": 1051,
 *     "duration": 42.008633,
 *     "sequence": [
 *       {
 *         "frame": 1,
 *         "enabled": true,
 *         "rotation": 0,
 *         "x": 16,
 *         "y": 51,
 *         "width": 30,
 *         "height": 28,
 *         "time": 0.04
 *       }, {
 *         "x": 44.7,
 *         "y": 51.5,
 *         "width": 30.1,
 *         "height": 28.8,
 *         "rotation": 0,
 *         "frame": 18,
 *         "enabled": true,
 *         "time": 0.72
 *       }, {
 *         "x": 44.7,
 *         "y": 51.5,
 *         "width": 30.1,
 *         "height": 28.8,
 *         "rotation": 0,
 *         "enabled": false, // this region won't appear on next frames
 *         "frame": 25,
 *         "time": 1
 *       }
 *     ]
 *   }
 * }
 * @typedef {Object} VideoRectangleRegionResult
 * @property {Object} value
 * @property {number} value.framesCount total number of frames in the video
 * @property {number} value.duration duration of the video in seconds
 * @property {number} value.sequence array of keypoint objects
 * @property {number} value.sequence[].x x coordinate of the top left corner (0-100)
 * @property {number} value.sequence[].y y coordinate of the top left corner (0-100)
 * @property {number} value.sequence[].width width of the bounding box (0-100)
 * @property {number} value.sequence[].height height of the bounding box (0-100)
 * @property {number} value.sequence[].rotation rotation degree of the bounding box (deg)
 * @property {number} value.sequence[].enabled whether the region is visible on this and next frames
 * @property {number} value.sequence[].frame frame number
 * @property {number} value.sequence[].time time in seconds
 */

const Model = types
  .model('VideoRectangleRegionModel', {
    type: 'videorectangleregion',
  })
  .volatile(() => ({
    props: ['x', 'y', 'width', 'height', 'rotation'],
  }))
  .views(self => ({
    getShape(frame) {
      let prev, next;

      for (const item of self.sequence) {
        if (item.frame === frame) {
          return onlyProps(self.props, item);
        }

        if (item.frame > frame) {
          next = item;
          break;
        }
        prev = item;
      }

      if (!prev) return null;
      if (!next) return onlyProps(self.props, prev);

      return Object.fromEntries(self.props.map(prop => [
        prop,
        interpolateProp(prev, next, frame, prop),
      ]));
    },

    getVisibility() {
      return true;
    },
  }))
  .actions(self => ({
    updateShape(data, frame) {
      const newItem = {
        ...data,
        frame,
        enabled: true,
      };

      const kp = self.closestKeypoint(frame);
      const index = self.sequence.findIndex(item => item.frame >= frame);

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
  }));

const VideoRectangleRegionModel = types.compose(
  'VideoRectangleRegionModel',
  RegionsMixin,
  VideoRegion,
  AreaMixin,
  NormalizationMixin,
  Model,
);

Registry.addRegionType(VideoRectangleRegionModel, 'video');

export { VideoRectangleRegionModel };
