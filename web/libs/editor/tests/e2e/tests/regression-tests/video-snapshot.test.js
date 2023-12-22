const assert = require('assert');

Feature( 'Video region snapshots').tag('@regress');


Scenario('Restoring video regions from snapshots', async ({ I, LabelStudio, AtSidebar }) => {
  I.amOnPage('/');
  LabelStudio.init({
    annotations: [
      {
        'id': '1001',
        'result': [
          {
            'value': {
              'sequence': [
                {
                  'frame': 1,
                  'enabled': true,
                  'x': 38.266666666666666,
                  'y': 38.898756660746,
                  'width': 41.333333333333336,
                  'height': 22.202486678507995,
                  'rotation': 0,
                  'time': 0.041666666666666664,
                },
              ],
              'framesCount': 1009,
            },
            'id': 'tJhYZLMC9G',
            'from_name': 'box',
            'to_name': 'video',
            'type': 'videorectangle',
            'origin': 'manual',
          },
        ],
      },
    ],
    config: `
<View>
  <Video name="video" value="$video" />
  <VideoRectangle name="box" toName="video" />
</View>`,
    data: { video: '/files/opossum_intro.webm' },
  });

  I.say('waitForObjectsReady');
  LabelStudio.waitForObjectsReady();

  {
    I.say('Check the video annotation creation');
    const result = await LabelStudio.serialize();

    assert.notStrictEqual(result[0].value.sequence.length, 0);
  }

  {
    I.say('Check restoring the snapshot from history');
    LabelStudio.clearModalIfPresent();
    AtSidebar.seeRegions(1);
    AtSidebar.clickRegion(1);
    I.say('delete region');
    I.pressKey('Backspace');
    I.say('undo action');
    I.click('.lsf-history-buttons__action[aria-label=Undo]');
    const result = await LabelStudio.serialize();

    assert.notStrictEqual(result[0].value.sequence.length, 0);
  }
});
