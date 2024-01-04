import { TimelineView } from '../../Types';
import { Wave } from './Wave';

const View: TimelineView = {
  View: Wave,
  settings: {
    playpauseHotkey: 'media:playpause',
    stepBackHotkey: 'media:step-backward',
    stepForwardHotkey: 'media:step-forward',
  },
};

export default View;
