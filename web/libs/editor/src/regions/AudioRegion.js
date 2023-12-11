import { types } from 'mobx-state-tree';

import NormalizationMixin from '../mixins/Normalization';
import RegionsMixin from '../mixins/Regions';
import { AreaMixin } from '../mixins/AreaMixin';
import Registry from '../core/Registry';
import { FF_DEV_2715, isFF } from '../utils/feature-flags';

import { AudioUltraRegionModel as _audioUltraRegionModel } from './AudioRegion/AudioUltraRegionModel';
import { AudioRegionModel as _audioRegionModel } from './AudioRegion/AudioRegionModel';
import { EditableRegion } from './EditableRegion';

// this type is used in auto-generated documentation
/**
 * @example
 * {
 *   "original_length": 18,
 *   "value": {
 *     "start": 3.1,
 *     "end": 8.2,
 *     "channel": 0,
 *     "labels": ["Voice"]
 *   }
 * }
 * @typedef {Object} AudioRegionResult
 * @property {number} original_length length of the original audio (seconds)
 * @property {Object} value
 * @property {number} value.start start time of the fragment (seconds)
 * @property {number} value.end end time of the fragment (seconds)
 * @property {number} value.channel channel identifier which was targeted
 */

const EditableAudioModel = types
  .model('EditableAudioModel', {})
  .volatile(() => ({
    editableFields: [
      { property: 'start', label: 'Start' },
      { property: 'end', label: 'End' },
    ],
  }));

const AudioRegionModel = types.compose(
  'AudioRegionModel',
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  EditableRegion,
  EditableAudioModel,
  _audioRegionModel,
);

const AudioUltraRegionModel = types.compose(
  'AudioRegionModel',
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  EditableRegion,
  EditableAudioModel,
  _audioUltraRegionModel,
);

let _exportAudioRegion = AudioRegionModel;

if (isFF(FF_DEV_2715)) {
  _exportAudioRegion = AudioUltraRegionModel;
}

Registry.addRegionType(_exportAudioRegion, 'audioplus');
Registry.addRegionType(_exportAudioRegion, 'audio');

export { _exportAudioRegion as AudioRegionModel };
