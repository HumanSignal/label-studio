/* global Before */
const assert = require('assert');

Feature('Taxonomy');

Before(({ LabelStudio }) => {
  LabelStudio.setFeatureFlags({
    fflag_feat_front_lsdv_5451_async_taxonomy_110823_short: false,
    fflag_fix_front_dev_3617_taxonomy_memory_leaks_fix: true,
    ff_front_dev_1536_taxonomy_user_labels_150222_long: true,
    ff_front_1170_outliner_030222_short: true,
    fflag_fix_front_dev_4075_taxonomy_overlap_281222_short: true,
  });
});

Scenario('Lines overlap', async ({ I, LabelStudio, AtTaxonomy }) => {
  async function checkOverlapAndGap(text1, text2) {
    const bbox1 = await I.grabElementBoundingRect(AtTaxonomy.locate(AtTaxonomy.item).find('label').withText(text1));
    const bbox2 = await I.grabElementBoundingRect(AtTaxonomy.locate(AtTaxonomy.item).find('label').withText(text2));

    bbox1.y2 = bbox1.y + bbox1.height;
    bbox2.y2 = bbox2.y + bbox2.height;

    if (
      bbox1.y < bbox2.y && bbox2.y < bbox1.y2
      || bbox1.y < bbox2.y2 && bbox2.y2 < bbox1.y2
    ) {
      assert.fail('Overlap has been detected');
    }
    const gap = Math.min(Math.abs(bbox1.y - bbox2.y2), Math.abs(bbox2.y - bbox1.y2));

    if (gap > 0) {
      assert.fail(`Detected Lines gap ${gap}`);
    }
  }

  I.amOnPage('/');
  LabelStudio.init({
    config: `
<View>
  <Text name="text" value="$text"/>
  <Taxonomy name="taxonomy" toName="text">
    <Choice value="target group">
      <Choice value="london london london london london london london" />
      <Choice value="long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long line"/>
      <Choice value="not so long line"/>
    </Choice>
  </Taxonomy>
</View>`,
    data: {
      text: 'Annotation 1',
    },
  });

  AtTaxonomy.clickTaxonomy();
  AtTaxonomy.toggleGroupWithText('target group');

  await checkOverlapAndGap('long long long', 'not so long');


  I.amOnPage('/');
  LabelStudio.init({
    config: `
<View>
  <Text name="text" value="$text"/>
  <Taxonomy name="taxonomy" toName="text">
    <Choice value="target group">
      <Choice value="london london london london london london london" />
      <Choice value="long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long line"/>
      <Choice value="not so long line"/>
    </Choice>
  </Taxonomy>
</View>`,
    data: {
      text: 'Annotation 2',
    },
  });

  AtTaxonomy.clickTaxonomy();
  AtTaxonomy.fillSearch('long');
  await checkOverlapAndGap('long long long', 'not so long');

  I.amOnPage('/');
  LabelStudio.init({
    config: `
<View>
  <Text name="text" value="$text"/>
  <Taxonomy name="taxonomy" toName="text">
    <Choice value="target group">
      <Choice value="super long line ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ..."/>
      <Choice value="enough long line ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ..."/>
      <Choice value="not long line ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ... ..."/>
    </Choice>
  </Taxonomy>
</View>`,
    data: {
      text: 'Annotation 3',
    },
  });

  AtTaxonomy.clickTaxonomy();
  AtTaxonomy.fillSearch('long');
  await checkOverlapAndGap('super long line', 'enough long line');
  await checkOverlapAndGap('enough long line', 'not long line');
});

Scenario('Add custom items', async ({ I, LabelStudio, AtTaxonomy }) => {
  const params = {
    config: `
<View>
  <Text name="text" value="$text"/>
  <Taxonomy name="taxonomy" toName="text">
    <Choice value="a">
      <Choice value="ab"/>
      <Choice value="ac"/>
    </Choice>
    <Choice value="b">
      <Choice value="ba"/>
      <Choice value="bc">
        <Choice value="bca"/>
        <Choice value="bcb"/>
        <Choice value="bcc"/>
      </Choice>
    </Choice>
  </Taxonomy>
</View>`,
    data: {
      text: 'Simple text',
    },
  };

  I.amOnPage('/');
  LabelStudio.init(params);

  I.say('Add item to the root');
  AtTaxonomy.clickTaxonomy();
  AtTaxonomy.addNewItem('c');
  AtTaxonomy.seeItemByText('c');

  I.say('Add item to the leaf');
  AtTaxonomy.toggleGroupWithText('b');
  AtTaxonomy.addItemInside('baa', AtTaxonomy.locateItemByText('ba'));
  AtTaxonomy.seeItemByText('baa');

  I.say('Select couple of items');
  AtTaxonomy.clickItemByText('a');
  AtTaxonomy.clickItemByText('baa');
  AtTaxonomy.clickItemByText('c');

  I.say('Check that items become checked');
  AtTaxonomy.seeCheckedItemByText('a');
  AtTaxonomy.seeCheckedItemByText('baa');
  AtTaxonomy.seeCheckedItemByText('c');

  I.say('Check that they are displayed as selected elements in the list');
  AtTaxonomy.seeSelectedValues(['a', 'baa', 'c']);

  I.say('Get custom items');
  const userLabels = await LabelStudio.grabUserLabels();

  I.say('Check significant content of the custom items');
  assert.strictEqual(userLabels.taxonomy.length, 2);
  assert.deepStrictEqual(userLabels.taxonomy[0], ['c']);
  assert.deepStrictEqual(userLabels.taxonomy[1], ['b', 'ba', 'baa']);

  I.say('Serialize and check the result');
  const result = await LabelStudio.serialize();

  assert.deepStrictEqual(result[0].value.taxonomy, [['a'], ['b', 'ba', 'baa'], ['c']]);


  await session('Deserialization', async () => {
    I.amOnPage('/');
    LabelStudio.init({
      ...params,
      annotations: [{
        id: 'test', result,
      }],
    });
    I.say('Restore user labels');
    LabelStudio.initUserLabels(userLabels);

    I.say('Be sure that custom items are in the tree');
    AtTaxonomy.clickTaxonomy();
    AtTaxonomy.seeItemByText('c');
    AtTaxonomy.toggleGroupWithText('b');
    AtTaxonomy.toggleGroupWithText('ba');
    AtTaxonomy.seeItemByText('baa');

    I.say('Check that selected items are displayed as selected elements in the list');
    AtTaxonomy.seeSelectedValues(['a', 'baa', 'c']);

    I.say('Check that items in the tree become checked');
    AtTaxonomy.seeCheckedItemByText('a');
    AtTaxonomy.seeCheckedItemByText('baa');
    AtTaxonomy.seeCheckedItemByText('c');

    const result2 = await LabelStudio.serialize();

    assert.deepStrictEqual(result, result2);
  });

  I.say('Check that a custom items can be deleted');
  AtTaxonomy.deleteItem(AtTaxonomy.locateItemByText('c'));
  AtTaxonomy.deleteItem(AtTaxonomy.locateItemByText('baa'));

  I.say('Check that deleting works');
  AtTaxonomy.dontSeeCheckedItemByText('c');
  AtTaxonomy.dontSeeCheckedItemByText('baa');
  AtTaxonomy.dontSeeItemByText('c');
  AtTaxonomy.dontSeeItemByText('baa');

  const userLabels2 = await LabelStudio.grabUserLabels();

  assert.strictEqual(userLabels2.taxonomy.length, 0);

  // todo: That may be another problem (see: DEV-1967)
  // I.say('Try to make duplicates');
  // AtTaxonomy.addNewItem('d');
  // AtTaxonomy.addNewItem('d');
  // AtTaxonomy.addNewItem('a');
  // AtTaxonomy.addItemInside('ba', AtTaxonomy.locateItemByText('b'));
  // I.dontSeeElement(AtTaxonomy.locateItemByText('d').at(2));
  // I.dontSeeElement(AtTaxonomy.locateItemByText('a').at(2));
  // I.dontSeeElement(AtTaxonomy.locateItemByText('ba').at(2));
});

Scenario('Non unique values filtering', async ({ I, LabelStudio, AtTaxonomy }) => {
  I.amOnPage('/');
  LabelStudio.init({
    config: `
<View>
  <Text name="text" value="$text"/>
  <Taxonomy name="taxonomy" toName="text">
    <Choice value="a">
      <Choice value="a1"/>
    </Choice>
    <Choice value="a">
      <Choice value="a2"/>
    </Choice>
  </Taxonomy>
</View>`,
    data: {
      text: 'Text',
    },
  });
  AtTaxonomy.clickTaxonomy();
  I.seeElement(AtTaxonomy.locateItemByText('a').at(1));
  I.dontSeeElement(AtTaxonomy.locateItemByText('a').at(2));
  AtTaxonomy.toggleGroupWithText('a');
  I.seeElement(AtTaxonomy.locateItemByText('a1').at(1));
  I.dontSeeElement(AtTaxonomy.locateItemByText('a2').at(2));
});

Scenario('Taxonomy read only in history', async ({ I, LabelStudio, AtTaxonomy }) => {
  const annotationHistory = [
    {
      'id': 19,
      'annotation_id': 2,
      'created_by': 1,
      'action_type': 'submitted',
      'created_at': (new Date()).toISOString(),
      'accepted': true,
      'annotation': 24,
      'fixed_annotation_history': 35,
      'previous_annotation_history': 34,
      'result': [
        {
          'value': {
            'taxonomy': [['a', 'ab'], ['c']],
          },
          'id': 'text_id_1',
          'from_name': 'taxonomy',
          'to_name': 'text',
          'type': 'taxonomy',
          'origin': 'manual',
        },
      ],
    },
  ];

  LabelStudio.setFeatureFlags({
    ff_front_1170_outliner_030222_short: false,
  });
  I.amOnPage('/');
  LabelStudio.init({
    config: `
<View>
  <Text name="text" value="$text"/>
  <Taxonomy name="taxonomy" toName="text">
    <Choice value="a">
        <Choice value="ab" />
    </Choice>
    <Choice value="b"/>
    <Choice value="c"/>
  </Taxonomy>
</View>`,
    data: {
      text: 'Text',
    },
    params: {
      history: annotationHistory,
    },
    annotations: [{ id: 2, result: [] }],
  });
  I.click('.lsf-history-item');
  AtTaxonomy.clickTaxonomy();
  AtTaxonomy.seeSelectedValues(['ab', 'c']);
  AtTaxonomy.toggleGroupWithText('a');
  AtTaxonomy.seeCheckedItemByText('ab');
  AtTaxonomy.seeCheckedItemByText('c');
  I.say('Check delete button in selected list');
  I.dontSeeElement(AtTaxonomy.locateSelectedByText('ab').withDescendant('input'));
  I.say('Try to uncheck items in the tree');
  AtTaxonomy.clickItemByText('ab');
  AtTaxonomy.clickItemByText('c');
  I.say('Check that item was not unchecked');
  AtTaxonomy.seeSelectedValues(['ab', 'c']);
  AtTaxonomy.seeCheckedItemByText('ab');
  AtTaxonomy.seeCheckedItemByText('c');
});

Scenario('Taxonomy readonly result', async ({ I, LabelStudio, AtTaxonomy }) => {
  I.amOnPage('/');
  LabelStudio.init({
    config: `
<View>
  <Text name="text" value="$text"/>
  <Taxonomy name="taxonomy" toName="text">
    <Choice value="a">
        <Choice value="ab" />
    </Choice>
    <Choice value="b"/>
    <Choice value="c"/>
  </Taxonomy>
</View>`,
    data: {
      text: 'Text',
    },
    annotations: [{
      'id': 19,
      'result': [
        {
          'value': {
            'taxonomy': [['a', 'ab'], ['c']],
          },
          'id': 'text_id_1',
          'from_name': 'taxonomy',
          'to_name': 'text',
          'type': 'taxonomy',
          'origin': 'manual',
          'readonly': true,
        },
      ],
    }],
  });
  AtTaxonomy.clickTaxonomy();
  AtTaxonomy.seeSelectedValues(['ab', 'c']);
  AtTaxonomy.toggleGroupWithText('a');
  AtTaxonomy.seeCheckedItemByText('ab');
  AtTaxonomy.seeCheckedItemByText('c');
  I.say('Check delete button in selected list');
  I.dontSeeElement(AtTaxonomy.locateSelectedByText('ab').withDescendant('input'));
  I.say('Try to uncheck items in the tree');
  AtTaxonomy.clickItemByText('ab');
  AtTaxonomy.clickItemByText('c');
  I.say('Check that item was not unchecked');
  AtTaxonomy.seeSelectedValues(['ab', 'c']);
  AtTaxonomy.seeCheckedItemByText('ab');
  AtTaxonomy.seeCheckedItemByText('c');
});

Scenario('Taxonomy per region', async ({ I, LabelStudio, AtTaxonomy, AtOutliner }) => {
  const config = `
<View>
  <Text name="text" value="$text"/>
  <Labels name="label" toName="text">
    <Label value="Label1" />
    <Label value="Label2" />
  </Labels>
  <Taxonomy name="taxonomy" toName="text" perRegion="true" whenLabelValue="Label2">
    <Choice value="a">
        <Choice value="ab" />
    </Choice>
    <Choice value="b"/>
    <Choice value="c"/>
  </Taxonomy>
</View>`;
  const data = {
    text: 'Some text etc.',
  };

  I.amOnPage('/');
  LabelStudio.init({
    config,
    data,
    annotations: [{
      id: 'test',
      result: [
        {
          'value': {
            'start': 0,
            'end': 4,
            'text': 'Some',
            'labels': [
              'Label1',
            ],
          },
          'id': 'test_id_1',
          'from_name': 'label',
          'to_name': 'text',
          'type': 'labels',
          'origin': 'manual',
        },
        {
          'value': {
            'start': 5,
            'end': 9,
            'text': 'text',
            'labels': [
              'Label2',
            ],
          },
          'id': 'test_id_2',
          'from_name': 'label',
          'to_name': 'text',
          'type': 'labels',
          'origin': 'manual',
        },
        {
          'value': {
            'start': 10,
            'end': 14,
            'text': 'text',
            'labels': [
              'Label2',
            ],
          },
          'id': 'test_id_3',
          'from_name': 'label',
          'to_name': 'text',
          'type': 'labels',
          'origin': 'manual',
        },
      ],
    }],
  });
  I.say('Should not see perrigion taxonomy without selected region');
  AtTaxonomy.dontSeeTaxonomy();
  I.say('Should not see perrigion taxonomy without selected region that was set in whenLabelValue');
  AtOutliner.clickRegion(1);
  AtTaxonomy.dontSeeTaxonomy();
  I.say('Should not see perrigion taxonomy when correct region is selected');
  AtOutliner.clickRegion(2);
  AtTaxonomy.seeTaxonomy();
  I.say('Select some values');
  AtTaxonomy.clickTaxonomy();
  AtTaxonomy.toggleGroupWithText('a');
  AtTaxonomy.clickItemByText('ab');
  AtTaxonomy.clickItemByText('c');
  AtTaxonomy.seeSelectedValues(['ab', 'c']);
  I.say('For the other correct region there should not be selected items');
  AtOutliner.clickRegion(3);
  AtTaxonomy.clickTaxonomy();
  AtTaxonomy.dontSeeSelectedValues(['a', 'ab', 'b', 'c']);
  AtTaxonomy.dontSeeCheckedItemByText('ab');
  AtTaxonomy.dontSeeCheckedItemByText('c');

  const result = await LabelStudio.serialize();

  await session('Deserialization', async () => {
    I.amOnPage('/');
    LabelStudio.init({
      config,
      data,
      annotations: [{
        id: 'test',
        result,
      }],
    });
    I.say('Should not see perrigion taxonomy without selected region');
    AtTaxonomy.dontSeeTaxonomy();
    I.say('Should not see perrigion taxonomy without selected region that was set in whenLabelValue');
    AtOutliner.clickRegion(1);
    AtTaxonomy.dontSeeTaxonomy();
    I.say('For the last correct region there should not be selected items');
    AtOutliner.clickRegion(3);
    AtTaxonomy.clickTaxonomy();
    AtTaxonomy.toggleGroupWithText('a');
    AtTaxonomy.dontSeeSelectedValues(['a', 'ab', 'b', 'c']);
    AtTaxonomy.dontSeeCheckedItemByText('ab');
    AtTaxonomy.dontSeeCheckedItemByText('c');
    I.say('Should see perrigion taxonomy with previously selected items when correct region is selected');
    AtOutliner.clickRegion(2);
    AtTaxonomy.seeTaxonomy();
    AtTaxonomy.clickTaxonomy();
    AtTaxonomy.seeSelectedValues(['ab', 'c']);
    AtTaxonomy.seeCheckedItemByText('ab');
    AtTaxonomy.seeCheckedItemByText('c');
  });
});

Scenario('Aliases in Taxonomy', async ({ I, LabelStudio, AtTaxonomy }) => {
  const createConfig = ({ showFullPath = false } = {}) => `
<View>
  <Text name="text" value="$text"/>
  <Taxonomy required="true" name="taxonomy" toName="text" leafsOnly="true" placeholder="Select something..." showFullPath="${showFullPath}">
    <Choice alias="1-3" value="One to three">
      <Choice alias="1" value="One" />
      <Choice alias="2" value="Two" />
      <Choice alias="3" value="Three" />
    </Choice>
    <Choice alias="4-7" value="Four to seven">
      <Choice alias="4" value="Four" />
      <Choice alias="5" value="Five" />
      <Choice alias="6" value="Six" />
      <Choice alias="7" value="Seven" />
    </Choice>
  </Taxonomy>
</View>
`;

  I.amOnPage('/');
  LabelStudio.init({
    config: createConfig(),
    data: {
      text: 'A text',
    },
  });
  I.say('Should see values of choices and work with them');
  AtTaxonomy.clickTaxonomy();
  AtTaxonomy.toggleGroupWithText('One to three');
  AtTaxonomy.toggleGroupWithText('Four to seven');
  AtTaxonomy.seeItemByText('Two');
  AtTaxonomy.seeItemByText('Five');
  AtTaxonomy.clickItemByText('Three');
  AtTaxonomy.clickItemByText('Seven');
  AtTaxonomy.seeSelectedValues(['Three', 'Seven']);
  I.say('Should get aliases as results');

  const result = await LabelStudio.serialize();

  assert.deepStrictEqual(result[0].value.taxonomy, [['1-3', '3'], ['4-7', '7']]);

  await session('Deserialization', async () => {
    I.amOnPage('/');
    LabelStudio.init({
      config: createConfig(),
      data: {
        text: 'A text',
      },
      annotations: [{
        id: 'test',
        result,
      }],
    });
    I.say('Should see the same result');
    AtTaxonomy.clickTaxonomy();
    AtTaxonomy.toggleGroupWithText('One to three');
    AtTaxonomy.toggleGroupWithText('Four to seven');
    AtTaxonomy.seeCheckedItemByText('Three');
    AtTaxonomy.seeCheckedItemByText('Seven');
    AtTaxonomy.seeSelectedValues(['Three', 'Seven']);
  });

  await session('ShowFullPath', async () => {
    //showFullPath
    I.amOnPage('/');
    LabelStudio.init({
      config: createConfig({ showFullPath: true }),
      data: {
        text: 'A text',
      },
      annotations: [{
        id: 'test',
        result,
      }],
    });
    I.say('Should see the full paths');
    AtTaxonomy.clickTaxonomy();
    AtTaxonomy.seeSelectedValues(['One to three / Three', 'Four to seven / Seven']);
  });
});

Scenario('Taxonomy dynamic items', async ({ I, LabelStudio, AtTaxonomy }) => {
  const data = {
    text: 'A text',
    options: [{
      value: 'Items',
      children: [
        {
          value: 'Item 1',
        },
        {
          value: 'Item 2',
        },
      ],
    },
    {
      value: 'Options',
      children: [
        {
          value: 'Option 1',
        },
        {
          value: 'Option 2',
        },
        {
          value: 'Option 3',
        },
      ],
    }],
  };

  I.amOnPage('/');
  LabelStudio.init({
    config: `
<View>
  <Text name="text" value="$text"/>
  <Taxonomy name="taxonomy" toName="text" value="$options"/>
</View>
`,
    data,
  });
  I.say('Should see items');
  AtTaxonomy.clickTaxonomy();
  AtTaxonomy.toggleGroupWithText('Items');
  AtTaxonomy.toggleGroupWithText('Options');
  AtTaxonomy.seeItemByText('Item 2');
  AtTaxonomy.seeItemByText('Option 2');
  I.say('Select some dynamic options');
  AtTaxonomy.clickItemByText('Item 1');
  AtTaxonomy.clickItemByText('Option 3');
  I.say('Check result');
  AtTaxonomy.seeCheckedItemByText('Item 1');
  AtTaxonomy.seeCheckedItemByText('Option 3');
  AtTaxonomy.seeSelectedValues(['Item 1', 'Option 3']);

  const result = await LabelStudio.serialize();

  assert.deepStrictEqual(result[0].value.taxonomy, [['Items', 'Item 1'], ['Options', 'Option 3']]);

  await session('Deserialization', async () => {
    I.amOnPage('/');
    LabelStudio.init({
      config: `
<View>
  <Text name="text" value="$text"/>
  <Taxonomy name="taxonomy" toName="text" value="$options">
    <Choice value="Static element"/>
  </Taxonomy>
</View>
`,
      data,
      annotations: [{
        id: 'test',
        result,
      }],
    });
    I.say('Should see same items');
    AtTaxonomy.clickTaxonomy();
    AtTaxonomy.toggleGroupWithText('Items');
    AtTaxonomy.toggleGroupWithText('Options');
    AtTaxonomy.seeItemByText('Item 2');
    AtTaxonomy.seeItemByText('Option 2');
    AtTaxonomy.seeCheckedItemByText('Item 1');
    AtTaxonomy.seeCheckedItemByText('Option 3');
    AtTaxonomy.seeSelectedValues(['Item 1', 'Option 3']);
    I.say('And the static one');
    AtTaxonomy.seeItemByText('Static element');
  });
});

Scenario('Taxonomy maxUsages', async ({ I, LabelStudio, AtTaxonomy }) => {
  const config = `
<View>
  <Text name="text" value="$text"/>
  <Taxonomy name="taxonomy" toName="text" maxUsages="1">
    <Choice value="1">
      <Choice value="One" />
      <Choice value="Two" />
      <Choice value="Three" />
    </Choice>
    <Choice value="2">
      <Choice value="a" />
      <Choice value="b" />
      <Choice value="c" />
    </Choice>
  </Taxonomy>
</View>
`;

  I.amOnPage('/');
  LabelStudio.init({
    config,
    data: {
      text: 'A text',
    },
  });
  AtTaxonomy.clickTaxonomy();
  AtTaxonomy.toggleGroupWithText('1');
  AtTaxonomy.toggleGroupWithText('2');
  I.say('Try to select a couple of items');
  AtTaxonomy.clickItemByText('One');
  AtTaxonomy.clickItemByText('Two');
  AtTaxonomy.clickItemByText('a');
  AtTaxonomy.clickItemByText('b');
  I.say('There should be only one item selected');
  AtTaxonomy.seeCheckedItemByText('One');
  AtTaxonomy.seeSelectedValues('One');
  AtTaxonomy.dontSeeCheckedItemByText('Two');
  AtTaxonomy.dontSeeCheckedItemByText('a');
  AtTaxonomy.dontSeeCheckedItemByText('b');
  AtTaxonomy.dontSeeSelectedValues(['Two', 'a', 'b']);
  I.say('Check that we can change our decision');
  AtTaxonomy.clickItemByText('One');
  AtTaxonomy.clickItemByText('Two');
  AtTaxonomy.seeCheckedItemByText('Two');
  AtTaxonomy.seeSelectedValues('Two');
  AtTaxonomy.dontSeeCheckedItemByText('One');
  AtTaxonomy.dontSeeSelectedValues('One');
});

Scenario('Taxonomy visibleWhen', async ({ I, LabelStudio, AtTaxonomy }) => {
  const createConfig = ({ showFullPath = false, visibleWhen = 'choice-selected', whenChoiceValue = 'Four' } = {}) => `
<View>
  <Text name="text" value="$text"/>
  <Taxonomy required="true" name="taxonomy" toName="text" leafsOnly="true" placeholder="Select something..." showFullPath="${showFullPath}">
    <Choice value="One to three">
      <Choice value="One" />
      <Choice value="Two" />
      <Choice value="Three" />
    </Choice>
    <Choice value="Four to seven">
      <Choice value="Four" />
      <Choice value="Five" />
      <Choice value="Six" />
      <Choice value="Seven" />
    </Choice>
  </Taxonomy>
  <Choices name="other" toName="text"
    showInline="true"
    visibleWhen="${visibleWhen}"
    whenTagName="taxonomy"
    whenChoiceValue="${whenChoiceValue}"
  >
    <Choice value="Eight" />
    <Choice value="Nine" />
  </Choices>
</View>
`;

  I.amOnPage('/');
  LabelStudio.init({
    config: createConfig(),
    data: {
      text: 'A text',
    },
  });
  I.say('Should see values of choices and work with them');
  AtTaxonomy.clickTaxonomy();
  AtTaxonomy.toggleGroupWithText('One to three');
  AtTaxonomy.toggleGroupWithText('Four to seven');
  AtTaxonomy.seeItemByText('Two');
  AtTaxonomy.seeItemByText('Five');
  AtTaxonomy.clickItemByText('Three');
  AtTaxonomy.clickItemByText('Four');
  AtTaxonomy.seeSelectedValues(['Three', 'Four']);
  AtTaxonomy.clickTaxonomy();
  I.click('Eight'); // click on the choice
  I.seeElement('.ant-checkbox-checked [name=\'Eight\']');
  I.say('Should get results for taxonomy and choices');

  let result = await LabelStudio.serialize();

  assert.deepStrictEqual(result[0].value.taxonomy, [['One to three', 'Three'], ['Four to seven', 'Four']]);
  assert.deepStrictEqual(result[1].value.choices, ['Eight']);

  I.say('Should get results for only taxonomy when visibleWhen is not met');
  AtTaxonomy.clickTaxonomy();
  AtTaxonomy.clickItemByText('Four');
  AtTaxonomy.clickTaxonomy();
  I.dontSeeElement('.ant-checkbox-checked [name=\'Eight\']');

  result = await LabelStudio.serialize();

  assert.deepStrictEqual(result[0].value.taxonomy, [['One to three', 'Three']]);
  assert.deepStrictEqual(result?.[1]?.value?.choices, undefined);

  I.say('Should get results for taxonomy and choices when visibleWhen is met');
  AtTaxonomy.clickTaxonomy();
  AtTaxonomy.clickItemByText('Four');
  AtTaxonomy.clickTaxonomy();
  I.seeElement('.ant-checkbox-checked [name=\'Eight\']');

  result = await LabelStudio.serialize();

  assert.deepStrictEqual(result[0].value.taxonomy, [['One to three', 'Three'], ['Four to seven', 'Four']]);
  assert.deepStrictEqual(result[1].value.choices, ['Eight']);

  await session('Deserialization', async () => {
    I.amOnPage('/');
    LabelStudio.init({
      config: createConfig(),
      data: {
        text: 'A text',
      },
      annotations: [{
        id: 'test',
        result,
      }],
    });
    I.say('Should see the same result');
    AtTaxonomy.clickTaxonomy();
    AtTaxonomy.toggleGroupWithText('One to three');
    AtTaxonomy.toggleGroupWithText('Four to seven');
    AtTaxonomy.seeCheckedItemByText('Three');
    AtTaxonomy.seeCheckedItemByText('Four');
    AtTaxonomy.seeSelectedValues(['Three', 'Four']);
    I.seeElement('.ant-checkbox-checked [name=\'Eight\']');
  });

  await session('ShowFullPath', async () => {
    //showFullPath
    I.amOnPage('/');
    LabelStudio.init({
      config: createConfig({ showFullPath: true }),
      data: {
        text: 'A text',
      },
      annotations: [{
        id: 'test',
        result,
      }],
    });
    I.say('Should see the full paths');
    AtTaxonomy.clickTaxonomy();
    AtTaxonomy.seeSelectedValues(['One to three / Three', 'Four to seven / Four']);
    I.seeElement('.ant-checkbox-checked [name=\'Eight\']');
  });
});

Scenario('Taxonomy visibleWhen with aliases', async ({ I, LabelStudio, AtTaxonomy }) => {
  const createConfig = ({ showFullPath = false, visibleWhen = 'choice-selected', whenChoiceValue = 'Four' } = {}) => `
<View>
  <Text name="text" value="$text"/>
  <Taxonomy required="true" name="taxonomy" toName="text" leafsOnly="true" placeholder="Select something..." showFullPath="${showFullPath}">
    <Choice alias="1-3" value="One to three">
      <Choice alias="1" value="One" />
      <Choice alias="2" value="Two" />
      <Choice alias="3" value="Three" />
    </Choice>
    <Choice alias="4-7" value="Four to seven">
      <Choice alias="4" value="Four" />
      <Choice alias="5" value="Five" />
      <Choice alias="6" value="Six" />
      <Choice alias="7" value="Seven" />
    </Choice>
  </Taxonomy>
  <Choices name="choices" toName="text"
    visibleWhen="${visibleWhen}"
    whenTagName="taxonomy"
    whenChoiceValue="${whenChoiceValue}"
  >
    <Choice alias="8" value="Eight"></Choice>
    <Choice alias="9" value="Nine"></Choice>
  </Choices>
</View>
`;

  I.amOnPage('/');
  LabelStudio.init({
    config: createConfig(),
    data: {
      text: 'A text',
    },
  });
  I.say('Should see values of choices and work with them');
  AtTaxonomy.clickTaxonomy();
  AtTaxonomy.toggleGroupWithText('One to three');
  AtTaxonomy.toggleGroupWithText('Four to seven');
  AtTaxonomy.seeItemByText('Two');
  AtTaxonomy.seeItemByText('Five');
  AtTaxonomy.clickItemByText('Three');
  AtTaxonomy.clickItemByText('Four');
  AtTaxonomy.seeSelectedValues(['Three', 'Four']);
  AtTaxonomy.clickTaxonomy();
  I.click('Eight'); // click on the choice
  I.seeElement('.ant-checkbox-checked [name=\'Eight\']');
  I.say('Should get aliases as results');

  let result = await LabelStudio.serialize();

  assert.deepStrictEqual(result[0].value.taxonomy, [['1-3', '3'], ['4-7', '4']]);
  assert.deepStrictEqual(result[1].value.choices, ['8']);

  I.say('Should get alias results for only taxonomy when visibleWhen is not met');
  AtTaxonomy.clickTaxonomy();
  AtTaxonomy.clickItemByText('Four');
  AtTaxonomy.clickTaxonomy();
  I.dontSeeElement('.ant-checkbox-checked [name=\'Eight\']');

  result = await LabelStudio.serialize();

  assert.deepStrictEqual(result[0].value.taxonomy, [['1-3', '3']]);
  assert.deepStrictEqual(result?.[1]?.value?.choices, undefined);

  I.say('Should get alias results for taxonomy and choices when visibleWhen is met');
  AtTaxonomy.clickTaxonomy();
  AtTaxonomy.clickItemByText('Four');
  AtTaxonomy.clickTaxonomy();
  I.seeElement('.ant-checkbox-checked [name=\'Eight\']');

  result = await LabelStudio.serialize();

  assert.deepStrictEqual(result[0].value.taxonomy, [['1-3', '3'], ['4-7', '4']]);
  assert.deepStrictEqual(result[1].value.choices, ['8']);

  await session('Deserialization', async () => {
    I.amOnPage('/');
    LabelStudio.init({
      config: createConfig(),
      data: {
        text: 'A text',
      },
      annotations: [{
        id: 'test',
        result,
      }],
    });
    I.say('Should see the same result');
    AtTaxonomy.clickTaxonomy();
    AtTaxonomy.toggleGroupWithText('One to three');
    AtTaxonomy.toggleGroupWithText('Four to seven');
    AtTaxonomy.seeCheckedItemByText('Three');
    AtTaxonomy.seeCheckedItemByText('Four');
    AtTaxonomy.seeSelectedValues(['Three', 'Four']);
    I.seeElement('.ant-checkbox-checked [name=\'Eight\']');
  });

  await session('ShowFullPath', async () => {
    //showFullPath
    I.amOnPage('/');
    LabelStudio.init({
      config: createConfig({ showFullPath: true }),
      data: {
        text: 'A text',
      },
      annotations: [{
        id: 'test',
        result,
      }],
    });
    I.say('Should see the full paths');
    AtTaxonomy.clickTaxonomy();
    AtTaxonomy.seeSelectedValues(['One to three / Three', 'Four to seven / Four']);
    I.seeElement('.ant-checkbox-checked [name=\'Eight\']');
  });
});
