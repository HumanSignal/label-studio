const assert = require('assert');

Feature('Richtext regions displaying');

Before(({ LabelStudio }) => {
  LabelStudio.setFeatureFlags({
    ff_front_1170_outliner_030222_short: true,
    fflag_feat_front_lsdv_4620_richtext_opimization_060423_short: true,
  });
});

Scenario('Display correct colors', async ({ I, LabelStudio, AtLabels, AtRichText }) => {
  I.amOnPage('/');
  LabelStudio.init({
    config: `<View>
    <Labels name="label" toName="text">
        <Label value="Red" background="rgb(255,0,0)" />
        <Label value="Green" background="rgb(0,255,0)" />
        <Label value="Blue" background="rgb(0,0,255)" />
        <Label value="Yellow" background="rgb(255,255,0)" />
    </Labels>
    <Text name="text" value="$text" />
</View>`,
    data: {
      text: 'Red. Green. Blue. Yellow.',
    },
    annotations: [
      {
        id: 'test',
        result: [
          {
            id: 'Red',
            from_name: 'label',
            to_name: 'text',
            type: 'labels',
            value: { start: 0, end: 3, labels: ['Red'] },
          },
          {
            id: 'Green',
            from_name: 'label',
            to_name: 'text',
            type: 'labels',
            value: { start: 5, end: 10, labels: ['Green'] },
          },
        ],
      },
    ],
    settings: {
      selectAfterCreate: true,
    },
  });

  LabelStudio.waitForObjectsReady();

  {
    I.pressKey('u');
    const elementLocator = locate('.htx-highlight').withText('Red');

    I.say('Red is red');
    const color = await I.grabCssPropertyFrom(elementLocator, 'background-color');

    I.say(`The color of it is ${color}`);
    assert(color.includes('(255, 0, 0'), 'Oh no! Red is not red!');
    I.say('even if it\'s selected');

    I.click(elementLocator);
    const selectedColor = await I.grabCssPropertyFrom(elementLocator, 'background-color');

    I.say(`The color of it is ${selectedColor}`);
    assert(selectedColor.includes('(255, 0, 0'), 'Oh no! Red is not red!');
  }
  {
    I.pressKey('u');
    const elementLocator = locate('.htx-highlight').withText('Green');

    I.say('Green is green');
    const color = await I.grabCssPropertyFrom(elementLocator, 'background-color');

    I.say(`The color of it is ${color}`);
    assert(color.includes('(0, 255, 0'), 'Oh no! Green is not green!');
    I.say('even if it\'s selected');

    I.click(elementLocator);
    const selectedColor = await I.grabCssPropertyFrom(elementLocator, 'background-color');

    I.say(`The color of it is ${selectedColor}`);
    assert(selectedColor.includes('(0, 255, 0'), 'Oh no! Green is not green!');
  }
  {
    I.pressKey('u');
    I.say('Let\'s label "Blue" as `Blue`.');
    AtLabels.clickLabel('Blue');
    AtRichText.selectTextByGlobalOffset(12, 16);

    const elementLocator = locate('.htx-highlight').withText('Blue');

    I.say('Now Blue is blue');
    const color = await I.grabCssPropertyFrom(elementLocator, 'background-color');

    I.say(`The color of it is ${color}`);
    assert(color.includes('(0, 0, 255'), 'Oh no! Blue is not blue!');
    I.say('even if it\'s unselected');

    I.pressKey('u');
    const unselectedColor = await I.grabCssPropertyFrom(elementLocator, 'background-color');

    I.say(`The color of it is ${unselectedColor}`);
    assert(unselectedColor.includes('(0, 0, 255'), 'Oh no! Blue is not blue!');
  }
  {
    I.pressKey('u');
    I.say('Let\'s label "Yellow" as `Red`.');
    AtLabels.clickLabel('Red');
    AtRichText.selectTextByGlobalOffset(18, 24);
    I.say('Change it to Green');
    AtLabels.clickLabel('Green');
    I.say('and finally to Yellow');
    AtLabels.clickLabel('Yellow');

    const elementLocator = locate('.htx-highlight').withText('Yellow');

    I.say('It\'s really yellow now');
    const color = await I.grabCssPropertyFrom(elementLocator, 'background-color');

    I.say(`The color of it is ${color}`);
    assert(color.includes('(255, 255, 0'), 'Oh no! Yellow is not yellow!');
    I.say('even if it\'s unselected');

    I.pressKey('u');
    const unselectedColor = await I.grabCssPropertyFrom(elementLocator, 'background-color');

    I.say(`The color of it is ${unselectedColor}`);
    assert(unselectedColor.includes('(255, 255, 0'), 'Oh no! Yellow is not yellow!');
  }
});

Scenario('Displaying selected and highlighted regions', async ({ I, LabelStudio, AtOutliner, AtDetails }) => {
  I.amOnPage('/');
  LabelStudio.init({
    config: `<View>
    <Labels name="label" toName="text" allowempty="true">
        <Label value="Region" background="rgb(255,0,255)" />
    </Labels>
    <Text name="text" value="$text" />
</View>`,
    data: {
      text: 'Region. Blank.',
    },
    annotations: [
      {
        id: 'test',
        result: [
          {
            id: 'Region',
            from_name: 'label',
            to_name: 'text',
            type: 'labels',
            value: { start: 0, end: 6, labels: ['Region'] },
          },
          {
            id: 'Blank',
            from_name: 'label',
            to_name: 'text',
            type: 'labels',
            value: { start: 8, end: 13, labels: [] },
          },
        ],
      },
    ],
  });

  LabelStudio.waitForObjectsReady();
  AtOutliner.seeRegions(2);

  {
    I.say('Highlighted regions should have a different border');
    const originalBorder = await I.grabCssPropertyFrom('.htx-highlight', 'border');

    {
      I.say('The different border should appears on hovering region');
      AtOutliner.hoverRegion(1);

      const hoveredBorder = await I.grabCssPropertyFrom('.htx-highlight', 'border');

      assert.notEqual(originalBorder, hoveredBorder, 'The border of the region hovered in outliner tree should be different from the normal state\'s value');
    }
    {
      I.say('Unhover the region');
      I.moveCursorTo('#logo');
      const unhoveredBorder = await I.grabCssPropertyFrom('.htx-highlight', 'border');

      assert.equal(originalBorder, unhoveredBorder, 'The border of the region that was unhovered should be equal to the original state\'s value');
    }
    {
      I.say('The other way to get hovered state id using the "Create relation" tool...');
      AtOutliner.clickRegion(2);
      AtDetails.clickCreateRelation();

      I.say('...and hover it inside the editor.');
      I.moveCursorTo('.htx-highlight');
      const hoveredBorder = await I.grabCssPropertyFrom('.htx-highlight', 'border');

      assert.notEqual(originalBorder, hoveredBorder, 'The border of the region hovered inside the editor tree should be different from the normal state\'s value');
    }
  }

  I.say('Unselect region');
  I.pressKey('u');

  {
    I.say('The background of the element should be visually different on selection');
    const originalBackground = await I.grabCssPropertyFrom('.htx-highlight', 'background');

    AtOutliner.clickRegion(1);
    const selectedBackground = await I.grabCssPropertyFrom('.htx-highlight', 'background');

    assert.notEqual(originalBackground, selectedBackground, 'The background of the element should be visually different on selection');
  }
});

Scenario('Displaying label in the region', async ({ I, LabelStudio, AtOutliner, AtSettings }) => {
  async function checkLabelVisibility(locator, content, shouldBeVisible = true) {
    const text = await I.grabCssPropertyFromPseudo(locator, 'content', 'after');
    const display = await I.grabCssPropertyFromPseudo(locator, 'display', 'after');

    assert.strictEqual(text, content, `Label name should be "${content}" but "${text}" was seen.`);
    if (shouldBeVisible) {
      assert.strictEqual(display, 'inline', 'Label should be visible.');
    } else {
      assert.strictEqual(display, 'none', 'Label should be hidden.');
    }
  }

  I.amOnPage('/');
  LabelStudio.init({
    config: `<View>
    <Labels name="label" toName="text" allowempty="true">
        <Label value="Region" background="rgb(255,0,255)" />
    </Labels>
    <Text name="text" value="$text" />
</View>`,
    data: {
      text: 'Region. Blank.',
    },
    annotations: [
      {
        id: 'test',
        result: [
          {
            id: 'Region',
            from_name: 'label',
            to_name: 'text',
            type: 'labels',
            value: { start: 0, end: 6, labels: ['Region'] },
          },
          {
            id: 'Blank',
            from_name: 'label',
            to_name: 'text',
            type: 'labels',
            value: { start: 8, end: 13, labels: [] },
          },
        ],
      },
    ],
    settings: {
      showLabels: true,
    },
  });

  LabelStudio.waitForObjectsReady();
  AtOutliner.seeRegions(2);

  await checkLabelVisibility(locate('.htx-highlight').at(1), '"Region"', true);
  await checkLabelVisibility(locate('.htx-highlight').at(2), 'none', true);

  I.say('Hide labels in settings');
  AtSettings.open();
  AtSettings.setGeneralSettings({
    [AtSettings.GENERAL_SETTINGS.SHOW_LABELS]: false,
  });
  AtSettings.close();
  I.say('Make sure that label is hidden');
  await checkLabelVisibility(locate('.htx-highlight').at(1), '"Region"', false);
  await checkLabelVisibility(locate('.htx-highlight').at(2), 'none', false);
});
