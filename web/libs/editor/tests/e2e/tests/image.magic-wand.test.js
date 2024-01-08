const {
  initLabelStudio,
  hasKonvaPixelColorAtPoint,
  setKonvaLayersOpacity,
  serialize,
  waitForImage,
} = require('./helpers');
const assert = require('assert');

Feature('Test Image Magic Wand');

const CLOUDSHADOW = {
  color: '#1EAE3B',
  rgbArray: [30, 174, 59],
};
const HAZE = {
  color: '#68eee5',
  rgbArray: [104, 238, 229],
};
const CLOUD = {
  color: '#1b32de',
  rgbArray: [27, 50, 222],
};

const config = `
  <View>
    <Labels name="labels_1" toName="image_1">
      <Label hotkey="1" value="Snow" background="#F61E33" />
      <Label hotkey="2" value="Cloud Shadow" background="${CLOUDSHADOW.color}" />
      <Label hotkey="3" value="Haze" background="${HAZE.color}" />
      <Label hotkey="4" value="Cloud" background="${CLOUD.color}" />
      <Label hotkey="5" value="Exclude" background="#2C2C2B" />
    </Labels>
    <MagicWand name="magicwand_1" toName="image_1" />
    <View style="width: 100%; margin-bottom: 20%; margin-side: 10%;">
      <Image name="image_1" value="$image" zoomControl="true" zoom="true" crossOrigin="anonymous" />
    </View>
  </View>`;

const annotationEmpty = {
  id: '1000',
  result: [],
};

// TODO: Change these URLs to heartex URLs, and ensure the heartex bucket allows CORS access
// for these to work.
const data = {
  'image': [
    'http://htx-pub.s3.amazonaws.com/samples/magicwand/magic_wand_scale_1_20200902_015806_26_2235_1B_AnalyticMS_00750_00750.jpg',
    'http://htx-pub.s3.amazonaws.com/samples/magicwand/magic_wand_scale_2_20200902_015806_26_2235_1B_AnalyticMS_00750_00750.jpg',
    'http://htx-pub.s3.amazonaws.com/samples/magicwand/magic_wand_scale_3_20200902_015806_26_2235_1B_AnalyticMS_00750_00750.jpg',
    'http://htx-pub.s3.amazonaws.com/samples/magicwand/magic_wand_false_color_20200902_015806_26_2235_1B_AnalyticMS_00750_00750.jpg',
  ],
  'thumb': 'http://htx-pub.s3.amazonaws.com/samples/magicwand/magic_wand_thumbnail_20200902_015806_26_2235_1B_AnalyticMS_00750_00750.jpg',
};

async function magicWand(I, { msg, fromX, fromY, toX, toY }) {
  I.usePlaywrightTo(msg, async ({ page }) => {
    await page.mouse.move(fromX, fromY);
    await page.mouse.down();
    await page.mouse.move(toX, toY);
    await page.mouse.up();
  });
  I.wait(1); // Ensure that the magic wand brush region is fully finished being created.
}

async function assertMagicWandPixel(I, x, y, assertValue, rgbArray, msg) {
  const hasPixel = await I.executeScript(hasKonvaPixelColorAtPoint, [x, y, rgbArray, 1]);
  
  assert.equal(hasPixel, assertValue, msg);
}

Scenario('Make sure the magic wand works in a variety of scenarios', async function({ I, LabelStudio, AtImageView, AtSidebar }) {
  const params = {
    config,
    data,
    annotations: [annotationEmpty],
  };

  LabelStudio.setFeatureFlags({
    'fflag_feat_front_dev_4081_magic_wand_tool': true,
  });

  I.amOnPage('/');

  I.executeScript(initLabelStudio, params);

  AtImageView.waitForImage();
  await AtImageView.lookForStage();

  I.say('Making sure magic wand button is present');
  I.seeElement('.lsf-toolbar__group button[aria-label="magicwand"]');

  I.say('Making sure Eraser button is present');
  I.seeElement('.lsf-toolbar__group button[aria-label="eraser"]');

  I.say('Select magic wand & cloud class');
  I.pressKey('W');
  I.pressKey('4');

  AtSidebar.seeRegions(0);

  I.say('Magic wanding clouds with cloud class in upper left of image');
  await magicWand(I, { msg: 'Fill in clouds upper left', fromX: 258, fromY: 214, toX: 650, toY: 650 });
  await magicWand(I, { msg: 'Fill in clouds lower left', fromX: 337, fromY: 777, toX: 650, toY: 650 });

  I.say('Ensuring repeated magic wands back to back with same class collapsed into single region');
  AtSidebar.seeRegions(1);
  AtSidebar.see('Cloud');

  // Force all the magic wand regions to be a consistent color with no opacity to make testing
  // magic wand pixel colors more robust.
  I.say('Ensuring cloud magic wand pixels are correctly filled color');
  await I.executeScript(setKonvaLayersOpacity, [1.0]);
  await assertMagicWandPixel(I, 0, 0, false, CLOUD.rgbArray,
    'Far upper left corner should not have magic wand cloud class');
  await assertMagicWandPixel(I, 260, 50, true, CLOUD.rgbArray,
    'Upper left should have magic wand cloud class');
  await assertMagicWandPixel(I, 300, 620, true, CLOUD.rgbArray,
    'Lower left should have magic wand cloud class');
  await assertMagicWandPixel(I, 675, 650, false, CLOUD.rgbArray,
    'Far lower right corner should not have magic wand cloud class');

  // Make sure the region made from this is correct.
  I.say('Ensuring magic wand brushregion was created correctly');
  const result = await I.executeScript(serialize);
  const entry = result[1];

  assert.equal(entry['from_name'], 'labels_1');
  assert.equal(entry['type'], 'labels');
  const labels = entry['value']['labels'];

  assert.equal(labels.length, 1);
  assert.equal(labels[0], 'Cloud');
  assert.equal(entry['value']['rle'].length > 0, true);

  // Undo the bottom left area we just added, make sure its gone but our region list is still
  // 1, then redo it and ensure its back and our region list is still 1 again.
  I.say('Undoing last cloud magic wand and ensuring it worked correctly');
  I.click('button[aria-label="Undo"]');
  I.wait(1);
  await assertMagicWandPixel(I, 300, 620, false, CLOUD.rgbArray,
    'Undone lower left should not have magic wand cloud class anymore');
  await assertMagicWandPixel(I, 260, 50, true, CLOUD.rgbArray,
    'Upper left should still have magic wand cloud class');
  AtSidebar.seeRegions(1);

  I.say('Redoing last cloud magic wand and ensuring it worked correctly');
  I.click('button[aria-label="Redo"]');
  I.wait(1);
  await assertMagicWandPixel(I, 300, 620, true, CLOUD.rgbArray,
    'Redone lower left should have magic wand cloud class again');
  await assertMagicWandPixel(I, 260, 50, true, CLOUD.rgbArray,
    'Upper left should still have magic wand cloud class');
  AtSidebar.seeRegions(1);

  I.say('Unselecting last magic wand region');
  I.pressKey('Escape');

  // @todo currently gallery doesn't work well with CORS, so this is not covered by test
  // Change to the false color view, zoom in, and magic wand with a new class.
  // I.say('Changing to false-color view');
  // I.click('[class*="gallery--"] img[src*="false_color"]');

  I.say('Zooming in');
  I.click('button[aria-label="zoom-in"]');
  I.click('button[aria-label="zoom-in"]');
  I.click('button[aria-label="zoom-in"]');
  I.click('button[aria-label="zoom-in"]');
  I.click('button[aria-label="zoom-in"]');

  I.say('Selecting cloud shadow class');
  I.pressKey('2');

  I.say('Magic wanding cloud shadows with cloud shadow class in center of zoomed image');
  await magicWand(I, { msg: 'Cloud shadow in middle of image', fromX: 390, fromY: 500, toX: 500, toY: 500 });

  I.say('Ensuring new cloud shadow magic wand region gets added to sidebar');
  AtSidebar.seeRegions(2);
  AtSidebar.see('Cloud Shadow');

  I.say('Ensuring cloud shadow magic wand pixels are correctly filled color');
  await I.executeScript(setKonvaLayersOpacity, [1.0]);
  await assertMagicWandPixel(I, 0, 0, false, CLOUDSHADOW.rgbArray,
    'Zoomed upper left corner should not have cloud shadow');
  await assertMagicWandPixel(I, 350, 360, true, CLOUDSHADOW.rgbArray,
    'Center area should have magic wand cloud shadow class');

  // Make sure if you have a region selected then change the class the region class changes.
  I.say('Changing class of existing selected region to Haze should change it to new class');
  I.pressKey('3');
  AtSidebar.seeRegions(2);
  AtSidebar.dontSee('Cloud Shadow');
  AtSidebar.see('Haze');
  await I.executeScript(setKonvaLayersOpacity, [1.0]);
  await assertMagicWandPixel(I, 350, 360, true, HAZE.rgbArray,
    'Center area should have magic wand haze class');
});
