const assert = require('assert');

Feature('Annotation button').tag('@regres');

Scenario('Annotation button should keep border width on hover', async ({ I, LabelStudio }) => {
  LabelStudio.setFeatureFlags({
    fflag_feat_front_dev_3873_labeling_ui_improvements_short: true,
  });

  I.amOnPage('/');
  LabelStudio.init({
    config: `<View>
  <Text name="text" value="$text" />
</View>`,
    data: {
      text: 'Some text',
    },
    annotations: [
      {
        id: 'test_1',
        result: [],
      },
      {
        id: 'test_2',
        result: [],
      },
    ],
  });

  const borderWidth = await I.executeScript(()=>{
    const el = document.querySelector('.lsf-annotation-button:nth-child(2)');
    const borderWidth = window.getComputedStyle(el).getPropertyValue('border-width');

    return borderWidth;
  });

  I.moveCursorTo('.lsf-annotation-button:nth-child(2)');

  const borderWidthHovered = await I.executeScript(()=>{
    const el = document.querySelector('.lsf-annotation-button:nth-child(2)');
    const borderWidth = window.getComputedStyle(el).getPropertyValue('border-width');

    return borderWidth;
  });

  assert.strictEqual(
    borderWidth,
    borderWidthHovered,
    'Annotation button\'s border width should not change on hover',
  );
});