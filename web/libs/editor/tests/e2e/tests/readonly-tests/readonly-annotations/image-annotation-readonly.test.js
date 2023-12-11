const assert = require('assert');

Feature('Readonly Annotation');

const imageExamples = new DataTable(['example', 'regionName']);

imageExamples.add([require('../../../examples/image-bboxes'), 'Hello']);
imageExamples.add([require('../../../examples/image-ellipses'), 'Hello']);
imageExamples.add([require('../../../examples/image-keypoints'), 'Hello']);
imageExamples.add([require('../../../examples/image-polygons'), 'Hello']);

Data(imageExamples).Scenario('Image Readonly Annotations', async ({
  I,
  current,
  LabelStudio,
  AtSidebar,
  AtImageView,
}) => {
  I.amOnPage('/');
  const { config, result, data } = current.example;
  const regions = result.filter(r => {
    return r.type.match('labels');
  });

  const params = {
    annotations: [{
      id: 'test',
      readonly: true, // Mark annotation readonly
      result,
    }],
    config,
    data,
  };

  LabelStudio.init(params);

  await AtImageView.waitForImage();
  await AtImageView.lookForStage();

  I.say(`Running against ${current.example.title}`);
  I.say('Check region is selectable');
  AtSidebar.seeRegions(regions.length);
  AtSidebar.clickRegion(current.regionName);

  I.say('No tranformer available');
  const isTransformerExist = await AtImageView.isTransformerExist();

  assert.equal(isTransformerExist, false);

  I.pressKey('Backspace');
  I.say('Results are equal after deletion attempt');
  await LabelStudio.resultsNotChanged(result, 1);

  I.say('Attempting to move a region');
  AtImageView.dragRegion(regions, (r, i) => i === 0);

  I.say('Results are equal after modification attempt');
  AtSidebar.seeRegions(regions.length);
  await LabelStudio.resultsNotChanged(result, 1);

  I.pressKey('u');
  I.say('Can\'t draw new shape');
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

  AtSidebar.seeRegions(regions.length);
});
