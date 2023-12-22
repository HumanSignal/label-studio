const assert = require('assert');

Feature('Richtext regions interactions');

Before(({ LabelStudio }) => {
  LabelStudio.setFeatureFlags({
    ff_front_1170_outliner_030222_short: true,
    fflag_feat_front_lsdv_4620_richtext_opimization_060423_short: true,
  });
});

Scenario('Setting correct cursor on regions in relation creating mode', async ({ I, LabelStudio, AtOutliner, AtDetails }) => {
  I.amOnPage('/');
  LabelStudio.init({
    config: `<View>
    <Labels name="label" toName="text">
        <Label value="Label" background="green"/>
    </Labels>
    <Text name="text" value="$text" />
</View>`,
    data: {
      text: 'Here is some text.',
    },
    annotations: [
      {
        id: 'test',
        result: [
          {
            id: 'A',
            from_name: 'label',
            to_name: 'text',
            type: 'labels',
            value: { start: 0, end: 4, labels: ['Label'] },
          },
          {
            id: 'B',
            from_name: 'label',
            to_name: 'text',
            type: 'labels',
            value: { start: 5, end: 7, labels: ['Label'] },
          },
          {
            id: 'C',
            from_name: 'label',
            to_name: 'text',
            type: 'labels',
            value: { start: 5, end: 7, labels: ['Label'] },
          },
          {
            id: 'D',
            from_name: 'label',
            to_name: 'text',
            type: 'labels',
            value: { start: 8, end: 12, labels: ['Label'] },
          },
        ],
      },
    ],
  });
  LabelStudio.waitForObjectsReady();
  AtOutliner.seeRegions(4);

  I.say('Hide last region');
  AtOutliner.toggleRegionVisibility(4);


  I.say('Go into the relation creating mode from the first region');
  AtOutliner.clickRegion(1);
  AtDetails.clickCreateRelation();

  I.say('Cursor should be equal to `crosshair` when element is hovered and it is relation creating mode and visible');
  {
    I.say('Check the same region');
    const elementLocator = locate('[class*="htx-highlight-A"]');

    I.moveCursorTo(elementLocator);
    const cursor = await I.grabCssPropertyFrom(elementLocator, 'cursor');

    assert.strictEqual(cursor, 'crosshair');
  }
  {
    I.say('Check second region');
    const elementLocator = locate('[class*="htx-highlight-B"]');

    I.moveCursorTo(elementLocator);
    const cursor = await I.grabCssPropertyFrom(elementLocator, 'cursor');

    assert.strictEqual(cursor, 'crosshair');
  }

  {
    I.say('Check the hidden region');
    const elementLocator = locate('[class*="htx-highlight-D"]');

    I.moveCursorTo(elementLocator);
    const cursor = await I.grabCssPropertyFrom(elementLocator, 'cursor');

    assert.notStrictEqual(cursor, 'crosshair');
  }

  AtDetails.clickCreateRelation();
  I.say('It\'s not relation creating mode so there should be cursor equal to `pointer`');
  {
    I.say('Check the same region');
    const elementLocator = locate('[class*="htx-highlight-A"]');

    I.moveCursorTo(elementLocator);
    const cursor = await I.grabCssPropertyFrom(elementLocator, 'cursor');

    assert.strictEqual(cursor, 'pointer');
  }
  {
    I.say('Check second region');
    const elementLocator = locate('[class*="htx-highlight-B"]');

    I.moveCursorTo(elementLocator);
    const cursor = await I.grabCssPropertyFrom(elementLocator, 'cursor');

    assert.strictEqual(cursor, 'pointer');
  }
  {
    I.say('Check the hidden region');
    const elementLocator = locate('[class*="htx-highlight-D"]');

    I.moveCursorTo(elementLocator);
    const cursor = await I.grabCssPropertyFrom(elementLocator, 'cursor');

    assert.notStrictEqual(cursor, 'pointer');
  }
});

Scenario('Hidden region interactions', async ({ I, LabelStudio, AtOutliner, AtDetails }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: `<View>
    <Labels name="label" toName="text">
        <Label value="Label" background="green"/>
    </Labels>
    <Text name="text" value="$text" />
</View>`,
    data: {
      text: 'Here is some text.',
    },
    annotations: [
      {
        id: 'test',
        result: [
          {
            id: 'a',
            from_name: 'label',
            to_name: 'text',
            type: 'labels',
            value: { start: 0, end: 4, labels: ['Label'] },
          },
          {
            id: 'hidden_1',
            from_name: 'label',
            to_name: 'text',
            type: 'labels',
            value: { start: 2, end: 3, labels: ['Label'] },
          },
          {
            id: 'hidden_2',
            from_name: 'label',
            to_name: 'text',
            type: 'labels',
            value: { start: 5, end: 7, labels: ['Label'] },
          },
          {
            id: 'hidden_3',
            from_name: 'label',
            to_name: 'text',
            type: 'labels',
            value: { start: 8, end: 12, labels: ['Label'] },
          },
          {
            id: 'b',
            from_name: 'label',
            to_name: 'text',
            type: 'labels',
            value: { start: 9, end: 11, labels: ['Label'] },
          },
        ],
      },
    ],
  });

  LabelStudio.waitForObjectsReady();

  I.say('Hide last regions');
  AtOutliner.toggleRegionVisibility(2);
  AtOutliner.toggleRegionVisibility(3);
  AtOutliner.toggleRegionVisibility(4);

  I.say('Try to select the first hidden element');
  I.click(locate('.htx-highlight').withText('r'));
  I.say('It should select other visible element');
  I.dontSeeElement(locate('.htx-highlight.__hidden.__active').withText('r'));
  I.seeElement(locate('.htx-highlight.__active').withChild(locate('.htx-highlight.__hidden').withText('r')));

  I.say('Reset selection');
  I.pressKey('u');

  I.say('Try to select the second hidden element');
  I.click(locate('.htx-highlight').withText('is'));
  I.say('It should not select anything');
  I.dontSeeElement(locate('.htx-highlight.__active'));

  I.say('Try to select the visible element over the third hidden one');
  I.click(locate('.htx-highlight:not(.__hidden)').withText('om'));
  I.say('It should become selected');
  I.dontSeeElement(locate('.htx-highlight.__hidden.__active').withChild(locate('.htx-highlight').withText('om')));
  I.seeElement(locate('.htx-highlight.__active:not(.__hidden)').withText('om'));
});
