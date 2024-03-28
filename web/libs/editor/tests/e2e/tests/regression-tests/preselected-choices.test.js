const assert = require('assert');

Feature('Preselected choices');

Scenario('Make a duplicate of annotation with preselected choices', async ({ I, LabelStudio, AtTopbar }) => {
  const params = {
    config: `
<View>
  <Text name="text" value="$text"></Text>
  <Choices name="choices" toName="text">
    <Choice value="Option 1" selected="true"/>
    <Choice value="Option 2" />
  </Choices>
</View>`,
    data: {
      text: 'Some text',
    },
    annotations: [{
      id: 'test',
      result: [
        {
          from_name: 'choices',
          id: 'mDp7Hpbw6_',
          origin: 'manual',
          to_name: 'text',
          type: 'choices',
          value: {
            choices: ['Option 2'],
          },
        },
      ],
    }],
  };

  I.amOnPage('/');
  LabelStudio.init(params);
  // Try to create copy of current annotation
  AtTopbar.click('[aria-label="Copy Annotation"]');
  const duplicateResult = await LabelStudio.serialize();

  // Make sure there are no results other than the copied ones
  assert.deepStrictEqual(duplicateResult.length, 1);
  assert.deepStrictEqual(duplicateResult[0].value.choices, ['Option 2']);

  // Create new annotation
  I.click('[aria-label="Annotations List Toggle"]');
  I.click('[aria-label="Create Annotation"]');
  const annotationWithPresetValues = await LabelStudio.serialize();

  // Check that there is only the result come from selecting by default
  assert.deepStrictEqual(annotationWithPresetValues.length, 1);
  assert.deepStrictEqual(annotationWithPresetValues[0].value.choices, ['Option 1']);
});

Scenario('Make a duplicate of empty annotation with preselected choices', async ({ I, LabelStudio, AtTopbar }) => {
  const params = {
    config: `
<View>
  <Text name="text" value="$text"></Text>
  <Choices name="choices" toName="text">
    <Choice value="Option 1" selected="true"/>
    <Choice value="Option 2" />
  </Choices>
</View>`,
    data: {
      text: 'Some text',
    },
    annotations: [{
      id: 'test',
      result: [],
    }],
  };

  I.amOnPage('/');
  LabelStudio.init(params);
  // Try to create copy of current annotation
  AtTopbar.click('[aria-label="Copy Annotation"]');
  const duplicateResult = await LabelStudio.serialize();

  // Make sure there are no preselected results
  assert.deepStrictEqual(duplicateResult.length, 0);

  // Create new annotation
  I.click('[aria-label="Annotations List Toggle"]');
  I.click('[aria-label="Create Annotation"]');
  const annotationWithPresetValues = await LabelStudio.serialize();

  // Check that there is only the result come from selecting by default
  assert.deepStrictEqual(annotationWithPresetValues.length, 1);
  assert.deepStrictEqual(annotationWithPresetValues[0].value.choices, ['Option 1']);
});
