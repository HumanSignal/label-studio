Feature('Video meta').tag('@regress');

const VIDEO = '/files/opossum_intro.webm';

Scenario('Filling meta in video regions', async ({ I, LabelStudio, AtVideoView, AtOutliner, AtDetails }) => {
  I.amOnPage('/');
  LabelStudio.setFeatureFlags({
    ff_front_1170_outliner_030222_short: true,
  });
  LabelStudio.init({
    config: `
<View>
  <Video name="video" value="$video"></Video>
  <VideoRectangle name="box" toName="video" />
  <Labels name="tag" toName="video">
    <Label value="" background="green" hotkey="1"/>
    <Label value="Label 1" background="blue" hotkey="2"/>
  </Labels>
</View>
`,
    data: {
      video: VIDEO,
    },
    annotations: [
      {
        'id': 'test',
        'result': [
          {
            'value': {
              'sequence': [
                {
                  'frame': 1,
                  'enabled': true,
                  'x': 10,
                  'y': 10,
                  'width': 20,
                  'height': 10,
                  'rotation': 0,
                  'time': 0.041666666666666664,
                },
              ],
              'framesCount': 1009,
            },
            'id': 'test_1',
            'from_name': 'box',
            'to_name': 'video',
            'type': 'videorectangle',
            'origin': 'manual',
          },
          {
            'value': {
              'sequence': [
                {
                  'frame': 1,
                  'enabled': true,
                  'x': 40,
                  'y': 10,
                  'width': 20,
                  'height': 10,
                  'rotation': 0,
                  'time': 0.041666666666666664,
                },
              ],
              'framesCount': 1009,
            },
            'id': 'test_2',
            'from_name': 'box',
            'to_name': 'video',
            'type': 'videorectangle',
            'origin': 'manual',
          },
        ],
      },
    ],
  });
  LabelStudio.waitForObjectsReady();

  const META_1 = 'Some meta';
  const META_2 = 'Some other meta';

  AtOutliner.seeRegions(2);
  AtOutliner.clickRegion(2);

  I.say('Fill a meta for the 2nd region');
  AtDetails.clickEditMeta();
  AtDetails.fillMeta(META_1);
  I.say('Reselect region and check the meta');
  AtOutliner.clickRegion(1);
  AtOutliner.clickRegion(2);
  I.see(META_1);

  I.say('Fill a meta for the 1st region');
  AtOutliner.clickRegion(1);
  AtDetails.clickEditMeta();
  AtDetails.fillMeta(META_2);
  I.say('Reset selection by clicking on the canvas');
  I.click(AtVideoView.videoLocate());
  I.say('Check meta for the 1st region');
  AtOutliner.clickRegion(1);
  I.see(META_2);
});
