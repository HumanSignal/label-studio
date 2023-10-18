const { initLabelStudio, serialize } = require('./helpers');

const assert = require('assert');

Feature('NER');

const configSimple = `
  <View>
    <HyperTextLabels name="ner" toName="text">
      <Label value="Term"></Label>
      <Label value="Abbr"></Label>
    </HyperTextLabels>
    <HyperText name="text" value="$text"></HyperText>
  </View>
`;

// codecept can click only in the middle of element
// block elements have 100% width, so middle point can be out of symbols depending on screen size
// so to click at exact point we use special spans with data-testid as reference
// if we `click()` at two-symbol span it happens between symbols
const text = `<div>
  <h2><span data-testid="r1-start">.N</span>amed-<span data-testid="r1-mid">entity</span> recognitio<span data-testid="r1-end">n.</span></h2>
  <p><b>Named-entity recognition</b> (<b>NER</b>) (also known as <b>entity identification</b>, <b>entity chunking</b> and <b>entity extraction</b>) is a subtask of <a href="/wiki/Information_extraction" title="Information extraction">information extraction</a> that seeks to locate and classify <a href="/wiki/Named_entity" title="Named entity">named entities</a> mentioned in <a href="/wiki/Unstructured_data" title="Unstructured data">unstructured text</a> into pre-defined categories such as person names, organizations, locations, <a href="/wiki/Medical_classification" title="Medical classification">medical codes</a>, time expressions, quantities, monetary values, percentages, etc.</p>
  <p>Most research on NER systems has been structured as taking an unannotated block of text, such as this one:</p>
  <blockquote class="templatequote"><p>Jim bought 300 shares of Acme Corp. in 2006.</p></blockquote>
  <p>And producing an annotated block of text that highlights the names of entities:</p>
  <blockquote class="templatequote"><p>[Jim]<sub>Person</sub> bought 300 shares of [Acme Corp.]<sub>Organization</sub> in [2006]<sub>Time</sub>.</p></blockquote>
</div>`;

const results = [
  {
    start: '/div[1]/h2[1]/span[1]/text()[1]',
    startOffset: 1,
    end: '/div[1]/h2[1]/span[3]/text()[1]',
    endOffset: 1,
    hypertextlabels: ['Term'],
    text: 'Named-entity recognition',
    globalOffsets: {
      end: 28,
      start: 4,
    },
  },
  {
    start: '/div[1]/p[1]/b[2]/text()[1]',
    startOffset: 0,
    end: '/div[1]/p[1]/b[2]/text()[1]',
    endOffset: 3,
    hypertextlabels: ['Abbr'],
    text: 'NER',
    globalOffsets: {
      end: 61,
      start: 58,
    },
  },
];

Scenario('NER labeling for HyperText', async function({ I }) {
  const params = {
    config: configSimple,
    data: { text },
  };

  I.amOnPage('/');
  I.executeScript(initLabelStudio, params);

  // create regions inside iframe
  I.switchTo('iframe');
  I.pressKey('1');
  I.click('[data-testid=r1-start]');
  I.pressKeyDown('Shift');
  I.click('[data-testid=r1-end]');
  I.pressKeyUp('Shift');

  I.pressKey('2');
  I.doubleClick('b:nth-child(2)');

  I.click('[data-testid=r1-mid]');
  I.pressKey(['alt', 'r']);
  I.click('b:nth-child(2)');
  I.switchTo();

  I.see('Relations (1)');

  const result = await I.executeScript(serialize);

  assert.equal(result.length, 3);
  assert.deepEqual(result[0].value, results[0]);
  assert.deepEqual(result[1].value, results[1]);
  assert.equal(result[2].type, 'relation');
  assert.equal(result[2].from_id, result[0].id);
  assert.equal(result[2].to_id, result[1].id);
});
