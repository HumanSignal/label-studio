const assert = require('assert');
const { serialize } = require('./helpers');

Feature('Text Area');

const config = `
<View> 
  <Text name="text" size="10" value="$text"/> 
  <TextArea name="ta" toName="text"></TextArea> 
</View>
`;

const data = {
  text: 'To have faith is to trust yourself to the water',
};

const params = { annotations: [{ id: 'test', result: [] }], config, data };

Scenario('Check if text area is saving lead_time', async function({ I, LabelStudio, AtTextAreaView }) {
  I.amOnPage('/');
  LabelStudio.setFeatureFlags({
    fflag_fix_front_lsdv_4600_lead_time_27072023_short: true,
  });

  LabelStudio.init(params);

  AtTextAreaView.addNewTextTag('abcabc');

  AtTextAreaView.addNewTextTag('abc abc abc abc');

  AtTextAreaView.addNewTextTag('cba cba cba');

  const result = await I.executeScript(serialize);

  assert.notEqual(result[0]?.meta?.lead_time ?? 0, 0, 'Lead time is not saved');
});
