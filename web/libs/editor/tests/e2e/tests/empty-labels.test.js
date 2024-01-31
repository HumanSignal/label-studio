const Helpers = require('./helpers');
const Asserts = require('../utils/asserts');
const assert = require('assert');

Feature('Empty labels');

const { examples, Utils } = require('../examples/');

function isLabelType(type) {
  return type.toLowerCase().endsWith('labels');
}
function isLabels(val, key) {
  return isLabelType(key);
}

examples.forEach(example => {
  const { annotations, config, data, result = annotations[0].result, title } = example;

  Scenario(`Nonexistent label -> ${title}`, async ({ I, LabelStudio, AtSidebar, AtImageView, AtAudioView }) => {
    LabelStudio.setFeatureFlags({
      ff_front_dev_2715_audio_3_280722_short: true,
    });

    let { result = annotations[0].result } = example;

    result = result.filter(res => isLabelType(res.type));
    const params = { annotations: [{ id: 'test', result }], data };
    const configTree = Utils.parseXml(config);

    Utils.xmlFilterNodes(configTree, node => {
      return !node['#name'].toLowerCase().endsWith('label');
    });
    params.config = Utils.renderXml(configTree);
    const regionsCount = Utils.countRegionsInResult(result);

    I.amOnPage('/');
    LabelStudio.init(params);
    AtSidebar.seeRegions(regionsCount);

    if (Utils.xmlTreeHasTag(configTree, 'Image')) {
      AtImageView.waitForImage();
    }
    if (Utils.xmlFindBy(configTree, node => node['#name'] === 'Audio')) {
      await AtAudioView.waitForAudio();
    }

    if (regionsCount) {
      const restored = await LabelStudio.serialize();

      Asserts.notDeepEqualWithTolerance(result, restored, 1);
      for (let i = result.length; i--;) {
        Asserts.deepEqualWithTolerance(Helpers.omitBy(result[i], isLabels), restored[i], 1);
      }
    }
  });

  Scenario(`Different from_name -> ${title}`, async ({ I, LabelStudio, AtSidebar, AtImageView, AtAudioView }) => {
    let { result = annotations[0].result } = example;

    LabelStudio.setFeatureFlags({
      ff_front_dev_2715_audio_3_280722_short: true,
    });

    result = result.filter(res => isLabelType(res.type));
    const params = { annotations: [{ id: 'test', result }], data };
    const configTree = Utils.parseXml(config);

    Utils.xmlForEachNode(configTree, node => {
      if (node['#name'].toLowerCase().endsWith('labels') && node.$) {
        node.$.name = 'Not-' + node.$.name;
      }
    });
    params.config = Utils.renderXml(configTree);
    const regionsCount = Utils.countRegionsInResult(result);

    I.amOnPage('/');
    LabelStudio.init(params);
    AtSidebar.seeRegions(regionsCount);

    if (Utils.xmlTreeHasTag(configTree, 'Image')) {
      AtImageView.waitForImage();
    }
    if (Utils.xmlFindBy(configTree, node => node['#name'] === 'Audio')) {
      await AtAudioView.waitForAudio();
    }

    if (regionsCount) {
      const restored = await LabelStudio.serialize();

      Asserts.notDeepEqualWithTolerance(result, restored, 1);
      for (let i = result.length; i--;) {
        Asserts.deepEqualWithTolerance(
          Helpers.omitBy(result[i], (val, key) => key === 'from_name' || isLabels(val, key)),
          Helpers.omitBy(restored[i], (val, key) => key === 'from_name' || isLabels(val, key)),
          1,
        );
      }
    }
  });

  Scenario(`Nonexistent from_name -> ${title}`, async ({ I, LabelStudio, AtTopbar, AtSidebar }) => {
    const params = { annotations: [{ id: 'test', result }], data };
    const configTree = Utils.parseXml(config);

    Utils.xmlFilterNodes(configTree, node => {
      return !node['#name'].toLowerCase().endsWith('labels');
    });
    params.config = Utils.renderXml(configTree);
    const regionsCount = Utils.countRegionsInResult(result);

    I.amOnPage('/');
    LabelStudio.init(params);
    AtTopbar.see('Update');
    AtSidebar.dontSeeRegions(regionsCount);
    AtSidebar.dontSeeRegions();
  });
});

const SINGLE_TYPE = 'single';
const MULTIPLE_TYPE = 'multiple';

[SINGLE_TYPE, MULTIPLE_TYPE].forEach(type => {
  Scenario(`Making labels empty -> choice="${type}"`, async ({ I, LabelStudio, AtSidebar, AtAudioView, AtLabels }) => {
    async function expectSelectedLabels(expectedNum) {
      const selectedLabelsNum = await I.grabNumberOfVisibleElements(AtLabels.locateSelected());

      assert.strictEqual(selectedLabelsNum, expectedNum);
    }
    async function clickLabelWithLengthExpection(labelNumber, expectedLength, expectSelectedNum) {
      AtLabels.clickLabel(`${labelNumber}`);
      const restored = await LabelStudio.serialize();

      assert.strictEqual(restored[0].value.labels.length, expectedLength);
      await expectSelectedLabels(expectSelectedNum);
      I.pressKey(['u']);
      await expectSelectedLabels(0);
      I.click(locate('.lsf-region-item'));
      await expectSelectedLabels(expectSelectedNum);
    }
    async function clickLabelWithSelectedExpection(labelNumber, expectSelectedNum) {
      AtLabels.clickLabel(`${labelNumber}`);
      await expectSelectedLabels(expectSelectedNum);
    }

    const audioRegions = require('../examples/audio-regions');
    const { annotations, config, data } = audioRegions;
    let { result = annotations[0].result } = require('../examples/audio-regions');

    result = result.filter(r => isLabelType(r.type)).filter((r, idx) => !idx);
    const params = { annotations: [{ id: 'test', result }], data, config };
    const configTree = Utils.parseXml(config);

    Utils.xmlForEachNode(configTree, node => {
      if (node['#name'].toLowerCase().endsWith('labels') && node.$) {
        node.$.allowempty = true;
        node.$.choice = type;
      }
    });
    params.config = Utils.renderXml(configTree);

    const regionsCount = Utils.countRegionsInResult(result);

    I.amOnPage('/');
    LabelStudio.init(params);
    await AtAudioView.waitForAudio();
    AtSidebar.seeRegions(regionsCount);

    I.click(locate('.lsf-region-item'));
    AtLabels.clickLabel('1');

    const restored = await LabelStudio.serialize();

    Asserts.notDeepEqualWithTolerance(result[0], restored[0], 1);
    Asserts.deepEqualWithTolerance(Helpers.omitBy(result[0], isLabels), Helpers.omitBy(restored[0], isLabels), 1);
    assert.strictEqual(restored[0].value.labels.length, 0);
    await clickLabelWithLengthExpection(2, 1, 1);
    switch (type) {
      case SINGLE_TYPE:
        await clickLabelWithLengthExpection(3, 1, 1);
        break;
      case MULTIPLE_TYPE:
        await clickLabelWithLengthExpection(3, 2, 2);
        break;
    }
    await clickLabelWithLengthExpection(1, 0, 1);
    await clickLabelWithLengthExpection(2, 1, 1);
    await clickLabelWithLengthExpection(2, 0, 1);
    await clickLabelWithLengthExpection(1, 0, 1);

    I.pressKey(['u']);

    await clickLabelWithSelectedExpection(3, 1);
    switch (type) {
      case SINGLE_TYPE:
        await clickLabelWithSelectedExpection(2, 1);
        break;
      case MULTIPLE_TYPE:
        await clickLabelWithSelectedExpection(2, 2);
        break;
    }
    await clickLabelWithSelectedExpection(1, 1);
    await clickLabelWithSelectedExpection(2, 1);
    await clickLabelWithSelectedExpection(2, 0);
    await clickLabelWithSelectedExpection(1, 1);
    await clickLabelWithSelectedExpection(1, 0);
  });
});

Scenario('Consistency of empty labels', async ({ I, LabelStudio, AtSidebar, AtImageView, AtLabels }) => {
  const { config, data } = require('../examples/image-bboxes');
  const params = { annotations: [{ id: 'test', result: [] }], data };
  const configTree = Utils.parseXml(config);

  Utils.xmlForEachNode(configTree, node => {
    if (node['#name'].toLowerCase().endsWith('labels') && node.$) {
      node.$.allowempty = true;
    }
  });
  params.config = Utils.renderXml(configTree);

  I.amOnPage('/');
  LabelStudio.init(params);
  AtSidebar.seeRegions(0);
  AtImageView.waitForImage();
  AtLabels.clickLabel('1');
  AtImageView.dragKonva(200, 200, 100, 100);
  const shapesNum = await AtImageView.countKonvaShapes();

  assert.strictEqual(shapesNum, 1);
  const restored = await LabelStudio.serialize();
  const canvasSize = await AtImageView.getCanvasSize();
  const convertToImageSize = Helpers.getSizeConvertor(canvasSize.width, canvasSize.height);

  Asserts.deepEqualWithTolerance(
    restored[0].value,
    convertToImageSize({ x: 200, y: 200, width: 100, height: 100, rotation: 0, rectanglelabels: [] }),
    1,
  );
});
