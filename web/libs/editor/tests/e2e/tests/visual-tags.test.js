const assert = require('assert');
const { initLabelStudio } = require('./helpers');

const config = `
<View>
  <Collapse accordion="false">
    <Panel value="FAQ">
      <Header value="Main questions" />
      <View>
        <Collapse>
          <Panel value="How to add info to config">
            <Text name="q1" value="You can use View, Collapse, Header and Text" />
          </Panel>
          <Panel value="How to add images to config">
            <Text name="q2" value="You can use Image tag with name and static value" />
          </Panel>
        </Collapse>
      </View>
    </Panel>
    <Panel value="Labeling UI">
      <Text name="text" value="$text" />
    </Panel>
  </Collapse>
  <Style>.tall { height: 200px; }</Style>
  <View className="tall">
    <Header size="6">Small header</Header>
  </View>
  <Header size="3">Usual header</Header>
</View>
`;

const data = {
  text: 'The quick brown fox jumps over the lazy dog',
};

Feature('Visual tags');

Scenario('Check Collapse, Header and Style', async ({ I }) => {
  // @todo usual click should work because of role=button
  // @todo or at least locate('[role=button]'), but both of them are failing
  const clickCollapse = text => I.click(locate('.ant-collapse-header').withText(text));

  await I.amOnPage('/');
  I.executeScript(initLabelStudio, { config, data });
  I.see('FAQ');
  I.say('Every panel is hidden at the beginning and no duplicates');
  I.dontSee('Main questions');
  I.dontSee('fox');
  I.dontSee('How to add info');

  I.say('accordion=false should open every panel independently');
  clickCollapse('FAQ');
  I.see('Main questions');
  I.dontSee('fox');
  clickCollapse('Labeling UI');
  I.see('Main questions');
  I.see('fox');

  I.say('acordion=true (default) should show one panel maximum');
  I.dontSee('You can use View');
  I.dontSee('You can use Image');
  clickCollapse('How to add info');
  I.see('You can use View');
  I.dontSee('You can use Image');
  clickCollapse('How to add images');
  I.dontSee('You can use View');
  I.see('You can use Image');
  clickCollapse('How to add images');
  I.dontSee('You can use View');
  I.dontSee('You can use Image');

  I.say('Check correct sizes of headers');
  I.seeElement(locate('h5').withText('Small header'));
  I.seeElement(locate('h3').withText('Usual header'));
  I.seeElement(locate('.tall').withChild('h5'));

  I.say('Styles should be applied by classname');
  const height = await I.grabElementBoundingRect('.tall', 'height');

  assert(height >= 200, true);
});
