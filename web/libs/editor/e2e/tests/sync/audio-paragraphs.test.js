const assert = require('assert');
const { FFlagMatrix, FFlagScenario } = require('../../utils/feature-flags');

Feature('Sync: Audio Paragraphs');

const config = `
<View>
  <Audio name="audio" value="$url" hotkey="space" sync="text" />
  <Header value="Sentiment"/>
  <ParagraphLabels name="label" toName="text">
    <Label value="General: Positive" background="#00ff00"/>
    <Label value="General: Negative" background="#ff0000"/>
    <Label value="Company: Positive" background="#7dff7d"/>
    <Label value="Company: Negative" background="#ff7d7d"/>
    <Label value="External: Positive" background="#4bff4b"/>
    <Label value="External: Negative" background="#ff4b4b"/>
  </ParagraphLabels>
  <View style="height: 400px; overflow-y: auto">
    <Header value="Transcript"/>
    <Paragraphs audioUrl="$url" contextscroll="true" sync="audio" name="text" value="$text" layout="dialogue" textKey="text" nameKey="author" showplayer="true" />
  </View>
</View>
`;

const configWithScroll = `
<View>
    <Audio name="audio" value="$url"
           hotkey="space" sync="text"/>
    <Header value="Transcript"/>
    <Paragraphs audioUrl="$url"
                sync="audio"
                name="text"
                value="$text"
                layout="dialogue"
                textKey="text"
                nameKey="author"
                contextscroll="true"
                granularity="paragraph"/>
     <View style="position: sticky">
      <Header value="Sentiment Labels"/>
      <ParagraphLabels name="label" toName="text">
        <Label value="General: Positive" background="#00ff00"/>
        <Label value="General: Negative" background="#ff0000"/>
        <Label value="Company: Positive" background="#7dff7d"/>
        <Label value="Company: Negative" background="#ff7d7d"/>
        <Label value="External: Positive" background="#4bff4b"/>
        <Label value="External: Negative" background="#ff4b4b"/>
      </ParagraphLabels>
    </View>
</View>
`;

const data = {
  url: 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/audio/barradeen-emotional.mp3',
  text: [
    {
      'end': 3,
      'text': 'Dont you hate that?',
      'start': 1,
      'author': 'Mia Wallace',
    },
    {
      'text': 'Hate what?',
      'start': 3,
      'author': 'Vincent Vega:',
      'duration': 1,
    },
    {
      'text': 'Uncomfortable silences. Why do we feel its necessary to yak about nonsense in order to be comfortable?',
      'author': 'Mia Wallace:',
      'start': 4,
      'end': 6,
    },
    {
      'text': 'I dont know. Thats a good question.',
      'start': 6,
      'end': 8,
      'author': 'Vincent Vega:',
    },
    {
      'text': 'Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.',
      'author': 'Mia Wallace:',
      'start': 8,
      'end': 10,
    },
    {
      'text': 'Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.',
      'author': 'Mia Wallace:',
      'start': 10,
      'end': 12,
    },{
      'text': 'Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.',
      'author': 'Mia Wallace:',
      'start': 12,
      'end': 14,
    },{
      'text': 'Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.',
      'author': 'Mia Wallace:',
      'start': 14,
      'end': 16,
    },{
      'text': 'Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.',
      'author': 'Mia Wallace:',
      'start': 16,
      'end': 18,
    },{
      'text': 'Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.',
      'author': 'Mia Wallace:',
      'start': 18,
      'end': 20,
    },
  ],
};

const annotations = [
  {
    'value': {
      'start': '0',
      'end': '0',
      'startOffset': 0,
      'endOffset': 4,
      'text': 'Dont',
      'paragraphlabels': [
        'General: Negative',
      ],
    },
    'id': 'RcHv5CdYBt',
    'from_name': 'label',
    'to_name': 'text',
    'type': 'paragraphlabels',
    'origin': 'manual',
  },
  {
    'value': {
      'start': '0',
      'end': '0',
      'startOffset': 9,
      'endOffset': 13,
      'text': 'hate',
      'paragraphlabels': [
        'General: Positive',
      ],
    },
    'id': 'eePG7PVYH7',
    'from_name': 'label',
    'to_name': 'text',
    'type': 'paragraphlabels',
    'origin': 'manual',
  },
];

const params = { annotations: [{ id: 'test', result: annotations }], config, data };

FFlagMatrix(['fflag_feat_front_lsdv_e_278_contextual_scrolling_short'], function(flags) {
  FFlagScenario('Audio clip is played when selecting the play button next to a paragraph segment', async function({ I, LabelStudio, AtAudioView, AtSidebar }) {
    LabelStudio.setFeatureFlags({
      ff_front_dev_2715_audio_3_280722_short: true,
      ...flags,
    });

    I.amOnPage('/');

    LabelStudio.init(params);

    await AtAudioView.waitForAudio();
    await AtAudioView.lookForStage();

    AtSidebar.seeRegions(2);

    const [{ currentTime: startingAudioTime }, { currentTime: startingParagraphAudioTime }] = await AtAudioView.getCurrentAudio();

    assert.equal(startingAudioTime, startingParagraphAudioTime);
    assert.equal(startingParagraphAudioTime, 0);

    I.click('[aria-label="play"]');
    I.wait(1);

    I.click('[aria-label="play"]');
    I.wait(1);

    const [{ currentTime: seekAudioTime }, { currentTime: seekParagraphAudioTime }] = await AtAudioView.getCurrentAudio();

    assert.notEqual(seekAudioTime, 0);
    I.assertTimesInSync(seekAudioTime, seekParagraphAudioTime, `Expected seek time to be ${seekAudioTime} but was ${seekParagraphAudioTime}`);
  });

  if (flags['fflag_feat_front_lsdv_e_278_contextual_scrolling_short']) {
    FFlagScenario('Playback button states continually change over time according to the paragraph segment which is being played', async function({ I, LabelStudio, AtAudioView, AtSidebar }) {

      LabelStudio.setFeatureFlags({
        ff_front_dev_2715_audio_3_280722_short: true,
        ...flags,
      });

      I.amOnPage('/');

      LabelStudio.init(params);

      await AtAudioView.waitForAudio();
      await AtAudioView.lookForStage();

      AtSidebar.seeRegions(2);

      const [{ currentTime: startingAudioTime }, { currentTime: startingParagraphAudioTime }] = await AtAudioView.getCurrentAudio();

      assert.equal(startingAudioTime, startingParagraphAudioTime);
      assert.equal(startingParagraphAudioTime, 0);

      AtAudioView.clickPauseButton();

      // Plays the first paragraph segment when the audio interface is played
      I.seeElement('[data-testid="phrase:0"] [aria-label="pause"]');
      I.seeElement('[data-testid="phrase:1"] [aria-label="play"]');
      I.seeElement('[data-testid="phrase:2"] [aria-label="play"]');
      I.seeElement('[data-testid="phrase:3"] [aria-label="play"]');
      I.seeElement('[data-testid="phrase:4"] [aria-label="play"]');

      I.wait(2);

      // Plays the second paragraph segment when the audio progresses to the second paragraph segment
      I.seeElement('[data-testid="phrase:1"] [aria-label="pause"]');
      I.seeElement('[data-testid="phrase:0"] [aria-label="play"]');
      I.seeElement('[data-testid="phrase:2"] [aria-label="play"]');
      I.seeElement('[data-testid="phrase:3"] [aria-label="play"]');
      I.seeElement('[data-testid="phrase:4"] [aria-label="play"]');

      I.wait(2);

      // Plays the third paragraph segment when the audio progresses to the third paragraph segment
      I.seeElement('[data-testid="phrase:2"] [aria-label="pause"]');
      I.seeElement('[data-testid="phrase:0"] [aria-label="play"]');
      I.seeElement('[data-testid="phrase:1"] [aria-label="play"]');
      I.seeElement('[data-testid="phrase:3"] [aria-label="play"]');
      I.seeElement('[data-testid="phrase:4"] [aria-label="play"]');
    });

    FFlagScenario('Check if paragraph is scrolling automatically following the audio', async function({ I, LabelStudio, AtAudioView }) {
      LabelStudio.setFeatureFlags({
        ff_front_dev_2715_audio_3_280722_short: true,
        ff_front_1170_outliner_030222_short: true,
        ...flags,
      });

      params.config = configWithScroll;

      I.amOnPage('/');

      LabelStudio.init(params);

      await AtAudioView.waitForAudio();
      await AtAudioView.lookForStage();

      const [{ currentTime: startingAudioTime }, { currentTime: startingParagraphAudioTime }] = await AtAudioView.getCurrentAudio();

      assert.equal(startingAudioTime, startingParagraphAudioTime);
      assert.equal(startingParagraphAudioTime, 0);

      AtAudioView.clickPlayButton();

      I.wait(10);
      // Plays the first paragraph segment when the audio interface is played
      const scrollPosition = await I.executeScript(function(selector) {
        const element = document.querySelector(selector);

        return {
          scrollTop: element.scrollTop,
          scrollLeft: element.scrollLeft,
        };
      }, '[data-testid="phrases-wrapper"]');

      await assert(scrollPosition.scrollTop > 200, 'Scroll position should be greater than 200');
    });

    FFlagScenario('Paragraph should automatically scroll if user seeks audio player', async function({ I, LabelStudio, AtAudioView }) {
      LabelStudio.setFeatureFlags({
        ff_front_dev_2715_audio_3_280722_short: true,
        ff_front_1170_outliner_030222_short: true,
        ...flags,
      });

      params.config = configWithScroll;

      I.amOnPage('/');

      LabelStudio.init(params);

      await AtAudioView.waitForAudio();
      await AtAudioView.lookForStage();

      const [{ currentTime: startingAudioTime }, { currentTime: startingParagraphAudioTime }] = await AtAudioView.getCurrentAudio();

      assert.equal(startingAudioTime, startingParagraphAudioTime);
      assert.equal(startingParagraphAudioTime, 0);

      AtAudioView.clickPlayButton();

      I.wait(10);

      AtAudioView.clickAtBeginning();

      I.wait(1);

      AtAudioView.clickPauseButton();

      const scrollPosition = await I.executeScript(function(selector) {
        const element = document.querySelector(selector);

        return {
          scrollTop: element.scrollTop,
          scrollLeft: element.scrollLeft,
        };
      }, '[data-testid="phrases-wrapper"]');

      await assert.equal(scrollPosition.scrollTop, 0);
    });

    FFlagScenario('Paragraph shouldnt automatically scroll if user disable the auto-scroll toggle', async function({ I, LabelStudio, AtAudioView }) {
      LabelStudio.setFeatureFlags({
        ff_front_dev_2715_audio_3_280722_short: true,
        ff_front_1170_outliner_030222_short: true,
        ...flags,
      });

      params.config = configWithScroll;

      I.amOnPage('/');

      LabelStudio.init(params);

      await AtAudioView.waitForAudio();
      await AtAudioView.lookForStage();

      const [{ currentTime: startingAudioTime }, { currentTime: startingParagraphAudioTime }] = await AtAudioView.getCurrentAudio();

      assert.equal(startingAudioTime, startingParagraphAudioTime);
      assert.equal(startingParagraphAudioTime, 0);

      I.click('[data-testid="auto-scroll-toggle"]');

      AtAudioView.clickPlayButton();

      I.wait(10);

      const scrollPosition = await I.executeScript(function(selector) {
        const element = document.querySelector(selector);

        return {
          scrollTop: element.scrollTop,
          scrollLeft: element.scrollLeft,
        };
      }, '[data-testid="phrases-wrapper"]');

      await assert.equal(scrollPosition.scrollTop, 0);
    });

    FFlagScenario('Paragraph shouldnt automatically scroll if user manually scroll and the current paragraph is not in the screen', async function({ I, LabelStudio, AtAudioView }) {
      LabelStudio.setFeatureFlags({
        ff_front_dev_2715_audio_3_280722_short: true,
        ff_front_1170_outliner_030222_short: true,
        ...flags,
      });

      params.config = configWithScroll;

      I.amOnPage('/');

      LabelStudio.init(params);

      await AtAudioView.waitForAudio();
      await AtAudioView.lookForStage();

      const [{ currentTime: startingAudioTime }, { currentTime: startingParagraphAudioTime }] = await AtAudioView.getCurrentAudio();

      assert.equal(startingAudioTime, startingParagraphAudioTime);
      assert.equal(startingParagraphAudioTime, 0);

      AtAudioView.clickPlayButton();

      I.wait(2);

      I.executeScript( () => {
        document.querySelector('[data-testid="phrases-wrapper"]').scrollTo(0, 1000);

        const wheelEvt = document.createEvent('MouseEvents');

        wheelEvt.initEvent('wheel', true, true);

        wheelEvt.deltaY = 1200;

        document.querySelector('[data-testid="phrases-wrapper"]').dispatchEvent(wheelEvt);
      });

      I.wait(5);

      const scrollPosition = await I.executeScript(function(selector) {
        const element = document.querySelector(selector);

        return {
          scrollTop: element.scrollTop,
          scrollLeft: element.scrollLeft,
        };
      }, '[data-testid="phrases-wrapper"]');

      await assert(scrollPosition.scrollTop > 400, 'Scroll position should be greater than 200');
    });
  }
});
