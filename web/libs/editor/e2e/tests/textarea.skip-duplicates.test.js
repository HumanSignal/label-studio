const assert = require('assert');

Feature('Skip duplicates (textarea)');

const SKIP_DUPLICATES_ERROR = 'There is already an entry with that text. Please enter unique text.';

const scenarioDataTable = new DataTable(['scenarioKey']);

const SK_SIMPLE = 'Simple textarea';
const SK_PER_REGION = 'Per region';
const SK_OCR = 'Ocr';

scenarioDataTable.add([SK_SIMPLE]);
scenarioDataTable.add([SK_PER_REGION]);
scenarioDataTable.add([SK_OCR]);

const SCENARIO_PARAMS = {
  [SK_SIMPLE]: {
    data: { question: 'Is it a question?' },
    config: `<View>
  <Text name="question" value="$question"/>
  <TextArea name="answer" toName="question" skipDuplicates="true"/>
</View>`,
    fieldSelector: '[name="answer"]',
    text: 'Isn\'t it?',
    textAlt: 'isn\'t IT?',
    textOther: 'Maybe',
  },
  [SK_PER_REGION]: {
    data: { 'image': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Html_headers.png/640px-Html_headers.png' },
    config: `<View>
  <Image name="image" value="$image"></Image>
  <Rectangle name="imageRectangle" toName="image"/>
  <TextArea name="text" toName="image" editable="true" perRegion="true"
            placeholder="Recognized Text" skipDuplicates="true" />
</View>
`,
    annotations: [{
      id: 'test',
      result: [{
        id: 'id_1',
        from_name: 'imageRectangle',
        to_name: 'image',
        type: 'rectangle',
        value: {
          'x': 0.625,
          'y': 1.183431952662722,
          'width': 34.375,
          'height': 5.719921104536489,
        },
      }],
    }],
    shouldSelectRegion: true,
    fieldSelector: '[name="text"]',
    text: 'The "H1" Header',
    textAlt: 'the "h1" HEADER',
    textOther: 'Wrong text',
  },
  [SK_OCR]: {
    data: { 'image': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Html_headers.png/640px-Html_headers.png' },
    config: `<View>
  <Image name="image" value="$image"></Image>
  <Rectangle name="imageRectangle" toName="image"/>
  <TextArea name="ocr" toName="image" editable="true" perRegion="true"
            placeholder="Recognized Text" displayMode="region-list" skipDuplicates="true" maxsubmissions="5"/>
</View>
`,
    annotations: [{
      id: 'test',
      result: [{
        id: 'id_1',
        from_name: 'imageRectangle',
        to_name: 'image',
        type: 'rectangle',
        value: {
          'x': 0.625,
          'y': 1.183431952662722,
          'width': 34.375,
          'height': 5.719921104536489,
        },
      }],
    }],
    shouldSelectRegion: true,
    fieldSelector: '.lsf-textarea-tag__form input',
    text: 'The "H1" Header',
    textAlt: 'the "h1" HEADER',
    textOther: 'Wrong text',
  },
};

Data(scenarioDataTable).Scenario('Skip duplicate values on entering', async ({ I, LabelStudio, AtSidebar, Modals, current }) => {
  const scenarioKey = current.scenarioKey;
  const {
    data,
    config,
    annotations,
    shouldSelectRegion,
    fieldSelector,
    text,
    textAlt,
    textOther,
  } = SCENARIO_PARAMS[scenarioKey];

  I.amOnPage('/');
  LabelStudio.init({
    data,
    config,
    annotations,
  });
  LabelStudio.waitForObjectsReady();

  if (shouldSelectRegion) AtSidebar.clickRegion(1);

  I.fillField(fieldSelector, text);
  I.pressKey('Enter');

  I.fillField(fieldSelector, text);
  I.pressKey('Enter');

  Modals.seeWarning(SKIP_DUPLICATES_ERROR);
  Modals.closeWarning();

  I.fillField(fieldSelector, textAlt);
  I.pressKey('Enter');

  Modals.seeWarning(SKIP_DUPLICATES_ERROR);
  Modals.closeWarning();

  I.fillField(fieldSelector, textOther);
  I.pressKey('Enter');

  Modals.dontSeeWarning(SKIP_DUPLICATES_ERROR);

  I.fillField(fieldSelector, textOther);
  I.pressKey('Enter');

  Modals.seeWarning(SKIP_DUPLICATES_ERROR);

  I.fillField(fieldSelector, text);
  I.pressKey('Enter');

  Modals.seeWarning(SKIP_DUPLICATES_ERROR);
});

Scenario('Independent skip duplicate values', async ({ I, LabelStudio, AtSidebar, Modals }) => {
  I.amOnPage('/');
  LabelStudio.init({
    data: { letter: 'Aa' },
    config: `<View>
  <Text name="letter" value="$letter"/>
  <Labels name="label" toName="letter">
    <Label value="Letter A" background="yellow"/>
  </Labels>
  <TextArea name="perText" toName="letter" skipDuplicates="true"/>
  <TextArea name="perText2" toName="letter" skipDuplicates="true"/>
  <TextArea name="perRegion" toName="letter" skipDuplicates="true" perRegion="true" maxsubmissions="5"/>
  <TextArea name="perRegionAndAside" toName="letter" skipDuplicates="true" perRegion="true" maxsubmissions="5" displayMode="region-list"/>
</View>`,
    annotations: [{
      id: 'test',
      result: [
        {
          id: 'letter_A',
          from_name: 'label',
          to_name: 'letter',
          type: 'labels',
          value: { start: 0, end: 1, labels: ['Letter A'], text: 'A' },
        },
        {
          id: 'letter_a',
          from_name: 'label',
          to_name: 'letter',
          type: 'labels',
          value: { start: 1, end: 2, labels: ['Letter A'], text: 'a' },
        },
      ],
    }],
  });

  I.fillField('[name="perText"]', 'A');
  I.pressKey('Enter');

  I.fillField('[name="perText2"]', 'A');
  I.pressKey('Enter');

  Modals.dontSeeWarning(SKIP_DUPLICATES_ERROR);

  AtSidebar.clickRegion(1);

  I.fillField('[name="perRegion"]', 'A');
  I.pressKey('Enter');

  Modals.dontSeeWarning(SKIP_DUPLICATES_ERROR);

  I.fillField(AtSidebar.locateSelectedRegion('.lsf-textarea-tag__form input'), 'A');
  I.pressKey('Enter');

  Modals.dontSeeWarning(SKIP_DUPLICATES_ERROR);

  AtSidebar.clickRegion(2);

  I.fillField('[name="perRegion"]', 'A');
  I.pressKey('Enter');

  Modals.dontSeeWarning(SKIP_DUPLICATES_ERROR);

  I.fillField(AtSidebar.locateSelectedRegion('.lsf-textarea-tag__form input'), 'A');
  I.pressKey('Enter');

  Modals.dontSeeWarning(SKIP_DUPLICATES_ERROR);
});

Scenario('Skip duplicate values on editing', async ({ I, LabelStudio, AtOutliner, Modals }) => {
  I.amOnPage('/');
  LabelStudio.setFeatureFlags({
    ff_front_1170_outliner_030222_short: true,
  });
  LabelStudio.init({
    data: { letter: 'Aa' },
    config: `<View>
  <Text name="letter" value="$letter"/>
  <Labels name="label" toName="letter">
    <Label value="Letter A" background="yellow"/>
  </Labels>
  <TextArea name="perText" toName="letter" skipDuplicates="true" editable="true"/>
  <TextArea name="perRegion" toName="letter" skipDuplicates="true" perRegion="true" maxsubmissions="5" editable="true"/>
  <TextArea name="perRegionAndAside" toName="letter" skipDuplicates="true" perRegion="true" maxsubmissions="5" displayMode="region-list" editable="true"/>
</View>`,
    annotations: [{
      id: 'test',
      result: [
        {
          id: 'letter_A',
          from_name: 'label',
          to_name: 'letter',
          type: 'labels',
          value: { start: 0, end: 1, labels: ['Letter A'], text: 'A' },
        },
        {
          id: 'letter_a',
          from_name: 'label',
          to_name: 'letter',
          type: 'labels',
          value: { start: 1, end: 2, labels: ['Letter A'], text: 'a' },
        },
      ],
    }],
  });
  LabelStudio.waitForObjectsReady();
  AtOutliner.seeRegions(2);

  I.say('Check perText Textarea regions editing');
  {
    I.say('Create some random values in perText Textarea');
    I.fillField('[name="perText"]', 'A');
    I.pressKey('Enter');
    I.fillField('[name="perText"]', '1');
    I.pressKey('Enter');
    I.fillField('[name="perText"]', 'letter');
    I.pressKey('Enter');
    I.fillField('[name="perText"]', 'last');
    I.pressKey('Enter');

    I.say('Try to create duplicate value by editing');

    I.click(locate('[aria-label="Edit Region"]').inside('[data-testid="textarea-region"]').at(2), locate('.lsf-text-area').at(1));
    I.pressKey('Backspace');
    I.pressKey('A');
    I.pressKey('Enter');

    Modals.seeWarning(SKIP_DUPLICATES_ERROR);
    Modals.closeWarning();

    I.say('Check that these changes were not committed');

    I.see('1', locate('.lsf-text-area').at(1).find(locate('.//*[./@data-testid = \'textarea-region\'][position()=2]')));
    I.dontSee('A', locate('.lsf-text-area').at(1).find(locate('.//*[./@data-testid = \'textarea-region\'][position()=2]')));

    I.say('Delete second region and check results after that');
    I.click(locate('[aria-label="Delete Region"]'), locate('.lsf-text-area').at(1).find(locate('.//*[./@data-testid = \'textarea-region\'][position()=2]')));

    I.see('A', locate('.lsf-text-area').at(1).find(locate('.//*[./@data-testid = \'textarea-region\'][position()=1]')));
    I.see('letter', locate('.lsf-text-area').at(1).find(locate('.//*[./@data-testid = \'textarea-region\'][position()=2]')));
    I.see('last', locate('.lsf-text-area').at(1).find(locate('.//*[./@data-testid = \'textarea-region\'][position()=3]')));

    {
      const result = await LabelStudio.serialize();

      assert.deepStrictEqual(
        result[2].value.text,
        ['A', 'letter', 'last'],
        `There should be 3 specific text lines in the textarea result: ${JSON.stringify(['A', 'letter', 'last'])} but ${result[2].value.text} was given.`,
      );
    }

    I.say('Check that skip duplication allow us to keep the same value after editing without errors');

    I.click(locate('[aria-label="Edit Region"]').inside('[data-testid="textarea-region"]').at(2), locate('.lsf-text-area').at(1));
    I.pressKey(['CommandOrControl', 'a']);
    I.pressKey('Backspace');
    Array.from('letter').forEach(v => {
      I.pressKey(v);
    });
    I.pressKey('Enter');

    I.see('letter', locate('.lsf-text-area').at(1).find(locate('.//*[./@data-testid = \'textarea-region\'][position()=2]')));
    Modals.dontSeeWarning(SKIP_DUPLICATES_ERROR);

    {
      const result = await LabelStudio.serialize();

      assert.deepStrictEqual(
        result[2].value.text,
        ['A', 'letter', 'last'],
        `There should be 3 specific text lines in the textarea result: ${JSON.stringify(['A', 'letter', 'last'])} but ${result[2].value.text} was given.`,
      );
    }

    I.say('Check that skip duplication allow us to set different value by editing and do not get errors');

    I.click(locate('[aria-label="Edit Region"]').inside('[data-testid="textarea-region"]').at(2), locate('.lsf-text-area').at(1));
    I.pressKey(['CommandOrControl', 'a']);
    I.pressKey('Backspace');
    Array.from('other').forEach(v => {
      I.pressKey(v);
    });
    I.pressKey('Enter');

    I.see('other', locate('.lsf-text-area').at(1).find(locate('.//*[./@data-testid = \'textarea-region\'][position()=2]')));
    Modals.dontSeeWarning(SKIP_DUPLICATES_ERROR);

    {
      const result = await LabelStudio.serialize();

      assert.deepStrictEqual(
        result[2].value.text,
        ['A', 'other', 'last'],
        `There should be 3 specific text lines in the textarea result: ${JSON.stringify(['A', 'other', 'last'])} but ${result[2].value.text} was given.`,
      );
    }
  }

  I.say('Check perRegion Textarea regions editing');
  {
    AtOutliner.clickRegion(1);
    I.say('Create some random values in perRegion Textarea');
    I.fillField('[name="perRegion"]', 'a');
    I.pressKey('Enter');
    I.fillField('[name="perRegion"]', '1');
    I.pressKey('Enter');
    I.fillField('[name="perRegion"]', 'letter');
    I.pressKey('Enter');
    I.fillField('[name="perRegion"]', 'last');
    I.pressKey('Enter');

    I.say('Try to create duplicate value by editing');

    I.click(locate('[aria-label="Edit Region"]').inside('[data-testid="textarea-region"]').at(2), locate('.lsf-text-area').at(2));
    I.pressKey('Backspace');
    I.pressKey('a');
    I.pressKey('Enter');

    Modals.seeWarning(SKIP_DUPLICATES_ERROR);
    Modals.closeWarning();

    I.say('Check that these changes were not committed');
    I.see('1', locate('.lsf-text-area').at(2).find(locate('.//*[./@data-testid = \'textarea-region\'][position()=2]')));
    I.dontSee('a', locate('.lsf-text-area').at(2).find(locate('.//*[./@data-testid = \'textarea-region\'][position()=2]')));

    I.say('Delete second region and check results after that');
    I.click(locate('[aria-label="Delete Region"]'), locate('.lsf-text-area').at(2).find(locate('.//*[./@data-testid = \'textarea-region\'][position()=2]')));

    I.see('a', locate('.lsf-text-area').at(2).find(locate('.//*[./@data-testid = \'textarea-region\'][position()=1]')));
    I.see('letter', locate('.lsf-text-area').at(2).find(locate('.//*[./@data-testid = \'textarea-region\'][position()=2]')));
    I.see('last', locate('.lsf-text-area').at(2).find(locate('.//*[./@data-testid = \'textarea-region\'][position()=3]')));

    {
      const result = await LabelStudio.serialize();

      assert.deepStrictEqual(
        result[1].value.text,
        ['a', 'letter', 'last'],
        `There should be 3 specific text lines in the textarea result: ${JSON.stringify(['a', 'letter', 'last'])} but ${result[1].value.text} was given.`,
      );
    }

    I.say('Check that skip duplication allow us to keep the same value after editing without errors');

    I.click(locate('[aria-label="Edit Region"]').inside('[data-testid="textarea-region"]').at(2), locate('.lsf-text-area').at(2));
    I.pressKey(['CommandOrControl', 'a']);
    I.pressKey('Backspace');
    Array.from('letter').forEach(v => {
      I.pressKey(v);
    });
    I.pressKey('Enter');

    I.see('letter', locate('.lsf-text-area').at(2).find(locate('.//*[./@data-testid = \'textarea-region\'][position()=2]')));
    Modals.dontSeeWarning(SKIP_DUPLICATES_ERROR);

    {
      const result = await LabelStudio.serialize();

      assert.deepStrictEqual(
        result[1].value.text,
        ['a', 'letter', 'last'],
        `There should be 3 specific text lines in the textarea result: ${JSON.stringify(['a', 'letter', 'last'])} but ${result[1].value.text} was given.`,
      );
    }

    I.say('Check that skip duplication allow us to set different value by editing and do not get errors');

    I.click(locate('[aria-label="Edit Region"]').inside('[data-testid="textarea-region"]').at(2), locate('.lsf-text-area').at(2));
    I.pressKey(['CommandOrControl', 'a']);
    I.pressKey('Backspace');
    Array.from('other').forEach(v => {
      I.pressKey(v);
    });
    I.pressKey('Enter');

    I.see('other', locate('.lsf-text-area').at(2).find(locate('.//*[./@data-testid = \'textarea-region\'][position()=2]')));
    Modals.dontSeeWarning(SKIP_DUPLICATES_ERROR);

    {
      const result = await LabelStudio.serialize();

      assert.deepStrictEqual(
        result[1].value.text,
        ['a', 'other', 'last'],
        `There should be 3 specific text lines in the textarea result: ${JSON.stringify(['a', 'other', 'last'])} but ${result[1].value.text} was given.`,
      );
    }
  }

  I.say('Check ocr-like perRegion Textarea regions editing');
  {
    AtOutliner.clickRegion(2);

    I.say('Create some random values in ocr-like perRegion Textarea');
    I.fillField(AtOutliner.locateSelectedItem('.lsf-textarea-tag__form input'), 'One');
    I.pressKey('Enter');
    I.fillField(AtOutliner.locateSelectedItem('.lsf-textarea-tag__form input'), 'Two');
    I.pressKey('Enter');
    I.fillField(AtOutliner.locateSelectedItem('.lsf-textarea-tag__form input'), 'Three');
    I.pressKey('Enter');
    I.fillField(AtOutliner.locateSelectedItem('.lsf-textarea-tag__form input'), 'Four');
    I.pressKey('Enter');

    I.say('Try to create duplicate value by editing');

    I.click(AtOutliner.locateSelectedItem(locate('.lsf-textarea-tag__item:nth-child(2) input')));
    I.pressKey(['CommandOrControl', 'a']);
    I.pressKey('Backspace');
    I.pressKey('O');
    I.pressKey('n');
    I.pressKey('e');
    I.pressKey('Enter');

    Modals.seeWarning(SKIP_DUPLICATES_ERROR);
    Modals.closeWarning();

    I.say('Check that these changes were not committed');
    I.seeInField(AtOutliner.locateSelectedItem(locate('.lsf-textarea-tag__item:nth-child(2) input')), 'Two');
    I.dontSeeInField(AtOutliner.locateSelectedItem(locate('.lsf-textarea-tag__item:nth-child(2) input')), 'One');

    I.say('Delete second region and check results after that');
    I.click(locate('[aria-label="Delete Region"]'), AtOutliner.locateSelectedItem(locate('.lsf-textarea-tag__item:nth-child(2)')));

    I.seeInField(AtOutliner.locateSelectedItem(locate('.lsf-textarea-tag__item:nth-child(1) input')), 'One');
    I.seeInField(AtOutliner.locateSelectedItem(locate('.lsf-textarea-tag__item:nth-child(2) input')), 'Three');
    I.seeInField(AtOutliner.locateSelectedItem(locate('.lsf-textarea-tag__item:nth-child(3) input')), 'Four');

    {
      const result = await LabelStudio.serialize();

      assert.deepStrictEqual(
        result[3].value.text,
        ['One', 'Three', 'Four'],
        `There should be 3 specific text lines in the textarea result: ${JSON.stringify(['One', 'Three', 'Four'])} but ${result[3].value.text} was given.`,
      );
    }

    I.say('Check that skip duplication allow us to keep the same value after editing without errors');

    I.click(AtOutliner.locateSelectedItem(locate('.lsf-textarea-tag__item:nth-child(2) input')));
    I.pressKey(['CommandOrControl', 'a']);
    I.pressKey('Backspace');
    Array.from('Three').forEach(v => {
      I.pressKey(v);
    });
    I.pressKey('Enter');

    I.seeInField(AtOutliner.locateSelectedItem(locate('.lsf-textarea-tag__item:nth-child(2) input')), 'Three');
    Modals.dontSeeWarning(SKIP_DUPLICATES_ERROR);

    {
      const result = await LabelStudio.serialize();

      assert.deepStrictEqual(
        result[3].value.text,
        ['One', 'Three', 'Four'],
        `There should be 3 specific text lines in the textarea result: ${JSON.stringify(['One', 'Three', 'Four'])} but ${result[3].value.text} was given.`,
      );
    }

    I.say('Check that skip duplication allow us to set different value by editing and do not get errors');

    I.click(AtOutliner.locateSelectedItem(locate('.lsf-textarea-tag__item:nth-child(2) input')));
    I.pressKey(['CommandOrControl', 'a']);
    I.pressKey('Backspace');
    Array.from('other').forEach(v => {
      I.pressKey(v);
    });
    I.pressKey('Enter');

    I.seeInField(AtOutliner.locateSelectedItem(locate('.lsf-textarea-tag__item:nth-child(2) input')), 'other');
    Modals.dontSeeWarning(SKIP_DUPLICATES_ERROR);

    {
      const result = await LabelStudio.serialize();

      assert.deepStrictEqual(
        result[3].value.text,
        ['One', 'other', 'Four'],
        `There should be 3 specific text lines in the textarea result: ${JSON.stringify(['One', 'other', 'Four'])} but ${result[3].value.text} was given.`,
      );
    }
  }
});
