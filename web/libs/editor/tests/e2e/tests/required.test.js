const { initLabelStudio } = require('./helpers');

Feature('Test required param');

const createConfig = ({ visibleWhen = 'choice-selected' } = {}) => {
  return `
  <View>
    <Text name="text" value="$text"></Text>
    <Choices name="validation-label" required="true" toName="text">
      <Choice value="Missing words" alias="missing-words"></Choice>
      <Choice value="Valid" alias="valid"></Choice>
    </Choices>
    <Choices name="second" required="true" toName="text">
      <Choice value="Don't select me" alias="dont"></Choice>
      <Choice value="Me neither" alias="neither"></Choice>
    </Choices>
    <Choices name="easter-egg" required="true" toName="text"
      visibleWhen="${visibleWhen}"
      whenTagName="second"
      whenChoiceValue="Me neither"
    >
      <Choice value="Secret level"></Choice>
      <Choice value="Click on me now"></Choice>
    </Choices>
  </View>
`;
};


const complex = `
  <View>
    <Text name="text" value="$text"></Text>
    <Labels name="toggle">
      <Label value="Hidden" />
      <Label value="Useless" />
    </Labels>
    <View>(select region to see more required controls)</View>
    <View visibleWhen="region-selected">
      <Header>Required per-region choices</Header>
      <Choices name="validation-label" required="true" toName="text" perRegion="true">
        <Choice value="Missing words" alias="missing-words"></Choice>
        <Choice value="Valid" alias="valid"></Choice>
      </Choices>
    </View>

    <Header>Required common description</Header>
    <Textarea name="common-description" toName="text" required="true" />
    <View visibleWhen="region-selected">
      <Header>Required region description</Header>
      <Textarea name="region-description" toName="text" required="true" perRegion="true" />
    </View>

    <Header>Nested controls are required, but only when you select one of those:</Header>
    <Choices name="switch" toName="text">
      <Choice value="Required textarea" alias="dont"></Choice>
      <Choice value="Required choices" alias="neither"></Choice>
    </Choices>
    <View visibleWhen="choice-selected"
      whenTagName="switch"
      whenChoiceValue="Required textarea">
      <Header>Required only when "Required textarea" selected</Header>
      <Textarea name="choice-description" toName="text" required="true" />
    </View>

    <View visibleWhen="choice-selected"
      whenTagName="switch"
      whenChoiceValue="Required choices">
      <Header>Required only when "Required choices" selected</Header>
      <Choices name="choice" toName="text" required="true">
        <Choice value="Don't select me" alias="dont"></Choice>
        <Choice value="Me neither" alias="neither"></Choice>
      </Choices>
    </View>
  </View>
`;

const text = 'To have faith is to trust yourself to the water';
const result = {
  id: 'qwerty',
  from_name: 'toggle',
  to_name: 'text',
  type: 'labels',
  origin: 'manual',
  value: { start: 3, end: 7, labels: ['Hidden'] },
};
const annotations = [{ id: '1', result: [result] }];

Scenario('Check required param', async function({ I }) {
  const params = { config: createConfig(), data: { text } };

  const waitForError = name => {
    I.waitForText('OK');
    I.see('Warning');
    I.see('Checkbox "' + name + '" is required');
    I.seeElement('.ant-modal');
    I.click('OK');
    I.waitToHide('.ant-modal');
  };

  I.amOnPage('/');
  I.executeScript(initLabelStudio, params);

  // Add new Annotation to be able to submit it
  I.click('[aria-label="Annotations List Toggle"]');
  I.click('[aria-label="Create Annotation"]');
  I.submitAnnotation();
  waitForError('validation-label');

  I.click('Me neither');
  I.submitAnnotation();
  waitForError('validation-label');

  I.click('Valid');
  I.submitAnnotation();
  waitForError('easter-egg');

  I.click('Don\'t select me');
  I.submitAnnotation();
  // Annotation is submitted, so now we can only update it
  I.seeAnnotationSubmitted();

  // Reload to check another combination
  I.executeScript(initLabelStudio, params);
  // Page is reloaded, there are no new annotation from prev steps
  I.dontSee('New annotation');
  I.click('[aria-label="Annotations List Toggle"]');
  I.click('[aria-label="Create Annotation"]');
  I.click('Valid');
  I.submitAnnotation();
  I.see('Warning');
  I.see('Checkbox "second" is required');
});

Scenario('Check required param in complex config', async function({ I }) {
  const params = { annotations, config: complex, data: { text } };

  const waitForError = name => {
    I.waitForText('OK');
    I.see('Warning');
    // Two possible errors:
    // - Checkbox "name" is required.
    // - Input for the textarea "name" is required.
    I.see('"' + name + '" is required');
    I.seeElement('.ant-modal');
    I.click('OK');
    I.waitToHide('.ant-modal');
  };

  I.amOnPage('/');
  I.executeScript(initLabelStudio, params);

  // we already have an annotation
  I.updateAnnotation();
  waitForError('validation-label');

  // region stays selected after error, so per-region controls are visible
  I.click('Valid');
  I.updateAnnotation();
  waitForError('common-description');

  I.fillField('common-description', 'some text');
  I.updateAnnotation();
  waitForError('region-description');

  // again stays visible
  I.fillField('region-description', 'some description');

  I.updateAnnotation();
  // after successful update region is unselected and no modals shown
  I.dontSee('Valid');
  I.dontSeeElement('.ant-modal');

  I.click('Required textarea');
  I.updateAnnotation();
  waitForError('choice-description');

  I.click('Required choices');
  I.updateAnnotation();
  waitForError('choice');

  I.click('Me neither');
  // select labeled region
  I.click(locate('li').withText('have'));
  I.see('Valid');
  I.updateAnnotation();
  I.dontSee('Valid');

  I.click('Required textarea');
  I.updateAnnotation();
  waitForError('choice-description');
  I.fillField('choice-description', 'test text');
  // select labeled region
  I.click(locate('li').withText('have'));
  I.see('Valid');
  I.updateAnnotation();
  I.dontSee('Valid');

  I.click('[aria-label="Annotations List Toggle"]');
  I.click('[aria-label="Create Annotation"]');
  I.submitAnnotation();
  waitForError('common-description');
  I.fillField('common-description', 'some text');
  I.submitAnnotation();
  I.seeAnnotationSubmitted();
});

Scenario('Check required param with visibleWhen=\'choice-unselected\'', async function({ I, LabelStudio }) {
  const params = { config: createConfig({ visibleWhen: 'choice-unselected' }), data: { text } };
  const waitForError = name => {
    I.waitForText('OK');
    I.see('Warning');
    I.see('Checkbox "' + name + '" is required');
    I.seeElement('.ant-modal');
    I.click('OK');
    I.waitToHide('.ant-modal');
  };

  I.amOnPage('/');
  LabelStudio.init(params);

  // Add new Annotation to be able to submit it
  I.click('[aria-label="Annotations List Toggle"]');
  I.click('[aria-label="Create Annotation"]');

  // Select one from each choices groups, except the one with visibleWhen condition
  I.click('Valid');
  I.click('Don\'t select me');

  // We should get error, cause "easter-egg" is visible and required
  I.submitAnnotation();
  waitForError('easter-egg');

  // Select the "Me neither" option to make the "easter-egg" block not required
  I.click('Me neither');
  I.submitAnnotation();
  // Annotation is submitted, so now we can only update it
  I.seeAnnotationSubmitted();

  // Reset to check another scenario
  LabelStudio.init(params);
  // LabelStudio is reloaded, there are no new annotation from prev steps
  I.dontSee('New annotation');
  I.click('[aria-label="Annotations List Toggle"]');
  I.click('[aria-label="Create Annotation"]');

  // Select all required options we have
  I.click('Valid');
  I.click('Don\'t select me');
  I.click('Secret level');

  I.submitAnnotation();
  // Annotation is submitted, so now we can only update it
  I.seeAnnotationSubmitted();
});
