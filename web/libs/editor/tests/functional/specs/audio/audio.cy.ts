import { AudioView, LabelStudio } from '@heartexlabs/ls-test/helpers/LSF/index';

describe('Audio', () => {
  it('Renders audio with merged channels by default', () => {
    LabelStudio.params()
      .config(
        `
      <View>
        <Audio name="audio" value="$audio" />
      </View>
      `,
      )
      .data({
        audio: 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/audio/barradeen-emotional.mp3',
      })
      .withResult([])
      .init();

    LabelStudio.waitForObjectsReady();

    AudioView.isReady();
    AudioView.toMatchImageSnapshot(AudioView.drawingArea, { threshold: 0.4 });
  });

  it('Renders separate audio channels with splitchannels=true', () => {
    LabelStudio.params()
      .config(
        `
      <View>
        <Audio name="audio" value="$audio" splitchannels="true" />
      </View>
      `,
      )
      .data({
        audio: 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/audio/barradeen-emotional.mp3',
      })
      .withResult([])
      .init();

    LabelStudio.waitForObjectsReady();

    AudioView.isReady();
    AudioView.toMatchImageSnapshot(AudioView.drawingArea, { threshold: 0.4 });
  });
});
