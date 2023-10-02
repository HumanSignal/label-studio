Feature('Shortcuts functional');

const createConfig = ({ rows = '1' }) => {
  return `<View>
  <TextArea name="text" toName="audio" editable="true" rows="${rows}">
    <Shortcut alias="[-]" value="-" hotkey="1" />
    <Shortcut alias="[ + ]" value=" + " hotkey="2" />
    <Shortcut alias="[!]" value="!" hotkey="3" />
    <Shortcut alias="[make a ninja]" value="‍👤" hotkey="4" />
  </TextArea>
  <Audio name="audio" value="$audio"/>
  <Labels name="labels" toName="audio" allowempty="true">
    <Label value="Label1"/>
    <Label value="Label2"/>
  </Labels>
</View>
`;
};

const configParams = new DataTable(['inline']);

[true, false].forEach((inline) => {
  configParams.add([inline]);
});

const AUDIO_URL = 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/audio/barradeen-emotional.mp3';

const TEXT_SELECTOR = '[name=\'text\']';

Data(configParams).Scenario('Should keep the focus and cursor position.', async ({ I, LabelStudio, AtSidebar, current }) => {
  const { inline } = current;
  const config = createConfig({
    rows: inline ? '1' : '3',
  });

  const params = {
    config,
    data: { audio: AUDIO_URL },
  };

  I.amOnPage('/');
  LabelStudio.setFeatureFlags({
    ff_front_dev_1564_dev_1565_shortcuts_focus_and_cursor_010222_short: true,
  });
  LabelStudio.init(params);
  AtSidebar.seeRegions(0);

  // Check if there is right input element
  I.seeElement((inline ? 'input' : 'textarea') + TEXT_SELECTOR);

  // Input something there
  I.fillField(TEXT_SELECTOR, 'A B');

  // Try to use shortcuts
  // A B
  I.click(TEXT_SELECTOR);
  // A B|
  // Shortcut by pressing hotkey (the cursor is at the end)
  I.pressKey('3');
  // A B!|
  I.pressKey('ArrowLeft');
  // A B|!
  I.pressKey('ArrowLeft');
  // A |B!
  // Select space
  I.pressKeyDown('Shift');
  I.pressKey('ArrowLeft');
  I.pressKeyUp('Shift');
  // A| |B!
  // Shortcut by clicking button (the cursor is in the middle)
  I.click(locate('.ant-tag').toXPath() + '[contains(text(), \'[ + ]\')]');
  // A + |B!
  I.pressKey('ArrowLeft');
  // A +| B!
  I.pressKey('ArrowLeft');
  // A |+ B!
  I.pressKey('ArrowLeft');
  // A| + B!
  I.pressKey('ArrowLeft');
  // |A + B!
  // Shortcut by pressing hotkey (the cursor is at the begin)
  I.pressKey('1');
  // -|A + B!
  // Commit
  I.pressKey(['Shift', 'Enter']);

  // If we got an expected result then we didn't lost focus.
  AtSidebar.seeRegions(1);
  AtSidebar.see('-A + B!');
});

Data(configParams).Scenario('Should work with emoji.', async ({ I, LabelStudio, AtSidebar, current }) => {
  const { inline } = current;
  const config = createConfig({
    rows: inline ? '1' : '3',
  });

  const params = {
    config,
    data: { audio: AUDIO_URL },
  };

  I.amOnPage('/');
  LabelStudio.setFeatureFlags({
    ff_front_dev_1564_dev_1565_shortcuts_focus_and_cursor_010222_short: true,
  });
  LabelStudio.init(params);
  AtSidebar.seeRegions(0);

  // Check if there is right input element
  I.seeElement((inline ? 'input' : 'textarea') + TEXT_SELECTOR);

  // Try to use shortcuts with emoji
  // Input some cats
  I.fillField(TEXT_SELECTOR, '🐱🐱🐱');
  // 🐱🐱🐱
  I.click(TEXT_SELECTOR);
  // 🐱🐱🐱|
  // Move cursor to the end of the second cat emoji
  I.pressKey('ArrowLeft');
  // 🐱🐱|🐱
  // Make the cat a ninja cat
  I.pressKey('4');
  // 🐱🐱‍👤|🐱
  // Commit
  I.pressKey(['Shift', 'Enter']);

  // If we got an expected result then we didn't lost focus.
  AtSidebar.seeRegions(1);
  AtSidebar.see('🐱🐱‍👤🐱');
});

Data(configParams).Scenario('Should work with existent regions.', async ({ I, LabelStudio, AtSidebar, current }) => {
  const { inline } = current;
  const config = createConfig({
    rows: inline ? '1' : '3',
  });

  const params = {
    config,
    data: { audio: AUDIO_URL },
    annotations: [{
      id: 'Test', result: [
        {
          'value': { 'text': ['A B'] },
          'id': 'floE-bRC8E',
          'from_name': 'text',
          'to_name': 'audio',
          'type': 'textarea',
        }],
    }],
  };

  I.amOnPage('/');
  LabelStudio.setFeatureFlags({
    ff_front_dev_1564_dev_1565_shortcuts_focus_and_cursor_010222_short: true,
    ff_front_dev_1566_shortcuts_in_results_010222_short: true,
  });
  LabelStudio.init(params);
  AtSidebar.seeRegions(1);

  // Start editing
  I.click('[aria-label="Edit Region"]');

  // Try to use shortcuts
  // A B|
  // Shortcut by pressing hotkey (the cursor is at the end)
  I.pressKey('3');
  // A B!|
  I.pressKey('ArrowLeft');
  // A B|!
  I.pressKey('ArrowLeft');
  // A |B!
  // Select space
  I.pressKeyDown('Shift');
  I.pressKey('ArrowLeft');
  I.pressKeyUp('Shift');
  // A| |B!
  // Shortcut by clicking button (the cursor is in the middle)
  I.click(locate('.ant-tag').toXPath() + '[contains(text(), \'[ + ]\')]');
  // A + |B!
  I.pressKey('ArrowLeft');
  // A +| B!
  I.pressKey('ArrowLeft');
  // A |+ B!
  I.pressKey('ArrowLeft');
  // A| + B!
  I.pressKey('ArrowLeft');
  // |A + B!
  // Shortcut by pressing hotkey (the cursor is at the begin)
  I.pressKey('1');
  // -|A + B!
  // Commit
  I.pressKey(['Shift', 'Enter']);

  // If we got an expected result then we didn't lost focus.
  AtSidebar.seeRegions(1);
  AtSidebar.see('-A + B!');
});

{
  const paramsTable = new DataTable(['isInline', 'isPerRegion']);

  for (const isPerRegion of [true, false]) {
    for (const isInline of [true, false]) {
      paramsTable.add([isInline, isPerRegion]);
    }
  }

  const createConfig = ({ rows = '1' }) => {
    return `<View>
  <Text name="text" value="$text" />
  <TextArea name="comment" toName="text" editable="true" rows="${rows}">
    <Shortcut value="Shortcut" hotkey="Alt+V" />
  </TextArea>
</View>
`;
  };
  const createPerRegionConfig = ({ rows = '1' }) => {
    return `<View>
  <Labels name="label" toName="text">
    <Label value="region" />
  </Labels>
  <Text name="text" value="$text" />
  <TextArea name="comment" toName="text" editable="true" rows="${rows}">
    <Shortcut value="Shortcut" hotkey="Alt+V" />
  </TextArea>
</View>
`;
  };

  Data(paramsTable).Scenario('Initial focus', async ({ I, LabelStudio, AtOutliner, current }) => {
    const { isInline, isPerRegion } = current;
    const config = (isPerRegion ? createPerRegionConfig : createConfig)({
      rows: isInline ? '1' : '3',
    });

    I.amOnPage('/');
    LabelStudio.setFeatureFlags({
      ff_front_dev_1564_dev_1565_shortcuts_focus_and_cursor_010222_short: true,
      ff_front_dev_1566_shortcuts_in_results_010222_short: true,
      ff_front_1170_outliner_030222_short: true,
      fflag_fix_front_dev_3730_shortcuts_initial_input_22122022_short: true,
    });

    LabelStudio.init({
      config,
      data: { text: 'A simple text' },
      annotations: [{
        id: 'Test',
        result: isPerRegion ? [
          {
            'value': {
              'start': 9,
              'end': 13,
              'text': 'text',
              'labels': [
                'region',
              ],
            },
            'id': 'Yk0XNP_zRJ',
            'from_name': 'label',
            'to_name': 'text',
            'type': 'labels',
            'origin': 'manual',
          },
        ] : [],
      }],
    });

    if (isPerRegion) {
      I.say('Select region');
      AtOutliner.clickRegion(1);
    }
    I.say('Try to use shortcut at the start');
    I.click(locate('.ant-tag').withText('Shortcut'));
    // eslint-disable-next-line
    // pause();

    I.waitForValue('[name="comment"]', 'Shortcut');

    I.say('Commit text');
    I.pressKey(['Shift', 'Enter']);

    I.say('Check that shortcuts still work in the edit mode');
    I.click('[aria-label="Edit Region"]');
    I.click(locate('.ant-tag').withText('Shortcut'));
    I.waitForValue('[name^="comment:"]', 'ShortcutShortcut');

    I.say('Commit changes');
    I.pressKey(['Shift', 'Enter']);

    I.say('Check that shortcuts work with textarea again');
    I.click(locate('.ant-tag').withText('Shortcut'));
    I.waitForValue('[name="comment"]', 'Shortcut');

  });
}

