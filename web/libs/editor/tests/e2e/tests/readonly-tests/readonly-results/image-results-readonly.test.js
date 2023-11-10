const assert = require('assert');

Feature('Readonly Results');

const imageExamples = new DataTable(['testName', 'example', 'regionName']);

imageExamples.add(['Image BBoxes', require('../../../examples/image-bboxes'), 'Hello']);
imageExamples.add(['Image Ellipses', require('../../../examples/image-ellipses'), 'Hello']);
imageExamples.add(['Image Keypoints', require('../../../examples/image-keypoints'), 'Hello']);
imageExamples.add(['Image Polygons', require('../../../examples/image-polygons'), 'Hello']);

Data(imageExamples).Scenario('Image Readonly Results', async ({
  I,
  current,
  LabelStudio,
  AtSidebar,
  AtImageView,
}) => {
  I.amOnPage('/');
  const { config, result: r, data } = current.example;

  // mark first result as readonly
  const result = r.map((r, i) => i === 0 ? { ...r, readonly: true } : r);

  // extracts label regions only
  const regions = result.filter(r => r.type.match('labels'));

  LabelStudio.init({
    annotations: [{
      id: 'test',
      result,
    }],
    config,
    data,
  });

  await AtImageView.waitForImage();
  await AtImageView.lookForStage();

  I.say(`Running against ${current.example.title}`);
  I.say('Check region is selectable');
  AtSidebar.seeRegions(regions.length);
  AtSidebar.clickRegion(current.regionName);

  I.pressKey('Backspace');
  I.say('Results are equal after deletion attempt');
  await LabelStudio.resultsNotChanged(result, 1);

  I.say('No tranformer available');
  const isTransformerExist = await AtImageView.isTransformerExist();

  assert.equal(isTransformerExist, false);
  I.pressKey('u');

  I.say('Attempting to move a readonly region');
  await AtImageView.dragRegion(regions, (r) => r.readonly);

  I.say('Results are equal after modification attempt');
  await LabelStudio.resultsNotChanged(result, 1);
  AtSidebar.seeRegions(regions.length);

  I.say('Attempting to move a non-readonly region');
  await I.scrollPageToTop();
  await AtImageView.dragRegion(regions, (r) => !r.readonly);
  I.say('Results are not equal after modification attempt');
  await LabelStudio.resultsChanged(result, 1);

  I.say('Attempting to draw new shape');
  I.pressKey('1');

  switch(current.example.title) {
    case 'Keypoints on Image':
      AtImageView.clickAt(100, 100);
      break;
    case 'Polygons on Image':
      AtImageView.drawByClickingPoints([
        [65, 135],
        [150, 55],
        [240, 90],
        [125, 265],
        [65, 135],
      ]);
      break;
    default:
      AtImageView.drawByDrag(100, 100, 200, 200);
      break;
  }

  AtSidebar.seeRegions(regions.length + 1);
});
