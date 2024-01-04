const { serialize } = require('./helpers');
const Utils = require('../examples/utils');
const examples = [
  require('../examples/audio-regions'),
  require('../examples/audio-paragraphs'),
  require('../examples/image-bboxes'),
  require('../examples/image-ellipses'),
  require('../examples/image-keypoints'),
  require('../examples/image-polygons'),
  require('../examples/ner-url'),
  require('../examples/nested'),
  require('../examples/text-html'),
  require('../examples/text-paragraphs'),
  require('../examples/timeseries-url-indexed'),
];

const assert = require('assert');

function roundFloats(struct) {
  return JSON.parse(
    JSON.stringify(struct, (key, value) => {
      if (typeof value === 'number') {
        return value.toFixed(1);
      }
      return value;
    }),
  );
}
function assertWithTolerance(actual, expected) {
  assert.deepEqual(roundFloats(actual), roundFloats(expected));
}

Feature('Smoke test through all the examples');

// old audio is broken, so skipping it
examples.slice(1).forEach(example =>
  Scenario(example.title || 'Noname smoke test', async function({ I, LabelStudio, AtImageView, AtAudioView, AtSidebar, AtTopbar }) {

    LabelStudio.setFeatureFlags({
      ff_front_dev_2715_audio_3_280722_short: true,
    });

    // @todo optional predictions in example
    const { annotations, config, data, result = annotations[0].result } = example;
    const params = { annotations: [{ id: 'test', result }], config, data };
    const configTree = Utils.parseXml(config);
    const ids = [];
    // add all unique ids from non-classification results
    // @todo some classifications will be reflected in Results list soon

    result.forEach(r => !ids.includes(r.id) && Object.keys(r.value).length > 1 && ids.push(r.id));
    const count = ids.length;

    await I.amOnPage('/');

    LabelStudio.init(params);

    AtSidebar.seeRegions(count);

    let restored;

    if (Utils.xmlTreeHasTag(configTree, 'Image')) {
      AtImageView.waitForImage();
    }

    if (Utils.xmlFindBy(configTree, node => node['#name'] === 'Audio')) {
      await AtAudioView.waitForAudio();
    }

    if (Utils.xmlFindBy(configTree, node => ['text', 'hypertext'].includes(node['#name'].toLowerCase()))) {
      I.waitForVisible('.lsf-htx-richtext', 5);
    }

    I.dontSeeElement(locate('.ls-errors'));

    restored = await I.executeScript(serialize);
    assertWithTolerance(restored, result);

    if (count) {
      I.click('.ant-list-item');
      // I.click('Delete Entity') - it founds something by tooltip, but not a button
      // so click the bin button in entity's info block
      I.click('.ls-entity-buttons span[aria-label=delete]');
      AtSidebar.seeRegions(count - 1);
      I.click('.lsf-history-buttons__action[aria-label=Reset]');
      AtSidebar.seeRegions(count);
      // Reset is undoable
      I.click('.lsf-history-buttons__action[aria-label=Undo]');

      // so after all these manipulations first region should be deleted
      restored = await I.executeScript(serialize);
      assertWithTolerance(
        restored,
        result.filter(r => r.id !== ids[0]),
      );
    }
    // Click on annotation copy button
    AtTopbar.click('[aria-label="Copy Annotation"]');

    // Check if new annotation exists
    AtTopbar.seeAnnotationAt(2);

    // Check for regions count
    AtSidebar.seeRegions(count);

    await I.executeScript(() => {
      window.LabelStudio.destroyAll();
    });
  }),
);
