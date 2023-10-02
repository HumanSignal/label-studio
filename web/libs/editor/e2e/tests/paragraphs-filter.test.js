const assert = require('assert');
const { omitBy } = require('./helpers');

Feature('Paragraphs filter');

const AUDIO = 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/audio/barradeen-emotional.mp3';

const ANNOTATIONS = [
  {
    'result': [
      {
        'id':'ryzr4QdL93',
        'from_name':'ner',
        'to_name':'text',
        'source':'$dialogue',
        'type':'paragraphlabels',
        'value':{
          'start':'2',
          'end':'4',
          'startOffset':0,
          'endOffset':134,
          'paragraphlabels': ['Important Stuff'],
          'text': 'Uncomfortable silences. Why do we feel its necessary to yak about nonsense in order to be comfortable?I dont know. Thats a good question.Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.',
        },
      },
    ],
  },
];

const DATA = {
  audio: AUDIO,
  dialogue: [
    {
      start: 3.1,
      end: 5.6,
      author: 'Mia Wallace',
      text: 'Dont you hate that?',
    },
    {
      start: 4.2,
      duration: 3.1,
      author: 'Vincent Vega:',
      text: 'Hate what?',
    },
    {
      author: 'Mia Wallace:',
      text: 'Uncomfortable silences. Why do we feel its necessary to yak about nonsense in order to be comfortable?',
    },
    {
      start: 90,
      author: 'Vincent Vega:',
      text: 'I dont know. Thats a good question.',
    },
    {
      author: 'Mia Wallace:',
      text:
        'Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.',
    },
  ],
};

const CONFIG = `
<View>
  <ParagraphLabels name="ner" toName="text">
    <Label value="Important Stuff"></Label>
    <Label value="Random talk"></Label>
    <Label value="Other"></Label>
  </ParagraphLabels>
  <Paragraphs audioUrl="$audio" name="text" value="$dialogue" layout="dialogue" savetextresult="yes" />
</View>`;

const FEATURE_FLAGS = {
  ff_front_dev_2669_paragraph_author_filter_210622_short: true,
  fflag_fix_front_dev_2918_labeling_filtered_paragraphs_250822_short: true,
};

Scenario('Create two results using excluding a phrase  by the filter', async ({ I, LabelStudio, AtSidebar, AtParagraphs, AtLabels }) => {
  const params = {
    data: DATA,
    config: CONFIG,
  };

  I.amOnPage('/');

  LabelStudio.setFeatureFlags(FEATURE_FLAGS);
  LabelStudio.init(params);
  AtSidebar.seeRegions(0);

  I.say('Select 2 regions in the consecutive phrases of the one person');

  AtLabels.clickLabel('Random talk');
  AtParagraphs.setSelection(
    AtParagraphs.locateText('Hate what?'),
    5,
    AtParagraphs.locateText('Hate what?'),
    10,
  );

  AtLabels.clickLabel('Random talk');
  AtParagraphs.setSelection(
    AtParagraphs.locateText('I dont know. Thats a good question.'),
    0,
    AtParagraphs.locateText('I dont know. Thats a good question.'),
    11,
  );
  AtSidebar.seeRegions(2);

  I.say('Take a snapshot');
  const twoActionsResult = LabelStudio.serialize();

  I.say('Reset to initial state');
  LabelStudio.init(params);
  AtSidebar.seeRegions(0);

  I.say('Filter the phrases by that person.');
  AtParagraphs.clickFilter('Vincent Vega:');

  I.say('Try to get the same result in one action');

  AtLabels.clickLabel('Random talk');
  AtParagraphs.setSelection(
    AtParagraphs.locateText('Hate what?'),
    5,
    AtParagraphs.locateText('I dont know. Thats a good question.'),
    11,
  );
  AtSidebar.seeRegions(2);

  I.say('Take a second snapshot');
  const oneActionResult = LabelStudio.serialize();

  I.say('The results should be identical');

  assert.deepStrictEqual(twoActionsResult, oneActionResult);

});

Scenario('Check different cases ', async ({ I, LabelStudio, AtSidebar, AtParagraphs, AtLabels }) => {
  const dialogue = [
    1,// 1
    3,// 2
    1,// 3
    2,// 4
    3,// 5
    1,// 6
    2,// 7
    1,// 8
    3,// 9
    1,// 10
  ].map((authorId, idx)=>({
    start: idx+1,
    end: idx+2,
    author: `Author ${authorId}`,
    text: `Message ${idx+1}`,
  }));
  const params = {
    config: CONFIG,
    data: {
      audio: AUDIO,
      dialogue,
    },
  };

  I.amOnPage('/');

  LabelStudio.setFeatureFlags(FEATURE_FLAGS);
  LabelStudio.init(params);
  AtSidebar.seeRegions(0);

  I.say('Hide Author 3');
  AtParagraphs.clickFilter('Author 1', 'Author 2');

  I.say('Make regions by selecting everything');
  AtLabels.clickLabel('Random talk');
  AtParagraphs.setSelection(
    AtParagraphs.locateText('Message 1'),
    0,
    AtParagraphs.locateText('Message 10'),
    10,
  );

  I.say('There should be 4 new regions');
  AtSidebar.seeRegions(4);
  {
    const result = await LabelStudio.serialize();

    assert.strictEqual(result.length, 4);

    assert.deepStrictEqual(omitBy(result[0].value, (v, key)=> key === 'paragraphlabels'), {
      'start': '0',
      'end': '0',
      'startOffset': 0,
      'endOffset': 9,
      'text': 'Message 1',
    });

    assert.deepStrictEqual(omitBy(result[1].value, (v, key)=> key === 'paragraphlabels'), {
      'start': '2',
      'end': '3',
      'startOffset': 0,
      'endOffset': 9,
      'text': 'Message 3\n\nMessage 4',
    });

    assert.deepStrictEqual(omitBy(result[2].value, (v, key)=> key === 'paragraphlabels'), {
      'start': '5',
      'end': '7',
      'startOffset': 0,
      'endOffset': 9,
      'text': 'Message 6\n\nMessage 7\n\nMessage 8',
    });

    assert.deepStrictEqual(omitBy(result[3].value, (v, key)=> key === 'paragraphlabels'), {
      'start': '9',
      'end': '9',
      'startOffset': 0,
      'endOffset': 10,
      'text': 'Message 10',
    });
  }

  I.say('Test the overlaps of regions #1');
  AtLabels.clickLabel('Important Stuff');
  AtParagraphs.setSelection(
    AtParagraphs.locateText('Message 3'),
    4,
    AtParagraphs.locateText('Message 8'),
    4,
  );
  AtSidebar.seeRegions(6);

  {
    const result = await LabelStudio.serialize();

    assert.deepStrictEqual(omitBy(result[4].value, (v, key)=> key === 'paragraphlabels'), {
      'start': '2',
      'end': '3',
      'startOffset': 4,
      'endOffset': 9,
      'text': 'age 3\n\nMessage 4',
    });

    assert.deepStrictEqual(omitBy(result[5].value, (v, key)=> key === 'paragraphlabels'), {
      'start': '5',
      'end': '7',
      'startOffset': 0,
      'endOffset': 4,
      'text': 'Message 6\n\nMessage 7\n\nMess',
    });
  }

  I.say('Test the overlaps of regions #2');
  AtParagraphs.clickFilter('Author 2', 'Author 3');
  AtLabels.clickLabel('Important Stuff');
  AtParagraphs.setSelection(
    AtParagraphs.locateText('age 3'),
    4,
    AtParagraphs.locateText('age 8'),
    3,
  );
  AtSidebar.seeRegions(9);

  {
    const result = await LabelStudio.serialize();

    assert.deepStrictEqual(omitBy(result[6].value, (v, key)=> key === 'paragraphlabels'), {
      'start': '2',
      'end': '2',
      'startOffset': 8,
      'endOffset': 9,
      'text': '3',
    });

    assert.deepStrictEqual(omitBy(result[7].value, (v, key)=> key === 'paragraphlabels'), {
      'start': '4',
      'end': '5',
      'startOffset': 0,
      'endOffset': 9,
      'text': 'Message 5\n\nMessage 6',
    });

    assert.deepStrictEqual(omitBy(result[8].value, (v, key)=> key === 'paragraphlabels'), {
      'start': '7',
      'end': '7',
      'startOffset': 0,
      'endOffset': 7,
      'text': 'Message',
    });
  }
});

Scenario(
  'Check start and end indices do not leak to other lines',
  async ({ I, LabelStudio, AtSidebar, AtParagraphs, AtLabels }) => {
    const dialogue = [
      1, // 1
      3, // 2
      1, // 3
      2, // 4
      3, // 5
      1, // 6
      2, // 7
      1, // 8
      3, // 9
      1, // 10
      3, // 11
      2, // 12
      3, // 13
      2, // 14
    ].map((authorId, idx) => ({
      start: idx + 1,
      end: idx + 2,
      author: `Author ${authorId}`,
      text: `Message ${idx + 1}`,
    }));
    const params = {
      config: CONFIG,
      data: {
        audio: AUDIO,
        dialogue,
      },
    };

    LabelStudio.setFeatureFlags(FEATURE_FLAGS);
    I.amOnPage('/');

    LabelStudio.init(params);
    AtSidebar.seeRegions(0);

    I.say(
      'Test selection from the end of one turn to end of the one below correctly creates a single region with proper start,startOffset,end,endOffset',
    );
    AtLabels.clickLabel('Random talk');
    AtParagraphs.setSelection(
      AtParagraphs.locateText('Message 8'),
      9,
      AtParagraphs.locateText('Message 9'),
      9,
    );
    AtSidebar.seeRegions(1);

    {
      const result = await LabelStudio.serialize();

      assert.deepStrictEqual(
        omitBy(result[0].value, (v, key) => key === 'paragraphlabels'),
        {
          start: '8',
          end: '8',
          startOffset: 0,
          endOffset: 9,
          text: 'Message 9',
        },
      );
    }

    I.say(
      'Test selection from the end of one turn to the very start of another below correctly creates a single region with proper start,startOffset,end,endOffset',
    );
    AtLabels.clickLabel('Random talk');
    AtParagraphs.setSelection(
      AtParagraphs.locateText('Message 8'),
      9,
      AtParagraphs.locateText('Message 10'),
      0,
    );
    AtSidebar.seeRegions(2);

    {
      const result = await LabelStudio.serialize();

      assert.deepStrictEqual(
        omitBy(result[1].value, (v, key) => key === 'paragraphlabels'),
        {
          start: '8',
          end: '8',
          startOffset: 0,
          endOffset: 9,
          text: 'Message 9',
        },
      );
    }

    I.say(
      'Test selection from the end of one turn to end of ones below across collapsed text correctly creates regions with proper start,startOffset,end,endOffset',
    );
    AtParagraphs.clickFilter('Author 2', 'Author 3');
    AtLabels.clickLabel('Important Stuff');
    AtParagraphs.setSelection(
      AtParagraphs.locateText('Message 2'),
      9,
      AtParagraphs.locateText('Message 8'),
      9,
    );
    AtSidebar.seeRegions(4);

    {
      const result = await LabelStudio.serialize();

      assert.deepStrictEqual(
        omitBy(result[2].value, (v, key) => key === 'paragraphlabels'),
        {
          start: '3',
          end: '4',
          startOffset: 0,
          endOffset: 9,
          text: 'Message 4\n\nMessage 5',
        },
      );
      assert.deepStrictEqual(
        omitBy(result[3].value, (v, key) => key === 'paragraphlabels'),
        {
          start: '6',
          end: '6',
          startOffset: 0,
          endOffset: 9,
          text: 'Message 7',
        },
      );
    }

    I.say(
      'Test selection from the end of one turn to very start of ones below across collapsed text correctly creates creates regions with proper start,startOffset,end,endOffset',
    );
    AtLabels.clickLabel('Other');
    AtParagraphs.setSelection(
      AtParagraphs.locateText('Message 2'),
      9,
      AtParagraphs.locateText('Message 8'),
      0,
    );
    AtSidebar.seeRegions(6);

    {
      const result = await LabelStudio.serialize();

      assert.deepStrictEqual(
        omitBy(result[4].value, (v, key) => key === 'paragraphlabels'),
        {
          start: '3',
          end: '4',
          startOffset: 0,
          endOffset: 9,
          text: 'Message 4\n\nMessage 5',
        },
      );
      assert.deepStrictEqual(
        omitBy(result[5].value, (v, key) => key === 'paragraphlabels'),
        {
          start: '6',
          end: '6',
          startOffset: 0,
          endOffset: 9,
          text: 'Message 7',
        },
      );
    }

    I.say(
      'Test selection from the end of Message 11 to the start of Message 14 to get region over Message 12 and Message 13',
    );
    AtLabels.clickLabel('Random talk');
    AtParagraphs.setSelection(
      AtParagraphs.locateText('Message 11'),
      10,
      AtParagraphs.locateText('Message 14'),
      0,
    );
    AtSidebar.seeRegions(7);

    {
      const result = await LabelStudio.serialize();

      assert.deepStrictEqual(
        omitBy(result[6].value, (v, key) => key === 'paragraphlabels'),
        {
          start: '11',
          end: '12',
          startOffset: 0,
          endOffset: 10,
          text: 'Message 12\n\nMessage 13',
        },
      );
    }
  },
);

Scenario('Selecting the end character on a paragraph phrase to the very start of other phrases includes all selected phrases', async ({ I, LabelStudio, AtSidebar, AtParagraphs, AtLabels }) => {
  const params = {
    data: DATA,
    config: CONFIG,
  };

  I.amOnPage('/');

  LabelStudio.setFeatureFlags(FEATURE_FLAGS);
  LabelStudio.init(params);
  AtSidebar.seeRegions(0);

  I.say('Select 2 regions in the consecutive phrases');

  AtLabels.clickLabel('Random talk');
  AtParagraphs.setSelection(
    AtParagraphs.locateText('Dont you hate that?'),
    18,
    AtParagraphs.locateText('Uncomfortable silences. Why do we feel its necessary to yak about nonsense in order to be comfortable?'),
    0,
  );

  AtSidebar.seeRegions(1);

  const result = await LabelStudio.serialize();

  assert.deepStrictEqual(
    omitBy(result[0].value, (v, key) => key === 'paragraphlabels'),
    {
      start: '0',
      end: '1',
      startOffset: 18,
      endOffset: 10,
      text: '?\n\nHate what?',
    },
  );
});

Scenario('Selecting the end character on a paragraph phrase to the very start of other phrases includes all selected phrases except the very last one', async ({ I, LabelStudio, AtSidebar, AtParagraphs, AtLabels }) => {
  const params = {
    data: {
      ...DATA,
      dialogue: DATA.dialogue.map(d => [d, { ...d, text: `${d.text}2` }]).flat(), 
    },
    config: CONFIG,
  };

  I.amOnPage('/');

  LabelStudio.setFeatureFlags(FEATURE_FLAGS);
  LabelStudio.init(params);
  AtSidebar.seeRegions(0);


  I.say('Select 2 regions in the consecutive phrases of the one person');
  AtParagraphs.clickFilter('Vincent Vega');
  AtLabels.clickLabel('Random talk');
  AtParagraphs.setSelection(
    AtParagraphs.locateText('Hate what?2'),
    10,
    AtParagraphs.locateText('I dont know. Thats a good question.2'),
    0,
  );

  AtSidebar.seeRegions(2);

  const result = await LabelStudio.serialize();

  assert.deepStrictEqual(
    omitBy(result[0].value, (v, key) => key === 'paragraphlabels'),
    {
      start: '3',
      end: '3',
      startOffset: 10,
      endOffset: 11,
      text: '2',
    },
  );
  assert.deepStrictEqual(
    omitBy(result[1].value, (v, key) => key === 'paragraphlabels'),
    {
      start: '6',
      end: '6',
      startOffset: 0,
      endOffset: 35,
      text: 'I dont know. Thats a good question.',
    },
  );
});

Scenario('Initializing a paragraph region range should not include author names in text', async ({ I, LabelStudio, AtSidebar }) => {
  const params = {
    data: DATA,
    annotations: ANNOTATIONS,
    config: CONFIG,
  };

  I.amOnPage('/');
  LabelStudio.setFeatureFlags(FEATURE_FLAGS);

  const [{ result : [region] }] = ANNOTATIONS;
  const { paragraphlabels: _paragraphlabels, ...value } = region.value;

  LabelStudio.init(params);
  AtSidebar.seeRegions(1);

  const result = await LabelStudio.serialize();

  assert.deepStrictEqual(
    omitBy(result[0].value, (v, key) => key === 'paragraphlabels'),
    value,
  );
});
