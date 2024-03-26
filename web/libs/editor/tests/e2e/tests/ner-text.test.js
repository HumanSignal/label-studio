const { initLabelStudio, serialize, selectText } = require('./helpers');

const assert = require('assert');

Feature('NERText');

function removeTextFromResult(result) {
  return result.map(({ value: { start, end, labels }, ...r }) => ({ ...r, value: { start, end, labels } }));
}

const configSimple = `
  <View>
    <Labels name="ner" toName="text">
      <Label value="Person"></Label>
      <Label value="Words"></Label>
    </Labels>
    <Text name="text" value="$text" />
  </View>
`;

const url = 'https://htx-pub.s3.amazonaws.com/example.txt';
const configUrl = configSimple.replace('value="$text"', 'valueType="url" value="$url"');
const configUrlSaveText = configUrl.replace('valueType="url"', 'valueType="url" saveTextResult="yes"');

const resultsFromUrl = [
  {
    id: 'Hnyt9sO_RX',
    from_name: 'ner',
    to_name: 'text',
    type: 'labels',
    origin: 'manual',
    value: { start: 0, end: 17, labels: ['Person'], text: 'George Washington' },
  },
  {
    id: 'tQHRBpvGo0',
    from_name: 'ner',
    to_name: 'text',
    type: 'labels',
    origin: 'manual',
    value: { start: 453, end: 474, labels: ['Words'], text: 'Father of His Country' },
  },
];

const resultsFromUrlWithoutText = removeTextFromResult(resultsFromUrl);

const text = `"But I don’t want to go among mad people," Alice remarked.
"Oh, you can’t help that," said the Cat: "we’re all mad here. I’m mad. You’re mad."
"How do you know I’m mad?" said Alice.
"You must be," said the Cat, "or you wouldn’t have come here."


  ― Lewis Carroll, Alice in Wonderland`;

const results = [
  {
    id: 'abcdef',
    from_name: 'ner',
    to_name: 'text',
    type: 'labels',
    origin: 'manual',
    value: { start: 175, end: 180, labels: ['Person'], text: 'Alice' },
  },
  {
    id: 'qwerty',
    from_name: 'ner',
    to_name: 'text',
    type: 'labels',
    parentID: 'abcdef',
    origin: 'manual',
    value: { start: 1, end: 40, labels: ['Words'], text: 'But I don’t want to go among mad people' },
  },
];

const resultsWithoutText = removeTextFromResult(results);

const newResult = {
  id: 'WpqCf9g_3z',
  from_name: 'ner',
  to_name: 'text',
  type: 'labels',
  origin: 'manual',
  value: { start: 233, end: 237, text: 'come', labels: ['Words'] },
};

Scenario('NERText', async function({ I, AtTopbar }) {
  const params = {
    annotations: [{ id: 'TestCmpl', result: results }],
    config: configSimple,
    data: { text },
  };

  I.amOnPage('/');
  I.executeScript(initLabelStudio, params);
  // better to always check the text are on the page,
  // so there are no errors and text is displayed correctly;
  // text should not be from regions to check the object tag, not the regions list
  I.see('Alice remarked');

  let result;

  // restore saved result and check it back that it didn't change
  result = await I.executeScript(serialize);
  assert.deepEqual(result, results);

  // Create a new annotation to create the same result from scratch
  I.click('[aria-label="Annotations List Toggle"]');
  I.click('[aria-label="Create Annotation"]');

  I.pressKey('2');
  I.executeScript(selectText, {
    selector: '.lsf-htx-richtext',
    rangeStart: 233,
    rangeEnd: 237,
  });
  result = await I.executeScript(serialize);

  // id is auto-generated, so use already assigned
  newResult.id = result[0].id;
  assert.deepEqual(result, [newResult]);

  // delete this new annotation
  AtTopbar.clickAria('Delete');
  I.click('Proceed'); // approve

  I.pressKey('1');
  I.executeScript(selectText, {
    selector: '.lsf-htx-richtext',
    rangeStart: 233,
    rangeEnd: 237,
  });
  result = await I.executeScript(serialize);

  newResult.id = result[2].id;
  newResult.value.labels = ['Person'];
  assert.deepEqual(result, [...results, newResult]);

  // @todo this hotkey doesn't work. why?
  // I.pressKey('R')
  I.wait(5);
  I.click(locate('li').withText('Alice'));
  I.click('Create Relation');
  I.click(locate('.htx-highlight').withText('come'));
  I.wait(1);
  I.click(locate('.htx-highlight').withText('come'));

  I.see('Relations (1)');

  result = await I.executeScript(serialize);
  assert.equal(result.length, 4);
  assert.deepEqual(result[0].value, results[0].value);
  assert.deepEqual(result[1].value, results[1].value);
  assert.equal(result[3].type, 'relation');
  assert.equal(result[3].from_id, result[0].id);
  assert.equal(result[3].to_id, result[2].id);
});

Scenario('NER Text with text field missing', async function({ I }) {
  const params = {
    annotations: [{ id: 'TestCmpl', result: resultsWithoutText }],
    config: configSimple,
    data: { text },
  };

  I.amOnPage('/');
  I.executeScript(initLabelStudio, params);
  I.see('Alice remarked');

  // restore saved result and check it back that it didn't change
  const result = await I.executeScript(serialize);

  assert.deepEqual(result, results);
});

// for security reasons text is not saved by default for valueType=url
Scenario('NER Text from url', async function({ I }) {
  const params = {
    annotations: [{ id: 'TestCmpl', result: resultsFromUrl }],
    config: configUrl,
    data: { url },
  };

  I.amOnPage('/');
  I.executeScript(initLabelStudio, params);
  // wait for text to be loaded
  I.see('American political leader');

  // restore saved result and check it back that it didn't change
  const result = await I.executeScript(serialize);

  assert.deepEqual(result, resultsFromUrlWithoutText);
});

Scenario('NER Text from url with text saved', async function({ I }) {
  const params = {
    annotations: [{ id: 'TestCmpl', result: resultsFromUrlWithoutText }],
    config: configUrlSaveText,
    data: { url },
  };

  I.amOnPage('/');
  I.executeScript(initLabelStudio, params);
  // wait for text to be loaded
  I.see('American political leader');

  // restore saved result and check it back that it didn't change
  const result = await I.executeScript(serialize);

  assert.deepEqual(result, resultsFromUrl);
});

Scenario('NER Text with SECURE MODE and wrong valueType', async function({ I, LabelStudio }) {
  const params = {
    annotations: [{ id: 'TestCmpl', result: results }],
    config: configSimple,
    data: { url },
  };

  I.amOnPage('/');
  I.executeScript(() => {
    window.OLD_LS_SECURE_MODE = window.LS_SECURE_MODE;
    window.LS_SECURE_MODE = true;
  });

  LabelStudio.init(params);

  I.see('In SECURE MODE'); // error about valueType in secure mode
  I.dontSee('American political leader');

  I.executeScript(() => {
    window.LS_SECURE_MODE = window.OLD_LS_SECURE_MODE;
  });
});

Scenario('NER Text with SECURE MODE', async function({ I, LabelStudio }) {
  const params = {
    annotations: [{ id: 'TestCmpl', result: resultsFromUrl }],
    config: configUrl,
    data: { url },
  };

  I.amOnPage('/');
  I.executeScript(() => {
    window.OLD_LS_SECURE_MODE = window.LS_SECURE_MODE;
    window.LS_SECURE_MODE = true;
  });
  LabelStudio.init(params);

  I.waitForElement('.lsf-richtext__line', 60);

  I.see('American political leader');

  // restore saved result and check it back that it didn't change
  const result = await I.executeScript(serialize);
  // text should not be saved in secure mode

  assert.deepEqual(result, resultsFromUrlWithoutText);

  I.executeScript(() => {
    window.LS_SECURE_MODE = window.OLD_LS_SECURE_MODE;
  });
});

Scenario('NER Text regions in Outliner', async function({ I, LabelStudio }) {
  const params = {
    annotations: [{ id: 'TestCmpl', result: resultsFromUrl }],
    config: configUrl,
    data: { url },
  };

  I.amOnPage('/');
  // enabling both flags for New UI, but will work with Otliner one only as well
  LabelStudio.setFeatureFlags({
    ff_front_1170_outliner_030222_short: true,
    fflag_feat_front_dev_3873_labeling_ui_improvements_short: true,
  });
  LabelStudio.init(params);

  I.waitForElement('.lsf-richtext__line', 60);

  I.see('American political leader');

  I.seeElement(locate('.lsf-outliner-item').withText(resultsFromUrl[0].value.text));
  I.seeElement(locate('.lsf-outliner-item').withText(resultsFromUrl[1].value.text));
});
