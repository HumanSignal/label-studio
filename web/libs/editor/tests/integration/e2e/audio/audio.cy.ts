import { AudioView, LabelStudio } from "@humansignal/frontend-test/helpers/LSF";

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
        audio: 'https://htx-pub.s3.us-east-1.amazonaws.com/examples/audio/barradeen-emotional.mp3',
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
        audio: 'https://htx-pub.s3.us-east-1.amazonaws.com/examples/audio/barradeen-emotional.mp3',
      })
      .withResult([])
      .init();

    LabelStudio.waitForObjectsReady();

    AudioView.isReady();
    AudioView.toMatchImageSnapshot(AudioView.drawingArea, { threshold: 0.4 });
  });
});
