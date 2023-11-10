const assert = require('assert');
const { centerOfBbox } = require('./helpers');

Feature('Outliner');

const IMAGE =
  'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg';

Scenario('Basic details', async ({ I, LabelStudio, AtOutliner, AtDetails }) => {
  const RESULT_LABELS = ['a', 'b', 'c'];
  const result = [
    {
      'value': {
        'start': 0,
        'end': 4,
        'labels': [
          'a', 'b', 'c',
        ],
      },
      'id': 'test_t_1',
      'from_name': 'label',
      'to_name': 'text',
      'type': 'labels',
    },
    {
      'value': {
        'start': 5,
        'end': 6,
        'labels': [],
      },
      'id': 'test_t_2',
      'from_name': 'label',
      'to_name': 'text',
      'type': 'labels',
    },
    {
      'value': {
        'x': 25,
        'y': 25,
        'width': 50,
        'height': 50,
      },
      'id': 'test_i_1',
      'from_name': 'rect',
      'to_name': 'img',
      'type': 'rectangle',
    },
    {
      'original_width': 2242,
      'original_height': 2802,
      'image_rotation': 0,
      'value': {
        'x': 25,
        'y': 25,
        'width': 50,
        'height': 50,
        'rotation': 0,
      },
      'id': 'test_i_1',
      'from_name': 'rect',
      'to_name': 'img',
      'type': 'rectangle',
      'origin': 'manual',
    },
    {
      'original_width': 2242,
      'original_height': 2802,
      'image_rotation': 0,
      'value': {
        'x': 25,
        'y': 25,
        'width': 50,
        'height': 50,
        'rotation': 0,
        'rating': 4,
      },
      'id': 'test_i_1',
      'from_name': 'rating',
      'to_name': 'img',
      'type': 'rating',
      'origin': 'manual',
    },
    {
      'original_width': 2242,
      'original_height': 2802,
      'image_rotation': 0,
      'value': {
        'x': 25,
        'y': 25,
        'width': 50,
        'height': 50,
        'rotation': 0,
        'text': [
          'text',
          'area',
        ],
      },
      'id': 'test_i_1',
      'from_name': 'textarea',
      'to_name': 'img',
      'type': 'textarea',
      'origin': 'manual',
    },
    {
      'original_width': 2242,
      'original_height': 2802,
      'image_rotation': 0,
      'value': {
        'x': 25,
        'y': 25,
        'width': 50,
        'height': 50,
        'rotation': 0,
        'choices': [
          'option 1', 'option 2',
        ],
      },
      'id': 'test_i_1',
      'from_name': 'choices',
      'to_name': 'img',
      'type': 'choices',
      'origin': 'manual',
    },
  ];
  const fillByPressKeyDown = (keysList) => {
    for (const keys of keysList) {
      for (let idx = 0;idx < keys.length;idx++) {
        I.pressKeyDown(keys[idx]);
      }
      for (let idx = keys.length - 1;idx >= 0;idx--) {
        I.pressKeyUp(keys[idx]);
      }
    }
  };

  I.amOnPage('/');

  LabelStudio.setFeatureFlags({
    ff_front_1170_outliner_030222_short: true,
  });

  LabelStudio.init({
    config: `
<View>
  <Text name="text" value="$text"/>
  <Labels name="label" toName="text" choice="multiple">
    <Label value="a" hotkey="1" />
    <Label value="b" hotkey="2" />
    <Label value="c" hotkey="3" />
  </Labels>
  <Image name="img" value="$image"/>
  <Rectangle name="rect" toName="img"/>
  <Rating name="rating" toName="img" perRegion="true"/>
  <Textarea name="textarea" toName="img" perRegion="true"/>
  <Choices name="choices" toName="img" perRegion="true">
    <Choice value="option 1"/>
    <Choice value="option 2"/>
  </Choices>
</View>
`,
    data: {
      text: 'Just a text',
      image: IMAGE,
    },
    annotations: [{
      id: 'test',
      result,
    }],
  });

  AtOutliner.seeRegions(3);
  LabelStudio.waitForObjectsReady();

  I.say('Select text region');
  AtOutliner.clickRegion(1);
  I.say('Check it\'s details');
  for (const value of RESULT_LABELS) {
    AtDetails.seeLabel(value);
  }
  AtDetails.seeLabels(RESULT_LABELS.length);
  AtDetails.seeText('Just');

  I.say('Select second text region');
  AtOutliner.clickRegion(2);
  I.say('Check it\'s details');
  AtDetails.seeLabels(0);
  AtDetails.seeText('a');

  I.say('Select image region');
  AtOutliner.clickRegion(3);

  const isRelativeCoords = await LabelStudio.hasFF('fflag_fix_front_dev_3793_relative_coords_short');

  if (isRelativeCoords) {
    AtDetails.seeFieldWithValue('X', '25');
    AtDetails.seeFieldWithValue('H', '50');
  }

  I.say('Check perregions displaying');

  AtDetails.seeResultRating(4);
  AtDetails.seeResultTextarea(['text', 'area']);
  AtDetails.seeResultChoices(['option 1', 'option 2']);

  I.say('Add new meta and check result');
  AtDetails.clickEditMeta();

  fillByPressKeyDown([['M'], ['Space'], ['1'], ['Shift', 'Enter'], ['M'], ['Space'], ['2'], ['Enter']]);
  AtDetails.seeMeta('M 1');
  AtDetails.seeMeta('M 2');

  I.say('Add line to meta');
  AtDetails.clickMeta();
  fillByPressKeyDown([['Shift', 'Enter'], ['3'], ['Enter']]);
  AtDetails.seeMeta('3');
  AtDetails.dontSeeMeta('23');

  I.say('Check that meta is saved correctly');
  const resultWithMeta = await LabelStudio.serialize();

  assert.deepStrictEqual(resultWithMeta[2].meta.text, ['M 1\nM 2\n3']);

  I.say('Remove meta');
  AtDetails.clickMeta();
  fillByPressKeyDown([['CommandOrControl', 'a'], ['Backspace'], ['Enter']]);

  I.say('Check that meta is removed correctly');
  const resultWithoutMeta = await LabelStudio.serialize();

  assert.deepStrictEqual(resultWithoutMeta[2].meta, undefined);
});

Scenario('Panels manipulations', async ({ I, LabelStudio, AtPanels }) => {
  I.amOnPage('/');
  LabelStudio.setFeatureFlags({
    ff_front_1170_outliner_030222_short: true,
  });
  LabelStudio.init({
    config: `
<View>
  <Text name="text" value="$text"/>
</View>
`,
    data: {
      text: 'Just a text',
    },
    annotations: [{
      id: 'test',
      result: [],
    }],
  });


  const AtOutlinerPanel = AtPanels.usePanel(AtPanels.PANEL.OUTLINER);
  const AtDetailsPanel = AtPanels.usePanel(AtPanels.PANEL.DETAILS);

  I.say('See panels at default positions');
  AtOutlinerPanel.seePanelAttachedLeft();
  AtDetailsPanel.seePanelAttachedRight();

  I.say('They should be fully visible');
  AtOutlinerPanel.seePanelBody();
  AtDetailsPanel.seePanelBody();
  I.say('and not collapsed');
  AtOutlinerPanel.dontSeeExpandButton();
  AtDetailsPanel.dontSeeExpandButton();

  I.say('Collapse both panels');
  AtOutlinerPanel.collapsePanel();
  AtDetailsPanel.collapsePanel();

  I.say('Make sure there is no body or collapse button');
  AtOutlinerPanel.dontSeePanelBody();
  AtDetailsPanel.dontSeePanelBody();
  AtOutlinerPanel.dontSeeСollapseButton();
  AtDetailsPanel.dontSeeСollapseButton();
  AtOutlinerPanel.seeExpandButton();
  AtDetailsPanel.seeExpandButton();

  I.say('Try to move collapsed panel');
  await AtOutlinerPanel.dragPanelBy(400, 0);

  I.say('Check that nothing changes');
  AtOutlinerPanel.seePanelAttachedLeft();
  AtOutlinerPanel.dontSeePanelBody();
  AtOutlinerPanel.dontSeeСollapseButton();

  I.say('Expand both panels');
  AtOutlinerPanel.expandPanel();
  AtDetailsPanel.expandPanel();

  I.say('Make sure that body and collapse appears');
  AtOutlinerPanel.seePanelBody();
  AtDetailsPanel.seePanelBody();
  AtOutlinerPanel.seeСollapseButton();
  AtDetailsPanel.seeСollapseButton();
  AtOutlinerPanel.dontSeeExpandButton();
  AtDetailsPanel.dontSeeExpandButton();

  I.say('Try to drag one panel over another');
  await AtOutlinerPanel.dragPanelToElement(AtDetailsPanel.locatePanel());
  I.say('It should not affect other panel');
  AtDetailsPanel.seePanelAttachedRight();
  I.say('But it should detach dragged panel');
  AtOutlinerPanel.seePanelDetached();
  {
    I.say('And x coordinate of panels should be equal due to limitation of moving panel through the border');
    const panel1HeaderBbox = await AtOutlinerPanel.grabHeaderBbox();
    const panel2HeaderBbox = await AtOutlinerPanel.grabHeaderBbox();

    assert.strictEqual(panel1HeaderBbox.x, panel2HeaderBbox.x);
  }

  {
    I.say('Drag panel somewhere to the center of the screen');
    {
      let panelBbox = await AtOutlinerPanel.grabPanelBbox();
      const panelsContainerBbox = await AtPanels.grabPanelsContainerBbox();
      const panelsContainerCenter = centerOfBbox(panelsContainerBbox);

      await AtOutlinerPanel.dragPanelTo(
        panelsContainerCenter.x,
        panelsContainerCenter.y - panelBbox.height / 2,
      );

      I.say('Try to resize panel in all directions');
      panelBbox = await AtOutlinerPanel.grabPanelBbox();
      {
        I.say('drag TopLeft corner');
        await AtOutlinerPanel.dragResizerBy(-1, -2, AtOutlinerPanel.resizeTopLeft);
        const newPanelBbox = await AtOutlinerPanel.grabPanelBbox();

        assert.strictEqual(newPanelBbox.x - panelBbox.x, -1);
        assert.strictEqual(newPanelBbox.y - panelBbox.y, -2);
        assert.strictEqual(newPanelBbox.width - panelBbox.width, 1);
        assert.strictEqual(newPanelBbox.height - panelBbox.height, 2);
        panelBbox = newPanelBbox;
      }
      {
        I.say('drag TopRight corner');
        await AtOutlinerPanel.dragResizerBy(-1, -2, AtOutlinerPanel.resizeTopRight);
        const newPanelBbox = await AtOutlinerPanel.grabPanelBbox();

        assert.strictEqual(newPanelBbox.x - panelBbox.x, 0);
        assert.strictEqual(newPanelBbox.y - panelBbox.y, -2);
        assert.strictEqual(newPanelBbox.width - panelBbox.width, -1);
        assert.strictEqual(newPanelBbox.height - panelBbox.height, 2);
        panelBbox = newPanelBbox;
      }
      {
        I.say('drag BottomRight corner');
        await AtOutlinerPanel.dragResizerBy(3, 5, AtOutlinerPanel.resizeBottomRight);
        const newPanelBbox = await AtOutlinerPanel.grabPanelBbox();

        assert.strictEqual(newPanelBbox.x - panelBbox.x, 0);
        assert.strictEqual(newPanelBbox.y - panelBbox.y, 0);
        assert.strictEqual(newPanelBbox.width - panelBbox.width, 3);
        assert.strictEqual(newPanelBbox.height - panelBbox.height, 5);
        panelBbox = newPanelBbox;
      }
      {
        I.say('drag BottomLeft corner');
        await AtOutlinerPanel.dragResizerBy(3, -5, AtOutlinerPanel.resizeBottomLeft);
        const newPanelBbox = await AtOutlinerPanel.grabPanelBbox();

        assert.strictEqual(newPanelBbox.x - panelBbox.x, 3);
        assert.strictEqual(newPanelBbox.y - panelBbox.y, 0);
        assert.strictEqual(newPanelBbox.width - panelBbox.width, -3);
        assert.strictEqual(newPanelBbox.height - panelBbox.height, -5);
        panelBbox = newPanelBbox;
      }
      {
        I.say('drag Top border');
        await AtOutlinerPanel.dragResizerBy(10, -10, AtOutlinerPanel.resizeTop, 2);
        const newPanelBbox = await AtOutlinerPanel.grabPanelBbox();

        assert.strictEqual(newPanelBbox.x - panelBbox.x, 0);
        assert.strictEqual(newPanelBbox.y - panelBbox.y, -10);
        assert.strictEqual(newPanelBbox.width - panelBbox.width, 0);
        assert.strictEqual(newPanelBbox.height - panelBbox.height, 10);
        panelBbox = newPanelBbox;
      }
      {
        I.say('drag Right border');
        await AtOutlinerPanel.dragResizerBy(100, -7, AtOutlinerPanel.resizeRight, 2);
        const newPanelBbox = await AtOutlinerPanel.grabPanelBbox();

        assert.strictEqual(newPanelBbox.x - panelBbox.x, 0);
        assert.strictEqual(newPanelBbox.y - panelBbox.y, 0);
        assert.strictEqual(newPanelBbox.width - panelBbox.width, 100);
        assert.strictEqual(newPanelBbox.height - panelBbox.height, 0);
        panelBbox = newPanelBbox;
      }
      {
        I.say('drag Bottom border');
        await AtOutlinerPanel.dragResizerBy(11, 11, AtOutlinerPanel.resizeBottom);
        const newPanelBbox = await AtOutlinerPanel.grabPanelBbox();

        assert.strictEqual(newPanelBbox.x - panelBbox.x, 0);
        assert.strictEqual(newPanelBbox.y - panelBbox.y, 0);
        assert.strictEqual(newPanelBbox.width - panelBbox.width, 0);
        assert.strictEqual(newPanelBbox.height - panelBbox.height, 11);
        panelBbox = newPanelBbox;
      }
      {
        I.say('drag Left border');
        await AtOutlinerPanel.dragResizerBy(7, -7, AtOutlinerPanel.resizeLeft);
        const newPanelBbox = await AtOutlinerPanel.grabPanelBbox();

        assert.strictEqual(newPanelBbox.x - panelBbox.x, 7);
        assert.strictEqual(newPanelBbox.y - panelBbox.y, 0);
        assert.strictEqual(newPanelBbox.width - panelBbox.width, -7);
        assert.strictEqual(newPanelBbox.height - panelBbox.height, 0);
        panelBbox = newPanelBbox;
      }
      {
        I.say('Check maximal size restriction');
        await AtOutlinerPanel.dragResizerBy(-1000, -1000, AtOutlinerPanel.resizeTopLeft);
        const newPanelBbox = await AtOutlinerPanel.grabPanelBbox();

        assert(newPanelBbox.x - panelBbox.x < 500);
        assert(newPanelBbox.y - panelBbox.y < 500);
        assert(newPanelBbox.width - panelBbox.width > -500);
        assert(newPanelBbox.height - panelBbox.height > -500);
        panelBbox = newPanelBbox;
      }
      {
        I.say('Check minimal size restriction');
        await AtOutlinerPanel.dragResizerBy(panelBbox.width, panelBbox.height + 50, AtOutlinerPanel.resizeTopLeft);
        const newPanelBbox = await AtOutlinerPanel.grabPanelBbox();

        assert(newPanelBbox.width > 100);
        assert(newPanelBbox.height > 100);
        assert(newPanelBbox.x < panelBbox.x + panelBbox.width - 100);
        assert(newPanelBbox.y < panelBbox.y + panelBbox.height - 100);
        panelBbox = newPanelBbox;
      }
    }

    I.say('Move details to the left socket');
    await AtDetailsPanel.dragPanelToLeftSocket();
    AtDetailsPanel.seePanelAttachedLeft();

    {
      I.say('Move outliner to the right socket by moving to the left (check that there is some gap)');
      const panelBbox = await AtOutlinerPanel.grabPanelBbox();
      const panelContainerWidth = await AtOutlinerPanel.grabPanelsContainerBbox('width');
      const shiftX = 50;

      await AtOutlinerPanel.dragPanelTo(panelContainerWidth - panelBbox.width / 2 - shiftX, panelBbox.y);
      AtOutlinerPanel.seePanelDetached();
      await AtOutlinerPanel.dragResizerBy(shiftX, 0, AtOutlinerPanel.resizeRight);
      AtOutlinerPanel.seePanelDetached();
      await AtOutlinerPanel.dragPanelBy(-5, 0);
      AtOutlinerPanel.seePanelAttachedRight();
    }
  }

  {
    I.say('Attached panels should be resizable');

    {
      const panelBbox = await AtOutlinerPanel.grabPanelBbox();

      await AtOutlinerPanel.dragResizerBy(-10, 0, AtOutlinerPanel.resizeLeft);
      const newPanelBbox = await AtOutlinerPanel.grabPanelBbox();

      assert(newPanelBbox.width - panelBbox.width, 10);
    }
    {
      const panelBbox = await AtDetailsPanel.grabPanelBbox();

      await AtDetailsPanel.dragResizerBy(10, 0, AtOutlinerPanel.resizeRight);
      const newPanelBbox = await AtDetailsPanel.grabPanelBbox();

      assert(newPanelBbox.width - panelBbox.width, 10);
    }
  }


  I.say('Collapse is still working');
  AtOutlinerPanel.collapsePanel();
  AtOutlinerPanel.dontSeePanelBody();
  AtOutlinerPanel.dontSeeСollapseButton();
  AtOutlinerPanel.seeExpandButton();

  {
    I.say('Drag panel somewhere to the center of the screen');
    {
      const panelBbox = await AtDetailsPanel.grabPanelBbox();
      const panelsContainerBbox = await AtPanels.grabPanelsContainerBbox();
      const panelsContainerCenter = centerOfBbox(panelsContainerBbox);

      await AtDetailsPanel.dragPanelTo(
        panelsContainerCenter.x,
        panelsContainerCenter.y - panelBbox.height / 2,
      );
      AtDetailsPanel.seePanelDetached();
    }
    I.say('Collapse detached panel');
    AtDetailsPanel.collapsePanel();
    AtDetailsPanel.dontSeePanelBody();
    AtDetailsPanel.dontSeeСollapseButton();
    AtDetailsPanel.seeExpandButton();

    I.say('Make sure that it is still movable');
    await AtDetailsPanel.dragPanelToLeftSocket();
    I.say('and attachable');
    AtDetailsPanel.seePanelAttachedLeft();
    I.say('and expandable');
    AtDetailsPanel.expandPanel();
    AtDetailsPanel.seePanelBody();
    AtDetailsPanel.seeСollapseButton();
    AtDetailsPanel.dontSeeExpandButton();
  }
});
