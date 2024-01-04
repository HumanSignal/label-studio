Feature('Audio Controls');

const config = `
<View>
  <Header value="Select regions:"></Header>
  <Labels name="label" toName="audio" choice="multiple">
    <Label value="Beat" background="yellow"></Label>
    <Label value="Voice" background="red"></Label>
    <Label value="Guitar" background="blue"></Label>
    <Label value="Other"></Label>
  </Labels>
  <Header value="Select genre:"></Header>
  <Choices name="choice" toName="audio" choice="multiple">
    <Choice value="Lo-Fi" />
    <Choice value="Rock" />
    <Choice value="Pop" />
  </Choices>
  <Header value="Listen the audio:"></Header>
  <Audio name="audio" value="$url"></Audio>
</View>
`;

const data = {
  url: 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/audio/barradeen-emotional.mp3',
};

const annotations = [
  {
    from_name: 'choice',
    id: 'hIj6zg57SY',
    to_name: 'audio',
    type: 'choices',
    origin: 'manual',
    value: {
      choices: ['Lo-Fi'],
    },
  },
  {
    from_name: 'label',
    id: 'JhxupEJWlW',
    to_name: 'audio',
    original_length: 98.719925,
    type: 'labels',
    origin: 'manual',
    value: {
      channel: 1,
      end: 59.39854733358493,
      labels: ['Other'],
      start: 55.747572792986325,
    },
  },
];

const params = { annotations: [{ id: 'test', result: annotations }], config, data };

Scenario('Check the audio controls work', async function({ I, LabelStudio, AtAudioView, AtSidebar }) {
  async function doNotSeeErrors() {
    await I.wait(2);
    // The potential errors should be caught by `errorsCollector` plugin
  }

  LabelStudio.setFeatureFlags({
    ff_front_dev_2715_audio_3_280722_short: true,
  });
  I.amOnPage('/');

  LabelStudio.init(params);

  await AtAudioView.waitForAudio();
  await AtAudioView.lookForStage();

  AtSidebar.seeRegions(1);

  I.say('Check the volume updates');

  await AtAudioView.seeVolume(100);

  AtAudioView.setVolumeInput(50);

  await AtAudioView.seeVolume(50);

  I.say('Check can be muted');

  AtAudioView.clickMuteButton();

  await AtAudioView.seeVolume(0);

  I.say('Check the playback speed updates');

  await AtAudioView.seePlaybackSpeed(1);

  AtAudioView.setPlaybackSpeedInput(2);
 
  await AtAudioView.seePlaybackSpeed(2);

  I.say('Check the amplitude updates');

  await AtAudioView.seeAmplitude(1);

  AtAudioView.setAmplitudeInput(2);

  await AtAudioView.seeAmplitude(2);

  I.say('Check can be played');

  await AtAudioView.seeIsPlaying(false);

  AtAudioView.clickPlayButton();

  await AtAudioView.seeIsPlaying(true);

  I.say('Check can be paused');

  AtAudioView.clickPauseButton();

  await AtAudioView.seeIsPlaying(false);

  I.say('Check the waveform can be zoomed without error');

  await AtAudioView.zoomToPoint(-120);

  await doNotSeeErrors();
});
