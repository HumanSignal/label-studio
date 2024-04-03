Feature('Audio Errors');

const config = `
<View>
  <Header value="Select regions:"></Header>
  <Labels name="label" toName="audio" choice="multiple">
    <Label value="Beat" background="yellow"></Label>
    <Label value="Other"></Label>
  </Labels>
  <Header value="Listen the audio:"></Header>
  <Audio name="audio" value="$url"></Audio>
</View>
`;

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

Scenario('Check if audio decoder error handler is showing', async function({ I, LabelStudio, AtAudioView }) {
  LabelStudio.setFeatureFlags({
    ff_front_dev_2715_audio_3_280722_short: true,
  });
  I.amOnPage('/');

  LabelStudio.init({
    annotations: [{ id: 'test', result: annotations }],
    config,
    data: {
      url: '/files/video.mp4', // mp4 is not supported by audio decoder
    },
  });

  await AtAudioView.lookForStage();

  await AtAudioView.seeErrorHandler('An error occurred while decoding the audio file');
});

Scenario('Check if audio http error handler is showing', async function({ I, LabelStudio, AtAudioView }) {
  LabelStudio.setFeatureFlags({
    ff_front_dev_2715_audio_3_280722_short: true,
  });
  I.amOnPage('/');

  LabelStudio.init({
    annotations: [{ id: 'test', result: annotations }],
    config,
    data: {
      url: '/files/doesnt_exist.mp3',
    },
  });

  await AtAudioView.lookForStage();

  await AtAudioView.seeErrorHandler('HTTP error status: 404', '_httpErrorSelector');
});
