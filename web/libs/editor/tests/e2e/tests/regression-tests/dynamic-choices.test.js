const assert = require('assert');

Feature('Dynamic choices').tag('@regress');

Scenario('Hotkeys for dynamic choices', async ({ I, LabelStudio })=>{
  const params = {
    config: `
<View>
  <Text name="text" value="$text"></Text>
  <Choices name="choices" toName="text" allownested="true" choice="multiple"  value="$choices">
    <Choice value="Static option" hotkey="s" />
  </Choices>
</View>`,
    data: {
      text: 'Some text',
      choices: [
        {
          value: 'Header 1',
          children: [
            {
              value: 'Option 1.1',
            },
            {
              value: 'Option 1.2',
            },
          ],
        },
        {
          value: 'Header 2',
          children: [
            {
              value: 'Option 2.1',
            },
            {
              value: 'Option 2.2',
            },
            {
              value: 'Option 2.3',
              hotkey: 'q',
            },
          ],
        },
      ],
    },
    annotations: [{
      id: 'test',
      result: [],
    }],
  };

  I.amOnPage('/');

  LabelStudio.init(params);

  I.see('Header 1');
  I.see('Option 1.1');
  I.see('Header 2');
  I.see('Option 2.2');

  I.say('Select some choices by pressing hotkeys');

  I.pressKey('1');
  I.pressKey('q');
  I.pressKey('s');

  I.say('Check the result');

  I.seeElement('.ant-checkbox-checked [name=\'Header 1\']');
  I.seeElement('.ant-checkbox-indeterminate [name=\'Header 2\']');
  I.seeElement('.ant-checkbox-checked [name=\'Option 1.1\']');
  I.seeElement('.ant-checkbox-checked [name=\'Option 1.2\']');
  I.seeElement('.ant-checkbox-checked [name=\'Option 2.3\']');
  I.seeElement('.ant-checkbox-checked [name=\'Static option\']');

  const result = await LabelStudio.serialize();

  assert.deepStrictEqual(result.length, 1);
  assert.deepStrictEqual(result[0].value.choices, [['Static option'], ['Header 1'], ['Header 1', 'Option 1.1'], ['Header 1', 'Option 1.2'], ['Header 2', 'Option 2.3']]);

});
