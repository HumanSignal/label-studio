import { observer } from 'mobx-react-lite';
import VideoProperties from '../../../core/settings/videosettings';
import { SettingsRenderer } from './SettingsRenderer';
import { Settings } from './Types';

const VideoSettingsPure: Settings = ({ store }) => {
  return (
    <SettingsRenderer
      store={store}
      settings={VideoProperties}
    />
  );
};

VideoSettingsPure.displayName = 'VideoSettings';
VideoSettingsPure.tagName = 'Video';
VideoSettingsPure.title = 'Video';

export const VideoSettings = observer(VideoSettingsPure);
