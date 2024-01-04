const assert = require('assert');

Feature('Nested choices');

Scenario('Switching states at nested choices', async ({ I, LabelStudio })=>{
  const params = {
    config: `
<View>
  <Text name="text" value="$text"></Text>
  <Choices name="choices" toName="text" allownested="true" >
    <Choice value="Header 1">
      <Choice value="Option 1.1" />
      <Choice value="Option 1.2" />
    </Choice>
    <Choice value="Header 2">
      <Choice value="Option 2.1" />
      <Choice value="Option 2.2" />
      <Choice value="Option 2.3" />
    </Choice>
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

  {
    // Select one choice
    I.click('Option 1.1');
    const result = await LabelStudio.serialize();

    // Should be checked only one item
    assert.deepStrictEqual(result[0].value.choices.length, 1);
    assert.deepStrictEqual(result[0].value.choices, [['Header 1', 'Option 1.1']]);

    // There might be checkbox with indeterminate state
    I.seeElement('.ant-checkbox-indeterminate [name=\'Header 1\']');
  }

  {
    // Select a couple of choices by selecting the parent choice
    I.click('Header 1');
    const result = await LabelStudio.serialize();

    // Should be checked three items
    assert.deepStrictEqual(result[0].value.choices.length, 3);
    assert.deepStrictEqual(result[0].value.choices, [['Header 1'], ['Header 1', 'Option 1.1'], ['Header 1', 'Option 1.2']]);
    I.dontSeeElement('.ant-checkbox-indeterminate [name=\'Header 1\']');
  }

  {
    // Unselect a couple of choices by unselecting the parent choice
    I.click('Header 1');
    const result = await LabelStudio.serialize();

    // Should be checked three items
    assert.deepStrictEqual(result.length, 0);
  }

});

Scenario('Nested choices states from the annotation', async ({ I, LabelStudio })=>{
  const params = {
    config: `
<View>
  <Text name="text" value="$text"></Text>
  <Choices name="choices" toName="text" allownested="true" >
    <Choice value="Header 1">
      <Choice value="Option 1.1" />
      <Choice value="Option 1.2" />
    </Choice>
    <Choice value="Header 2">
      <Choice value="Option 2.1" />
      <Choice value="Option 2.2" />
    </Choice>
    <Choice value="Header 3">
      <Choice value="Option 3.1" />
      <Choice value="Option 3.2" />
    </Choice>
  </Choices>
</View>`,
    data: {
      text: 'Some text',
    },
  };

  I.amOnPage('/');

  // Load annotation with each type of selection for branches (fully checked, fully unchecked, partly checked)
  LabelStudio.init({
    ...params,
    annotations: [{
      id: 'test',
      result: [
        {
          id: 'choices_test',
          from_name: 'choices',
          to_name: 'text',
          type: 'choices',
          value: {
            choices: [
              ['Header 1'],
              ['Header 1', 'Option 1.1'],
              ['Header 1', 'Option 1.2'],
              ['Header 3', 'Option 3.1'],
            ],
          },
        },
      ],
    }],
  });

  // Check loaded results:

  // Fully checked branch of choices
  I.dontSeeElement('.ant-checkbox-indeterminate [name=\'Header 1\']');
  I.seeElement('.ant-checkbox-checked [name=\'Header 1\']');
  I.seeElement('.ant-checkbox-checked [name=\'Option 1.1\']');
  I.seeElement('.ant-checkbox-checked [name=\'Option 1.2\']');

  // Fully unchecked branch of choices
  I.dontSeeElement('.ant-checkbox-indeterminate [name=\'Header 2\']');
  I.dontSeeElement('.ant-checkbox-checked [name=\'Header 2\']');
  I.dontSeeElement('.ant-checkbox-checked [name=\'Option 2.1\']');
  I.dontSeeElement('.ant-checkbox-checked [name=\'Option 2.2\']');

  // Partly checked branch of choices
  I.seeElement('.ant-checkbox-indeterminate [name=\'Header 3\']');
  I.dontSeeElement('.ant-checkbox-checked [name=\'Header 3\']');
  I.seeElement('.ant-checkbox-checked [name=\'Option 3.1\']');
  I.dontSeeElement('.ant-checkbox-checked [name=\'Option 3.2\']');

  const result = await LabelStudio.serialize();

  // Should be checked only one item
  assert.deepStrictEqual(result[0].value.choices.length, 4);
  assert.deepStrictEqual(result[0].value.choices, [
    ['Header 1'],
    ['Header 1', 'Option 1.1'],
    ['Header 1', 'Option 1.2'],
    ['Header 3', 'Option 3.1'],
  ]);
});
