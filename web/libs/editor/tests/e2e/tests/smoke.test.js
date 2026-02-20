const { serialize } = require("./helpers");
const Utils = require("../examples/utils");
const examples = [
  require("../examples/audio-regions"),
  require("../examples/audio-paragraphs"),
  require("../examples/image-bboxes"),
  require("../examples/image-ellipses"),
  require("../examples/image-keypoints"),
  require("../examples/image-polygons"),
  require("../examples/ner-url"),
  require("../examples/nested"),
  require("../examples/text-html"),
  require("../examples/text-paragraphs"),
  require("../examples/timeseries-url-indexed"),
];

const assert = require("assert");

function roundFloats(struct) {
  return JSON.parse(
    JSON.stringify(struct, (key, value) => {
      if (typeof value === "number") {
        return value.toFixed(1);
      }
      return value;
    }),
  );
}
function assertWithTolerance(actual, expected) {
  assert.deepEqual(roundFloats(actual), roundFloats(expected));
}

Feature("Smoke test through all the examples");

// old audio is broken, so skipping it
examples.slice(1).forEach((example) =>
  Scenario(example.title || "Noname smoke test", async ({ I, LabelStudio, AtOutliner, AtDetails, AtAudioView }) => {
    LabelStudio.setFeatureFlags({
      ff_front_dev_2715_audio_3_280722_short: true,
    });

    // @todo optional predictions in example
    const { annotations, config, data, result = annotations[0].result } = example;
    const params = { annotations: [{ id: "test", result }], config, data };
    const configTree = Utils.parseXml(config);
    const ids = [];
    // add all unique ids from non-classification results
    // @todo some classifications will be reflected in Results list soon

    result.forEach((r) => !ids.includes(r.id) && Object.keys(r.value).length > 1 && ids.push(r.id));
    const count = ids.length;

    await I.amOnPage("/");

    LabelStudio.init(params);

    AtOutliner.seeRegions(count);

    let restored;

    LabelStudio.waitForObjectsReady();

    if (Utils.xmlFindBy(configTree, (node) => node["#name"] === "Audio")) {
      await AtAudioView.waitForAudio();
    }

    if (Utils.xmlFindBy(configTree, (node) => ["text", "hypertext"].includes(node["#name"].toLowerCase()))) {
      I.waitForVisible(".lsf-htx-richtext", 5);
    }

    I.dontSeeElement(locate(".lsf-errors"));

    restored = await I.executeScript(serialize);
    assertWithTolerance(restored, result);

    if (count) {
      AtOutliner.clickRegion(1);
      // I.click('Delete Entity') - it founds something by tooltip, but not a button
      // so click the bin button in entity's info block
      AtDetails.clickDeleteRegion();
      AtOutliner.seeRegions(count - 1);
      I.click('[aria-label="Reset"]');
      AtOutliner.seeRegions(count);
      // Reset is undoable
      I.click('[aria-label="Undo"]');

      // so after all these manipulations first region should be deleted
      restored = await I.executeScript(serialize);
      assertWithTolerance(
        restored,
        result.filter((r) => r.id !== ids[0]),
      );
    }
    // Duplicate the current annotation via the store API
    await I.executeScript(() => {
      const cs = window.Htx.annotationStore;
      const entity = cs.selected;
      const c = cs.addAnnotationFromPrediction(entity);

      cs.selectAnnotation(c.id);
    });
    I.waitTicks(5);

    // Check if new annotation exists in the carousel
    const annotationCount = await I.grabNumberOfVisibleElements(".lsf-annotation-button");

    assert.ok(annotationCount >= 2, `Expected at least 2 annotations in carousel, got ${annotationCount}`);

    // Check for regions count
    AtOutliner.seeRegions(count);

    await I.executeScript(async () => {
      // await window.LabelStudio.destroyAll();
      // return true;
    });
  }),
);
