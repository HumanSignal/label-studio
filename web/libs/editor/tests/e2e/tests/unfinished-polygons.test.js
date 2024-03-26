const { saveDraftLocally, getLocallySavedDraft } = require('./helpers');
const assert = require('assert');


Feature('Unfinished polygons');

const IMAGE =
  'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg';

const CONFIG = `
<View>
  <Image name="img" value="$image" />
  <PolygonLabels name="tag" toName="img" strokewidth="5" fillcolor="red" pointstyle="circle" pointsize="small">
    <Label value="Hello" background="red"></Label>
    <Label value="World" background="blue"></Label>
  </PolygonLabels>
</View>
`;

const CONFIG_MULTIPLE = `
<View>
  <Image name="img" value="$image" />
  <PolygonLabels name="tag" toName="img" strokewidth="5" fillcolor="red" pointstyle="circle" pointsize="small" choice="multiple">
    <Label value="Label 1" background="red"></Label>
    <Label value="Label 2" background="green"></Label>
    <Label value="Label 3" background="blue"></Label>
  </PolygonLabels>
</View>
`;

const FLAGS = {
  ff_feat_front_DEV_2576_undo_key_points_polygon_short: true,
  ff_front_dev_2431_delete_polygon_points_080622_short: true,
  ff_front_dev_2432_auto_save_polygon_draft_210622_short: true,
};

Scenario('Drafts for unfinished polygons', async function({ I, LabelStudio, AtLabels, AtImageView }) {
  I.amOnPage('/');
  LabelStudio.init({
    config: CONFIG,
    data: {
      image: IMAGE,
    },
    params: {
      onSubmitDraft: saveDraftLocally,
    },
  });
  LabelStudio.setFeatureFlags(FLAGS);

  AtImageView.waitForImage();

  await AtImageView.lookForStage();

  I.say('start drawing polygon without finishing it');
  AtLabels.clickLabel('Hello');
  AtImageView.drawByClickingPoints([[50,50], [100, 50], [100, 80]]);

  I.say('wait until autosave');
  I.waitForFunction(() => !!window.LSDraft, .5);
  I.say('check result');
  const draft = await I.executeScript(getLocallySavedDraft);

  assert.strictEqual(draft[0].value.points.length, 3);
  assert.strictEqual(draft[0].value.closed, false);
});

Scenario('Saving polygon drawing steps to history', async function({ I, LabelStudio, AtLabels, AtImageView }) {
  I.amOnPage('/');
  LabelStudio.setFeatureFlags(FLAGS);
  LabelStudio.init({
    config: CONFIG,
    data: {
      image: IMAGE,
    },
  });

  AtImageView.waitForImage();

  await AtImageView.lookForStage();

  I.say('put one point of polygon');
  AtLabels.clickLabel('Hello');
  AtImageView.drawByClick(50, 50);

  I.say('check current history size');
  let historyStepsCount = await I.executeScript(() => window.Htx.annotationStore.selected.history.history.length);

  assert.strictEqual(historyStepsCount, 2);

  I.say('try to draw some more points and close polygon');
  AtImageView.drawByClick(100, 50);
  AtImageView.drawByClick(125, 100);
  AtImageView.drawByClick(50, 50);

  I.say('check current history size and result');
  historyStepsCount = await I.executeScript(() => window.Htx.annotationStore.selected.history.history.length);
  assert.strictEqual(historyStepsCount, 5);
  let result = await LabelStudio.serialize();

  assert.strictEqual(result[0].value.points.length, 3);
  assert.strictEqual(result[0].value.closed, true);

  I.say('try to undo closing and 2 last points');
  I.click('button[aria-label=Undo]');
  I.click('button[aria-label=Undo]');
  I.click('button[aria-label=Undo]');
  I.say('check current history index and result');
  historyStepsCount = await I.executeScript(() => window.Htx.annotationStore.selected.history.undoIdx);
  assert.strictEqual(historyStepsCount, 1);
  result = await LabelStudio.serialize();
  assert.strictEqual(result[0].value.points.length, 1);
  assert.strictEqual(result[0].value.closed, false);

});

Scenario('Init an annotation with old format of closed polygon result', async function({ I, LabelStudio, AtImageView }) {
  I.amOnPage('/');
  LabelStudio.setFeatureFlags(FLAGS);
  LabelStudio.init({
    config: CONFIG,
    data: {
      image: IMAGE,
    },
    annotations: [
      {
        id: 'test',
        result: [
          {
            'original_width': 2242,
            'original_height': 2802,
            'image_rotation': 0,
            'value': {
              'points': [
                [
                  22.38442822384428,
                  27.042801556420233,
                ],
                [
                  77.61557177615572,
                  24.90272373540856,
                ],
                [
                  48.90510948905109,
                  76.07003891050584,
                ],
              ],
              'polygonlabels': [
                'Hello',
              ],
            },
            'id': 'tNe7Bjmydb',
            'from_name': 'tag',
            'to_name': 'img',
            'type': 'polygonlabels',
            'origin': 'manual',
          },
        ],
      },
    ],
  });

  AtImageView.waitForImage();

  const result = await LabelStudio.serialize();

  assert.strictEqual(result[0].value.points.length, 3);
  assert.strictEqual(result[0].value.closed, true);
});

Scenario('Init an annotation with result of new format of polygon results', async function({ I, LabelStudio, AtImageView }) {
  I.amOnPage('/');
  LabelStudio.setFeatureFlags(FLAGS);
  LabelStudio.init({
    config: CONFIG,
    data: {
      image: IMAGE,
    },
    annotations: [
      {
        id: 'test',
        result: [
          {
            'original_width': 2242,
            'original_height': 2802,
            'image_rotation': 0,
            'value': {
              'points': [
                [
                  40,
                  40,
                ],
                [
                  50,
                  40,
                ],
                [
                  50,
                  50,
                ],
                [
                  40,
                  50,
                ],
              ],
              'closed': true,
              'polygonlabels': [
                'World',
              ],
            },
            'id': 'tNe7Bjmydb_2',
            'from_name': 'tag',
            'to_name': 'img',
            'type': 'polygonlabels',
            'origin': 'manual',
          },
          {
            'original_width': 2242,
            'original_height': 2802,
            'image_rotation': 0,
            'value': {
              'points': [
                [
                  10,
                  10,
                ],
                [
                  30,
                  10,
                ],
                [
                  20,
                  20,
                ],
              ],
              'closed': false,
              'polygonlabels': [
                'Hello',
              ],
            },
            'id': 'tNe7Bjmydb',
            'from_name': 'tag',
            'to_name': 'img',
            'type': 'polygonlabels',
            'origin': 'manual',
          },
        ],
      },
    ],
  });

  AtImageView.waitForImage();

  I.say('check loaded regions');
  let result = await LabelStudio.serialize();

  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].value.points.length, 4);
  assert.strictEqual(result[0].value.closed, true);
  assert.strictEqual(result[1].value.points.length, 3);
  assert.strictEqual(result[1].value.closed, false);

  I.say('try to continue drawing loaded unfinished region');
  await AtImageView.lookForStage();
  const canvasSize = await AtImageView.getCanvasSize();

  AtImageView.drawByClick(canvasSize.width * .10, canvasSize.height * .40);
  result = await LabelStudio.serialize();
  assert.strictEqual(result[1].value.points.length, 4);
  assert.strictEqual(result[1].value.closed, false);

  I.say('try to close loaded region');
  AtImageView.drawByClick(canvasSize.width * .10, canvasSize.height * .10);
  result = await LabelStudio.serialize();
  assert.strictEqual(result[1].value.points.length, 4);
  assert.strictEqual(result[1].value.closed, true);

  // I.say("check that it is possible to go back throught history");
  // I.pressKey(['CommandOrControl', 'Z']);
  // result = await LabelStudio.serialize();
  // assert.strictEqual(result[1].value.points.length, 4);
  // assert.strictEqual(result[1].value.closed, false);
  //
  // I.say("check that it is possible to close this region again");
  // AtImageView.drawByClick(canvasSize.width * .10, canvasSize.height * .10);
  // result = await LabelStudio.serialize();
  // assert.strictEqual(result[1].value.points.length, 4);
  // assert.strictEqual(result[1].value.closed, true);

});

Scenario('Removing a polygon by going back through history', async function({ I, LabelStudio, AtLabels, AtImageView }) {
  I.amOnPage('/');
  LabelStudio.setFeatureFlags(FLAGS);
  LabelStudio.init({
    config: CONFIG,
    data: {
      image: IMAGE,
    },
    params: {
      onSubmitDraft: saveDraftLocally,
    },
  });

  AtImageView.waitForImage();

  await AtImageView.lookForStage();

  I.say('start drawing polygon');
  AtLabels.clickLabel('Hello');
  AtImageView.drawByClickingPoints([[50,50], [100, 50]]);

  I.say('revert all changes and creating of the region');
  I.pressKey(['CommandOrControl', 'Z']);
  I.pressKey(['CommandOrControl', 'Z']);

  I.say('polygon should disappear and polygon tool should be switched of');
  let result = await LabelStudio.serialize();

  assert.strictEqual(result.length, 0);

  I.say('try to draw after that');
  AtImageView.drawByClickingPoints([[50,50], [100, 50]]);

  I.say('check if it was possible to do this (it shouldn\'t)');
  result = await LabelStudio.serialize();
  assert.strictEqual(result.length, 0);

  I.say('check if there were any errors');
  // The potential errors should be caught by `errorsCollector` plugin
});

Scenario('Continue annotating after closing region from draft', async function({ I, LabelStudio, AtLabels, AtImageView }) {
  I.amOnPage('/');
  LabelStudio.setFeatureFlags(FLAGS);
  LabelStudio.init({
    config: CONFIG,
    data: {
      image: IMAGE,
    },
    annotations: [
      {
        id: 'test',
        result: [
          {
            'original_width': 2242,
            'original_height': 2802,
            'image_rotation': 0,
            'value': {
              'points': [
                [
                  10,
                  10,
                ],
                [
                  30,
                  10,
                ],
                [
                  20,
                  20,
                ],
              ],
              'closed': false,
              'polygonlabels': [
                'Hello',
              ],
            },
            'id': 'tNe7Bjmydb',
            'from_name': 'tag',
            'to_name': 'img',
            'type': 'polygonlabels',
            'origin': 'manual',
          },
        ],
      },
    ],
  });

  AtImageView.waitForImage();
  await AtImageView.lookForStage();
  const canvasSize = await AtImageView.getCanvasSize();

  I.say('close loaded region');
  AtImageView.drawByClick(canvasSize.width * .10, canvasSize.height * .10);

  I.say('try to create another region');
  AtLabels.clickLabel('World');

  AtImageView.drawByClickingPoints([
    [canvasSize.width * .40, canvasSize.height * .40],
    [canvasSize.width * .50, canvasSize.height * .40],
    [canvasSize.width * .50, canvasSize.height * .50],
    [canvasSize.width * .40, canvasSize.height * .50],
    [canvasSize.width * .40, canvasSize.height * .40],
  ]);

  const result = await LabelStudio.serialize();

  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[1].value.points.length, 4);
  assert.strictEqual(result[1].value.closed, true);

});

Scenario('Change label on unfinished polygons', async function({ I, LabelStudio, AtLabels, AtImageView }) {
  I.amOnPage('/');
  LabelStudio.init({
    config: CONFIG,
    data: {
      image: IMAGE,
    },
    params: {
      onSubmitDraft: saveDraftLocally,
    },
  });
  LabelStudio.setFeatureFlags(FLAGS);

  AtImageView.waitForImage();

  await AtImageView.lookForStage();

  I.say('start drawing polygon without finishing it');
  AtLabels.clickLabel('Hello');
  AtImageView.drawByClickingPoints([[50,50], [100, 50], [100, 80]]);
  AtLabels.clickLabel('World');

  I.say('wait until autosave');
  I.waitForFunction(() => !!window.LSDraft, .5);
  I.say('check result');
  const draft = await I.executeScript(getLocallySavedDraft);

  assert.strictEqual(draft[0].value.polygonlabels[0], 'World');
});


const selectedLabelsVariants = new DataTable(['labels']);

selectedLabelsVariants.add([['Label 1']]);
selectedLabelsVariants.add([['Label 2', 'Label 3']]);

Data(selectedLabelsVariants).Scenario('Indicate selected labels', async function({ I, LabelStudio, AtLabels, AtImageView, current }) {
  const { labels } = current;

  I.amOnPage('/');
  LabelStudio.setFeatureFlags(FLAGS);
  LabelStudio.init({
    config: CONFIG_MULTIPLE,
    data: {
      image: IMAGE,
    },
    annotations: [
      {
        id: 'test',
        result: [
          {
            'original_width': 2242,
            'original_height': 2802,
            'image_rotation': 0,
            'value': {
              'points': [
                [
                  10,
                  10,
                ],
                [
                  30,
                  10,
                ],
                [
                  20,
                  20,
                ],
              ],
              'closed': false,
              'polygonlabels': labels,
            },
            'id': 'tNe7Bjmydb',
            'from_name': 'tag',
            'to_name': 'img',
            'type': 'polygonlabels',
            'origin': 'manual',
          },
        ],
      },
    ],
  });

  AtImageView.waitForImage();
  await AtImageView.lookForStage();
  const canvasSize = await AtImageView.getCanvasSize();

  I.say('check if we see an indication of selected labels after resuming from draft');
  for (const label of labels) {
    AtLabels.seeSelectedLabel(label);
  }

  I.say('close loaded region');
  AtImageView.drawByClick(canvasSize.width * .10, canvasSize.height * .10);

  I.say('check that we do not see an indication of selected after region completion');
  for (const label of labels) {
    AtLabels.dontSeeSelectedLabel(label);
  }

  I.say('check if we see an indication of selected labels after going back through the history');
  I.pressKey(['CommandOrControl', 'Z']);
  for (const label of labels) {
    AtLabels.seeSelectedLabel(label);
  }

});

const selectedPolygonAfterCreatingVariants = new DataTable(['shouldSelect', 'description']);

selectedPolygonAfterCreatingVariants.add([false, 'Without set setting']);
selectedPolygonAfterCreatingVariants.add([true, 'With set setting']);

Data(selectedPolygonAfterCreatingVariants).Scenario('Select polygon after creating from unfinished draft', async function({ I, LabelStudio, AtImageView, AtSidebar, AtSettings, current }) {
  const { shouldSelect, description } = current;

  I.say(description);
  I.amOnPage('/');
  LabelStudio.setFeatureFlags(FLAGS);
  LabelStudio.init({
    config: CONFIG,
    data: {
      image: IMAGE,
    },
    annotations: [
      {
        id: 'test',
        result: [
          {
            'original_width': 2242,
            'original_height': 2802,
            'image_rotation': 0,
            'value': {
              'points': [
                [
                  10,
                  10,
                ],
                [
                  30,
                  10,
                ],
                [
                  20,
                  20,
                ],
              ],
              'closed': false,
              'polygonlabels': [
                'Hello',
              ],
            },
            'id': 'tNe7Bjmydb',
            'from_name': 'tag',
            'to_name': 'img',
            'type': 'polygonlabels',
            'origin': 'manual',
          },
        ],
      },
    ],
  });

  if (shouldSelect) {
    AtSettings.open();
    AtSettings.setGeneralSettings({
      [AtSettings.GENERAL_SETTINGS.AUTO_SELECT_REGION]: shouldSelect,
    });
    AtSettings.close();
  }

  AtImageView.waitForImage();
  await AtImageView.lookForStage();
  const canvasSize = await AtImageView.getCanvasSize();

  I.say('close loaded region');
  AtImageView.drawByClick(canvasSize.width * .10, canvasSize.height * .10);

  I.say(`check that region ${shouldSelect ? 'is' : 'is not'} selected`);
  if (shouldSelect) {
    AtSidebar.seeSelectedRegion();
  } else {
    AtSidebar.dontSeeSelectedRegion();
  }

  I.say('unselect regions');
  I.pressKey('u');
  AtSidebar.dontSeeSelectedRegion();

  I.say('go back through the history');
  I.pressKey(['CommandOrControl', 'Z']);
  AtSidebar.dontSeeSelectedRegion();

  I.say('repeat creation and checking');
  AtImageView.drawByClick(canvasSize.width * .10, canvasSize.height * .10);
  if (shouldSelect) {
    AtSidebar.seeSelectedRegion();
  } else {
    AtSidebar.dontSeeSelectedRegion();
  }

});
