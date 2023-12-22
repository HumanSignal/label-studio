const { FFlagMatrix, FFlagScenario } = require('../../utils/feature-flags');

Feature('Audio Regions');

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

const configSpeech = `
<View>
    <Audio name="audio" value="$url"></Audio>
    <Labels name="label" toName="audio">
      <Label value="Speech"/>
      <Label value="Noise" background="grey"/>
    </Labels>
    <TextArea name="transcription" toName="audio"
              perRegion="true" whenTagName="label" whenLabelValue="Speech"
              displayMode="region-list"/>
    <Choices name="sentiment" toName="audio" showInline="true"
             perRegion="true" whenTagName="label" whenLabelValue="Speech">
        <Choice value="Positive"/>
        <Choice value="Neutral"/>
        <Choice value="Negative"/>
    </Choices>                               
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
const paramsSpeech = { annotations: [{ id: 'test', result: [] }], config: configSpeech, data };

FFlagMatrix([
  'fflag_feat_front_lsdv_e_278_contextual_scrolling_short',
], function(flags) {

  FFlagScenario('Check if regions are selected', async function({ I, LabelStudio, AtAudioView, AtSidebar }) {
    LabelStudio.setFeatureFlags({
      ff_front_dev_2715_audio_3_280722_short: true,
      ...flags,
    });
    I.amOnPage('/');

    LabelStudio.init(params);

    await AtAudioView.waitForAudio();
    await AtAudioView.lookForStage();

    AtSidebar.seeRegions(1);

    // creating a new region
    I.pressKey('1');
    AtAudioView.dragAudioElement(160,80);
    I.pressKey('u');

    AtSidebar.seeRegions(2);

    AtAudioView.clickAt(170);
    AtSidebar.seeSelectedRegion();
    AtAudioView.clickAt(170);
    AtSidebar.dontSeeSelectedRegion();
    AtAudioView.dragAudioElement(170,40);
    AtSidebar.seeSelectedRegion();
    AtAudioView.clickAt(220);
    AtSidebar.dontSeeSelectedRegion();
  });

  // Don't need to test this for both scenarios of flags, as it is the same code and is verified in the above test
  if (!flags['fflag_feat_front_lsdv_e_278_contextual_scrolling_short']) {
    FFlagScenario('Check if multiple regions are working changing labels', async function({ I, LabelStudio, AtAudioView, AtSidebar }) {
      LabelStudio.setFeatureFlags({
        ff_front_dev_2715_audio_3_280722_short: true,
        ...flags,
      });
      I.amOnPage('/');

      LabelStudio.init(paramsSpeech);

      await AtAudioView.waitForAudio();
      await AtAudioView.lookForStage();

      for (let i = 0; i < 20; i++) {
        // creating a new region
        I.pressKey('1');
        AtAudioView.dragAudioElement((40 * i) + 10,30);
        AtAudioView.clickAt((40 * i) + 20);
        I.pressKey('2');
        I.pressKey('1');
        I.pressKey('u');
      }

      AtSidebar.seeRegions(20);

      for (let i = 0; i < 20; i++) {
        // creating a new region
        AtAudioView.clickAt((40 * i) + 20);
        AtSidebar.seeSelectedRegion();
        I.pressKey('u');
      }

      AtSidebar.seeRegions(20);

      I.pressKey('u');

      AtSidebar.dontSeeSelectedRegion();
    });

    FFlagScenario('Can select a region below a hidden region', async function({ I, LabelStudio, AtAudioView, AtSidebar }) {
      LabelStudio.setFeatureFlags({
        ff_front_dev_2715_audio_3_280722_short: true,
        ...flags,
      });
      I.amOnPage('/');

      LabelStudio.init(paramsSpeech);

      await AtAudioView.waitForAudio();
      await AtAudioView.lookForStage();

      // create a new region
      I.pressKey('1');
      AtAudioView.dragAudioElement(50, 80);
      I.pressKey('u');

      AtSidebar.seeRegions(1);

      // create a new region above the first one
      I.pressKey('2');
      AtAudioView.dragAudioElement(49, 81);
      I.pressKey('u');

      AtSidebar.seeRegions(2);

      // click on the top-most region visible to select it
      AtAudioView.clickAt(50);
      AtSidebar.seeSelectedRegion('Noise');

      // hide the region
      AtSidebar.hideRegion('Noise');

      // click on the region below the hidden one to select it
      AtAudioView.clickAt(50);
      AtSidebar.seeSelectedRegion('Speech');
    });

    FFlagScenario('Selecting a region brings it to the front of the stack', async function({ I, LabelStudio, AtAudioView, AtSidebar }) {
      LabelStudio.setFeatureFlags({
        ff_front_dev_2715_audio_3_280722_short: true,
        ...flags,
      });
      I.amOnPage('/');

      LabelStudio.init(paramsSpeech);

      await AtAudioView.waitForAudio();
      await AtAudioView.lookForStage();

      // create a new region
      I.pressKey('1');
      AtAudioView.dragAudioElement(50, 80);
      I.pressKey('u');

      AtSidebar.seeRegions(1);

      // create a new region above the first one
      I.pressKey('2');
      AtAudioView.dragAudioElement(49, 81);
      I.pressKey('u');

      AtSidebar.seeRegions(2);

      // click on the top-most region visible to select it
      AtAudioView.clickAt(50);
      AtSidebar.seeSelectedRegion('Noise');

      // Select the bottom most region to bring it to the top
      AtSidebar.clickRegion('Speech');
      AtSidebar.seeSelectedRegion('Speech');

      // click on the overlapping region will deselect it, which shows that it is now the top in the list
      AtAudioView.clickAt(50);
      AtSidebar.dontSeeSelectedRegion('Speech');
      AtSidebar.dontSeeSelectedRegion('Noise');

      // click on the overlapping region will select the top item of the list, which will now be the item which was brought to the front by the original interaction.
      AtAudioView.clickAt(50);
      AtSidebar.seeSelectedRegion('Speech');
    });

    FFlagScenario('Delete region by pressing delete hotkey', async function({ I, LabelStudio, AtAudioView, AtSidebar }) {
      LabelStudio.setFeatureFlags({
        ff_front_dev_2715_audio_3_280722_short: true,
        ...flags,
      });
      I.amOnPage('/');

      LabelStudio.init(params);

      await AtAudioView.waitForAudio();
      await AtAudioView.lookForStage();

      AtSidebar.seeRegions(1);

      // creating a new region
      AtAudioView.dragAudioElement(160,80);

      I.pressKey('Delete');

      I.pressKey('1');

      AtSidebar.seeRegions(1);
    });

    FFlagScenario('Check if there are ghost regions', async function({ I, LabelStudio, AtAudioView, AtSidebar }) {
      LabelStudio.setFeatureFlags({
        ff_front_dev_2715_audio_3_280722_short: true,
        ...flags,
      });
      I.amOnPage('/');

      LabelStudio.init(paramsSpeech);

      await AtAudioView.waitForAudio();
      await AtAudioView.lookForStage();

      // creating a new region
      I.pressKey('1');
      AtAudioView.dragAudioElement(300,80);
      I.pressKey('u');


      // creating a ghost region
      I.pressKey('1');
      AtAudioView.dragAudioElement(160,80, false);
      I.pressKey('1');
      I.wait(1);
      I.pressMouseUp();
      I.wait(1);

      // checking if the created region is selected
      AtAudioView.clickAt(310);
      AtSidebar.seeSelectedRegion();

      // trying to select the ghost region, if there is no ghost region, the region will keep selected
      // as ghost region is not selectable and impossible to change the label, the created region will be deselected if there is a ghost region created.
      AtAudioView.clickAt(170);
      I.pressKey('2');
      AtSidebar.seeSelectedRegion();

      AtSidebar.seeRegions(2);
    });
  }
});
