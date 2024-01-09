const assert = require('assert');
const Helpers = require('../helpers');

Feature('Image zoom position').tag('@regress');

const IMAGE = 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg';

const config = `
  <View>
    <Image name="img" value="$image" zoomby="2"/>
    <Rectangle name="rect" toName="img"/>
  </View>`;

async function getStrokeColor() {
  const circle = window.Konva.stages[0].findOne('Circle');

  return circle.attrs.stroke;
}

const relativeCoordsFF = new DataTable(['enabled']);

relativeCoordsFF.add([true]);
relativeCoordsFF.add([false]);

Data(relativeCoordsFF).Scenario('Zoomed image should keep center image in center of canvas on resizes', async ({ I, LabelStudio, AtImageView, AtOutliner, AtDetails, AtPanels, current }) => {
  const AtDetailsPanel = AtPanels.usePanel(AtPanels.PANEL.DETAILS);
  const AtOutlinerPanel = AtPanels.usePanel(AtPanels.PANEL.OUTLINER);
  const FF3793 = current;

  const params = {
    config,
    data: { image: IMAGE },
    annotations: [{
      id: '1000',
      result: [
        {
          'original_width': 2242,
          'original_height': 2802,
          'image_rotation': 0,
          'value': {
            'x': 88.5670731707317,
            'y': 88.3130081300813,
            'width': 10.645325203252034,
            'height': 11.016260162601629,
            'rotation': 0,
          },
          'id': 'Nrzdt6xVq1',
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
            'x': 68.75,
            'y': 68.78556910569105,
            'width': 6.250000000000001,
            'height': 6.25,
            'rotation': 0,
          },
          'id': 'S_q7c7DTU4',
          'from_name': 'rect',
          'to_name': 'img',
          'type': 'rectangle',
          'origin': 'manual',
        },
      ],
    }],
  };

  LabelStudio.setFeatureFlags({
    ff_front_dev_2394_zoomed_transforms_260522_short: true,
    ff_front_1170_outliner_030222_short: true,
    fflag_fix_front_dev_3377_image_regions_shift_on_resize_280922_short: true,
    fflag_fix_front_dev_3793_relative_coords_short: FF3793.enabled,
  });

  I.amOnPage('/');
  LabelStudio.init(params);
  AtImageView.waitForImage();
  AtOutliner.seeRegions(2);

  await AtImageView.lookForStage();

  AtImageView.selectPanTool();

  I.say('Zoom into the first region');
  for (let k = 0; k < 3; k++) {
    I.click('[aria-label=\'zoom-in\']');
    AtImageView.drawByDrag(
      AtImageView.percToX(95),
      AtImageView.percToY(95),
      -AtImageView.percToX(90),
      -AtImageView.percToY(90),
    );
  }

  AtImageView.selectMoveTool();

  I.say('Check that there is a region at the center of visible area');
  AtImageView.clickAt(AtImageView.percToX(50), AtImageView.percToY(50));
  AtOutliner.seeSelectedRegion();
  // these values depend on screen size, interface elements size, etc.
  // so if they were changed slightly, just replace them with actual data.
  AtDetails.seeFieldWithValue('X', FF3793.enabled ? '88.567' : '435.75');
  I.pressKey('U');

  I.say('Collapse the details panel');
  AtDetailsPanel.collapsePanel();
  await AtImageView.lookForStage();

  I.say('Check that there is a region at the center of visible area');
  AtImageView.clickAt(AtImageView.percToX(50), AtImageView.percToY(50));
  AtOutliner.seeSelectedRegion();
  I.pressKey('U');


  I.say('Collapse the outliner panel');
  AtOutlinerPanel.collapsePanel();
  await AtImageView.lookForStage();

  I.say('The region should be at the right side of visible area');
  {
    AtImageView.clickAt(AtImageView.percToX(25), AtImageView.percToY(50));
    const thereIsTransformer = await AtImageView.isTransformerExist();

    assert.strictEqual(thereIsTransformer, false);
  }
  {
    AtImageView.clickAt(AtImageView.percToX(75), AtImageView.percToY(50));
    const thereIsTransformer = await AtImageView.isTransformerExist();

    assert.strictEqual(thereIsTransformer, true);
    I.pressKey('U');
  }

  I.say('Reset changes');
  AtDetailsPanel.expandPanel();
  AtOutlinerPanel.expandPanel();
  await AtImageView.lookForStage();
  I.pressKey(['Shift', '1']);
  //
  AtImageView.selectPanTool();

  I.say('Zoom into the second region');
  for (let k = 0; k < 3; k++) {
    I.click('[aria-label=\'zoom-in\']');
    AtImageView.drawByDrag(
      AtImageView.percToX(75),
      AtImageView.percToY(75),
      -AtImageView.percToX(25),
      -AtImageView.percToY(25),
    );
  }

  AtImageView.selectMoveTool();

  I.say('Check that there is a region at the center of visible area');
  AtImageView.clickAt(AtImageView.percToX(50), AtImageView.percToY(50));
  AtOutliner.seeSelectedRegion();
  AtDetails.seeFieldWithValue('X', FF3793.enabled ? '68.75' : '338.25');
  I.pressKey('U');

  I.say('Collapse the details panel');
  AtDetailsPanel.collapsePanel();
  await AtImageView.lookForStage();

  I.say('Check that the region is still at the center of visible area');
  AtImageView.clickAt(AtImageView.percToX(50), AtImageView.percToY(50));
  AtOutliner.seeSelectedRegion();
  I.pressKey('U');

  I.say('Resize panels');
  AtDetailsPanel.expandPanel();

  for (const [shiftX, steps] of [[100, 10], [-100, 10], [100, 10], [-100, 10], [100, 1], [-100, 1], [100, 1], [-100, 1], [100, 3], [-100, 3]]) {
    await AtDetailsPanel.dragResizerBy(shiftX, 0, AtDetailsPanel.resizeLeft, steps);
  }
  for (const [shiftX, steps] of [[-200, 25], [200, 25], [-200, 1], [200, 1]]) {
    await AtOutlinerPanel.dragResizerBy(shiftX, 0, AtOutlinerPanel.resizeRight, steps);
  }
  await AtImageView.lookForStage();

  I.say('Check that the region is still at the center of visible area');
  AtImageView.clickAt(AtImageView.percToX(50), AtImageView.percToY(50));
  AtOutliner.seeSelectedRegion();
  I.pressKey('U');
});

Scenario('Keeping the zoom center for different image sizes and scaling algorithms', async ({ I, LabelStudio, AtImageView, AtPanels }) => {
  const AtDetailsPanel = AtPanels.usePanel(AtPanels.PANEL.DETAILS);
  const AtOutlinerPanel = AtPanels.usePanel(AtPanels.PANEL.OUTLINER);
  const strokecolor = 'rgb(0,111,222)';

  const keyPointBeSelected = async () => {
    const currentStokeColor = await I.executeScript(getStrokeColor);
    const colorIsChanged = currentStokeColor !== strokecolor;

    assert.strictEqual(colorIsChanged, true, 'Stroke color must be changed if we are able to select keypoint');
  };

  const params = {
    config: `
  <View>
    <Image name="img" value="$image" zoomby="8"/>
    <KeyPoint name="point" toName="img" strokecolor="${strokecolor}" />
    <Rectangle name="rect" toName="img"/>
  </View>`,
    annotations: [{
      id: '1000',
      result: [],
    }],
  };

  LabelStudio.setFeatureFlags({
    ff_front_dev_2394_zoomed_transforms_260522_short: true,
    ff_front_1170_outliner_030222_short: true,
    fflag_fix_front_dev_3377_image_regions_shift_on_resize_280922_short: true,
  });

  for (const [width, height] of [[2242, 2802],[768, 576]]) {
    I.amOnPage('/');
    const imageUrl = await I.executeScript(Helpers.generateImageUrl, { width, height });

    LabelStudio.init({
      ...params,
      data: { image: imageUrl },
    });
    await AtImageView.waitForImage();

    AtImageView.selectPanTool();
    I.click('[aria-label=\'zoom-in\']');
    await AtImageView.lookForStage();
    AtImageView.drawByDrag(
      AtImageView.percToX(75),
      AtImageView.percToY(25),
      -AtImageView.percToX(25),
      AtImageView.percToY(25),
    );

    I.say('Draw a point at the center of visible area');
    I.pressKey('K');
    AtImageView.drawByClick(AtImageView.percToX(50), AtImageView.percToY(50));

    I.say('Collapse the details panel');
    AtDetailsPanel.collapsePanel();
    await AtImageView.lookForStage();

    I.say('Check that the region is still at the center of visible area');
    AtImageView.clickAt(AtImageView.percToX(50), AtImageView.percToY(50));
    await keyPointBeSelected();
    I.pressKey('U');

    I.say('Collapse the outliner panel');
    AtOutlinerPanel.collapsePanel();
    await AtImageView.lookForStage();

    I.say('Check that the region is still at the center of visible area');
    AtImageView.clickAt(AtImageView.percToX(50), AtImageView.percToY(50));
    await keyPointBeSelected();
    I.pressKey('U');

    AtDetailsPanel.expandPanel();
    AtOutlinerPanel.expandPanel();
  }
});
