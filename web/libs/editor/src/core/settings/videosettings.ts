import { FF_DEV_3350 } from '../../utils/feature-flags';
import { SettingsProperties } from './types';

export default {
  'videoDrawOutside': {
    'description': 'Allow drawing outside of video boundaries',
    'defaultValue': false,
    'type': 'boolean',
    'ff': FF_DEV_3350,
  },
  'videoHopSize': {
    'description': 'Video hop size',
    'defaultValue': 10,
    'type': 'number',
  },
} as SettingsProperties;

