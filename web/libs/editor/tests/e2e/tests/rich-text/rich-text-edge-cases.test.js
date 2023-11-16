const assert = require('assert');

Feature('Richtext edge cases');

Before(({ LabelStudio }) => {
  LabelStudio.setFeatureFlags({
    ff_front_1170_outliner_030222_short: true,
  });
});

const edgeCaseConfig = `<View>
    <Labels name="label" toName="html">
        <Label value="Highlight" background="rgb(255, 64, 182)" />
    </Labels>
    <HyperText name="html" value="$html" />
</View>`;
const edgeCaseHtml = `<p>This
is an <u><span>e</span><span>x</span><span>a</span><span>m</span><span>p</span><span>l</span><span>e</span></u><br/> of 
<abbr tytle="HyperText Markup Language"><b>HTML</b></abbr>
</p>`;

const edgeCaseResultValue1 = {
  start: '/p[1]/text()[2]',
  end: '/p[1]/abbr[1]/b[1]/text()[1]',
  startOffset: 1,
  endOffset: 4,
  globalOffsets: { start: 20, end: 28 },
  text: 'of HTML',
  labels: ['Highlight'],
};
const edgeCaseResultValue2 = {
  start: '/p[1]/text()[2]',
  end: '/p[1]/abbr[1]/b[1]/text()[1]',
  startOffset: 2,
  endOffset: 1,
  globalOffsets: { start: 21, end: 25 },
  text: 'f H',
  labels: ['Highlight'],
};
const edgeCaseResultValue3 = {
  start: '/p[1]/text()[1]',
  end: '/p[1]/abbr[1]/b[1]/text()[1]',
  startOffset: 0,
  endOffset: 4,
  globalOffsets: { start: 0, end: 28 },
  text: 'This is an example\\nof HTML',
  labels: ['Highlight'],
};
const edgeCaseResultValue4 = {
  start: '/p[1]/u[1]/span[1]/text()[1]',
  end: '/p[1]/u[1]/span[7]/text()[1]',
  startOffset: 0,
  endOffset: 1,
  globalOffsets: { start: 11, end: 18 },
  text: 'example',
  labels: ['Highlight'],
};

const featureFlags = new DataTable(['FF_LSDV_4620_3']);

// featureFlags.add([false]);
featureFlags.add([true]);

Data(featureFlags).Scenario('Creating, removing and restoring regions in not normalized HTML content', async ({ I, LabelStudio, AtOutliner, AtLabels, AtRichText, current }) => {
  const { FF_LSDV_4620_3 } = current;

  LabelStudio.setFeatureFlags({
    fflag_feat_front_lsdv_4620_richtext_opimization_060423_short: FF_LSDV_4620_3,
  });

  I.amOnPage('/');

  LabelStudio.init({
    config: edgeCaseConfig,
    data: {
      html: edgeCaseHtml,
    },
    annotations: [
      {
        id: 'test',
        result: [],
      },
    ],
  });

  LabelStudio.waitForObjectsReady();

  I.say('Select "of HTML"');
  AtLabels.clickLabel('Highlight');
  AtRichText.selectTextByGlobalOffset(20, 28);

  I.say('Select "f H"');
  AtLabels.clickLabel('Highlight');
  AtRichText.selectTextByGlobalOffset(21, 25);

  I.say('Select everithing');
  AtLabels.clickLabel('Highlight');
  AtRichText.selectTextByGlobalOffset(0, 28);


  I.say('Select "example"');
  AtLabels.clickLabel('Highlight');
  AtRichText.selectTextByGlobalOffset(11, 18);

  // check results
  AtOutliner.seeRegions(4);

  AtOutliner.clickRegion(1);
  I.seeElement(locate('.lsf-region-meta__content').withText('of HTML'));
  AtOutliner.clickRegion(2);
  I.seeElement(locate('.lsf-region-meta__content').withText('f H'));
  AtOutliner.clickRegion(3);
  I.seeElement(locate('.lsf-region-meta__content').withText('This is an example\nof HTML'));
  AtOutliner.clickRegion(4);
  I.seeElement(locate('.lsf-region-meta__content').withText('example'));

  const result = await LabelStudio.serialize();

  assert.deepStrictEqual(result[0].value, edgeCaseResultValue1);
  assert.deepStrictEqual(result[1].value, edgeCaseResultValue2);
  assert.deepStrictEqual(result[2].value, edgeCaseResultValue3);
  assert.deepStrictEqual(result[3].value, edgeCaseResultValue4);

  I.say('Reload and re-init to check results once again');

  I.amOnPage('/');

  LabelStudio.init({
    config: edgeCaseConfig,
    data: {
      html: edgeCaseHtml,
    },
    annotations: [
      {
        id: 'test',
        result,
      },
    ],
  });

  LabelStudio.waitForObjectsReady();

  {
    // check results
    AtOutliner.seeRegions(4);

    AtOutliner.clickRegion(1);
    I.seeElement(locate('.lsf-region-meta__content').withText('of HTML'));
    AtOutliner.clickRegion(2);
    I.seeElement(locate('.lsf-region-meta__content').withText('f H'));
    AtOutliner.clickRegion(3);
    I.seeElement(locate('.lsf-region-meta__content').withText('This is an example\nof HTML'));
    AtOutliner.clickRegion(4);
    I.seeElement(locate('.lsf-region-meta__content').withText('example'));


    const result = await LabelStudio.serialize();

    assert.deepStrictEqual(result[0].value, edgeCaseResultValue1);
    assert.deepStrictEqual(result[1].value, edgeCaseResultValue2);
    assert.deepStrictEqual(result[2].value, FF_LSDV_4620_3
      ? edgeCaseResultValue3
      : {
        ...edgeCaseResultValue3,
        // For the old version of RichText there is inconsistency between just created value and loaded value.
        text: edgeCaseResultValue3.text.replace('\\n', '\n'),
      },
    );
    assert.deepStrictEqual(result[3].value, edgeCaseResultValue4);
  }

});
