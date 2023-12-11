const assert = require('assert');
const { emulateKeypress } = require('../helpers');

Feature('Numpad hotkeys').tag('@regress');

Scenario('Check Numpad numbers working as hotkeys', async ({ I, LabelStudio }) => {
  I.amOnPage('/');
  LabelStudio.init({
    config: ` 
<View>
  <Text name="text" value="$text"/>
  <Choices name="choises" toName="text">
    <Choice value="Click me" hotkey="5" />
  </Choices>
</View>
`,
    data: {
      text: '',
    },
  });
  I.see('Click me');
  I.executeScript(emulateKeypress,{
    charCode: 0,
    code: 'Numpad5',
    composed: true,
    key: '5',
    keyCode: 101,
    which: 101,
    location: 3,
  });
  const result = await LabelStudio.serialize();

  I.say('Should be one choice in results');
  assert.strictEqual(result.length, 1);
  assert.deepStrictEqual(result[0].value.choices, ['Click me']);
});
