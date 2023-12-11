const assert = require('assert');

Feature('Zoomed transforms').tag('@regress');

const IMAGE = 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg';

const config = `
  <View>
    <Image name="img" value="$image" zoomby="2"/>
    <Rectangle name="rect" toName="img"/>
  </View>`;

Scenario('Transforming the region on the border of zoomed image', async ({ I, LabelStudio, AtImageView, AtSidebar }) => {
  const params = {
    config,
    data: { image: IMAGE },
  };

  I.amOnPage('/');

  LabelStudio.setFeatureFlags({
    'ff_front_dev_2394_zoomed_transforms_260522_short': true,
  });
  LabelStudio.init(params);
  AtImageView.waitForImage();
  AtSidebar.seeRegions(0);

  // Zoom in
  I.click('[aria-label=\'zoom-in\']');

  await AtImageView.lookForStage();
  const width = AtImageView.percToX(100);
  const height = AtImageView.percToY(100);

  // Pan image to the left to see its right border
  I.pressKeyDown('Shift');
  AtImageView.drawByDrag(width - 10, height / 2, -width + 20, 0);
  I.pressKeyUp('Shift');
  // Create the region at the right border of the image
  AtImageView.drawByDrag(width - 30, height / 2 , 20, height / 2 - 10);
  AtSidebar.seeRegions(1);
  // Select this region
  AtImageView.clickAt(width - 20, height / 2 + 10);
  AtSidebar.seeSelectedRegion();
  // Rotate by the rotator anchor (heuristically calculated coordinates)
  AtImageView.drawThroughPoints([[width - 20, height / 2 - 50], [width / 2, height / 2]], 'steps', 50);

  const results = await LabelStudio.serialize();

  // The angle of rotation should not exceed 30 degrees
  assert.strictEqual(((results[0].value.rotation + 30) % 360) < 30, true);
});

Scenario('Transforming the region on the border of zoomed image after window resize', async ({ I, LabelStudio, AtImageView, AtSidebar }) => {
  const wWidth = 1200;
  const wHeight = 900;
  const wWidthSmall = 1000;

  const params = {
    config,
    data: { image: IMAGE },
  };

  LabelStudio.setFeatureFlags({
    'ff_front_dev_2394_zoomed_transforms_260522_short': true,
  });

  I.amOnPage('/');
  I.resizeWindow(wWidthSmall, wHeight);

  LabelStudio.init(params);
  AtImageView.waitForImage();
  AtSidebar.seeRegions(0);

  // Zoom in
  I.click('[aria-label=\'zoom-in\']');

  await AtImageView.lookForStage();
  const width = AtImageView.percToX(100);
  const height = AtImageView.percToY(100);

  // Pan image to the left to see its right border
  I.pressKeyDown('Shift');
  AtImageView.drawByDrag(width - 10, height / 2, -width + 20, 0);
  I.pressKeyUp('Shift');

  // Create the region at the right border of the image
  AtImageView.drawByDrag(width - 30, height / 2 , 20, height / 2);
  AtSidebar.seeRegions(1);
  // Select this region
  AtImageView.clickAt(width - 20, height / 2 + 10);
  AtSidebar.seeSelectedRegion();

  I.resizeWindow(wWidth, wHeight);

  // If the canvas does not match the image, this action will rotate the region
  AtImageView.drawThroughPoints([[width - 20, height / 2 - 50], [width / 2, height / 2 - 50]], 'steps', 50);

  const results = await LabelStudio.serialize();

  // But we do not want to rotate it.
  assert.strictEqual(results[0].value.rotation, 0);
});
