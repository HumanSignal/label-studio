const { initLabelStudio, serialize, selectText } = require('./helpers');

const assert = require('assert');

Feature('Nested Choices');

const configSimple = `
  <View>
    <Text name="text" value="$reviewText" valueType="text" />
    <Choices name="sentiment" toName="text" showInLine="true">
      <Choice value="Positive" />
      <Choice value="Negative" />
      <Choice value="Neutral" />
    </Choices>
    <Choices
      name="ch"
      toName="text"
      choice="single"
      showInLine="true"
      visibleWhen="choice-selected"
    >
      <Choice value="Descriptive" />
      <Choice value="Emotional" />
    </Choices>
  </View>`;

const configComplicated = `
  <View>
    <Labels name="ner" toName="my_text" choice="multiple">
      <Label value="Person" background="red"/>
      <Label value="Organization" background="darkorange"/>
      <Label value="Fact" background="orange"/>
      <Label value="Money" background="green"/>
      <Label value="Date" background="darkblue"/>
      <Label value="Time" background="blue"/>
      <Label value="Ordinal" background="purple"/>
      <Label value="Percent" background="#842"/>
      <Label value="Product" background="#428"/>
      <Label value="Language" background="#482"/>
      <Label value="Location" background="rgba(0,0,0,0.8)"/>
    </Labels>
    <Text name="my_text" value="$reviewText"/>
    <Choices name="sentiment" toName="my_text" choice="single" showInLine="true">
      <Choice value="Positive"/>
      <Choice value="Negative"/>
      <Choice value="Neutral"/>
    </Choices>
    <Choices name="positive" toName="my_text"
             visibleWhen="choice-selected"
             whenTagName="sentiment"
             whenChoiceValue="Positive">
      <Choice value="Smile" />
      <Choice value="Laughter" />
    </Choices>
    <View visibleWhen="region-selected" whenLabelValue="Person">
      <Header>More details about this person:</Header>
      <Textarea name="description" toName="my_text" perRegion="true"
                choice="single" showInLine="true" whenLabelValue="Person">
      </Textarea>
      <Choices name="gender" toName="my_text" perRegion="true"
               choice="single" showInLine="true" whenLabelValue="Person">
        <Choice value="Female"/>
        <Choice value="Male"/>
      </Choices>
    </View>
    <Choices name="currency" toName="my_text" perRegion="true"
             choice="single" showInLine="true" whenLabelValue="Money">
      <Choice value="USD"/>
      <Choice value="EUR"/>
    </Choices>
    <Choices name="sentiment2" toName="my_text"
             choice="single" showInLine="true" perRegion="true">
      <Choice value="Positive"/>
      <Choice value="Negative"/>
    </Choices>
  </View>`;

const reviewText =
  'Not much to write about here, but it does exactly what it\'s supposed to. filters out the pop sounds. now my recordings are much more crisp. it is one of the lowest prices pop filters on amazon so might as well buy it, they honestly work the same despite their pricing,';

Scenario('Check simple nested Choices for Text', async function({ I }) {
  const params = {
    config: configSimple,
    data: { reviewText },
  };

  I.amOnPage('/');
  I.executeScript(initLabelStudio, params);

  I.see('Positive');
  I.dontSee('Emotional');
  I.click('Positive');
  I.see('Emotional');
  I.click('Emotional');

  const result = await I.executeScript(serialize);

  assert.equal(result.length, 2);
  assert.deepEqual(result[0].value, { choices: ['Positive'] });
  assert.deepEqual(result[1].value, { choices: ['Emotional'] });
});

Scenario('Check good nested Choice for Text', async function({ I, AtLabels, AtSidebar }) {
  const params = {
    config: configComplicated,
    data: { reviewText },
  };

  I.amOnPage('/');
  I.executeScript(initLabelStudio, params);

  I.click('Positive');
  I.see('Laughter');
  I.click('Laughter');

  const personTag = AtLabels.locateLabel('Person');

  I.seeElement(personTag);
  I.click(personTag);
  I.executeScript(selectText, {
    selector: '.lsf-htx-richtext',
    rangeStart: 51,
    rangeEnd: 55,
  });
  AtSidebar.seeRegions(1);
  I.dontSee('Female');

  // the only element of regions tree list
  const regionInList = locate('.lsf-entities__regions').find('.ant-list-item');

  // select this region
  I.click(regionInList);

  AtSidebar.seeRegions(1);
  I.see('More details'); // View with visibleWhen

  I.click('Female');
  // second click on already assigned label should do nothing
  I.click(personTag);

  const result = await I.executeScript(serialize);

  assert.equal(result.length, 4);
  assert.deepEqual(result[0].value.choices, ['Positive']);
  assert.deepEqual(result[1].value.choices, ['Laughter']);
  assert.deepEqual(result[2].value.labels, ['Person']);
  assert.deepEqual(result[3].value.choices, ['Female']);
});

Scenario('Check removing unexpected results based on visibleWhen parameter', async function({ I, LabelStudio }) {
  const params = {
    config: `<View>
  <Text name="text" value="$reviewText" valueType="text" />
  <Choices name="sentiment" toName="text" showInLine="true">
    <Choice value="Positive" />
    <Choice value="Negative" />
    <Choice value="Neutral" />
  </Choices>
  <Choices
    name="rate" toName="text" choice="single" showInLine="true"
    visibleWhen="choice-unselected"
    whenTagName="sentiment"
    whenChoiceValue="Neutral"
  >
    <Choice value="One" />
    <Choice value="Two" />
    <Choice value="Three" />
    <Choice value="Four" />
    <Choice value="Five" />
  </Choices>
</View>`,
    data: { reviewText },
  };

  I.amOnPage('/');
  LabelStudio.init(params);

  I.see('Neutral');
  I.see('Five');
  // Choose rate
  I.click('Five');
  // Then hide it by choosing value from the visibleWhen="choice-unselected" dependency
  I.click('Neutral');
  let result = await I.executeScript(serialize);

  // The hidden choose should not make a result
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].value, { choices: ['Neutral'] });

  // Check that it still works in case of no hidding
  I.click('Positive');
  result = await I.executeScript(serialize);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0].value, { choices: ['Five'] });
  assert.deepEqual(result[1].value, { choices: ['Positive'] });
});
