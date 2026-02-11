/* global Feature, Scenario */

const { doDrawingAction } = require("./helpers");

Feature("Test Image Region Stay Selected Between Tools");

const OUTLINER_PANEL_WIDTH = 319;

const PLANET = {
  color: "#00FF00",
  rgbArray: [0, 255, 0],
};
const MOONWALKER = {
  color: "#0000FF",
  rgbArray: [0, 0, 255],
};

const config = `
  <View>
    <Image name="image" value="$image" crossOrigin="anonymous" />
    <Brush name="brush" toName="image" />
    <MagicWand name="magicwand" toName="image" />
    <Labels name="labels" toName="image" fillOpacity="0.5" strokeWidth="5">
      <Label value="Planet" background="${PLANET.color}"></Label>
      <Label value="Moonwalker" background="${MOONWALKER.color}"></Label>
    </Labels>
  </View>`;

const annotationEmpty = {
  id: "1000",
  result: [],
};

const data = {
  image: "/public/files/images/nick-owuor-unsplash.jpg",
};

async function testRegion(testType, toolAccelerator, I, LabelStudio, AtImageView, AtOutliner) {
  const params = {
    config,
    data,
    annotations: [annotationEmpty],
  };

  I.amOnPage("/");

  LabelStudio.init(params);

  LabelStudio.waitForObjectsReady();
  await AtImageView.lookForStage();

  I.say(`Select ${testType} & planet class`);
  I.pressKey(toolAccelerator);
  I.pressKey("1");

  I.say("There should be no regions initially");
  AtOutliner.seeRegions(0);

  I.say(`${testType} initial region`);
  await doDrawingAction(I, {
    msg: `Initial ${testType}`,
    fromX: OUTLINER_PANEL_WIDTH + 150,
    fromY: 115,
    toX: OUTLINER_PANEL_WIDTH + 150 + 50,
    toY: 115 + 50,
  });

  I.say("There should now be a single region");
  AtOutliner.seeRegions(1);

  I.say(`Using Eraser on ${testType} region`);
  I.pressKey("E");
  I.usePlaywrightTo("Erasing", async ({ browser, browserContext, page }) => {
    await page.mouse.move(OUTLINER_PANEL_WIDTH + 150, 150);
    await page.mouse.down();
    await page.mouse.move(OUTLINER_PANEL_WIDTH + 150 + 100, 150);
    await page.mouse.up();
  });

  I.say(`Doing another ${testType} with same class after erasing`);
  I.pressKey(toolAccelerator);
  await doDrawingAction(I, {
    msg: `${testType} after erasing`,
    fromX: OUTLINER_PANEL_WIDTH + 280,
    fromY: 480,
    toX: OUTLINER_PANEL_WIDTH + 280 + 50,
    toY: 480 + 50,
  });

  I.say("There should still only be one region");
  AtOutliner.seeRegions(1);

  I.say("Zooming and selecting pan tool");
  I.click('button[aria-label="zoom-in"]');
  I.click('button[aria-label="zoom-in"]');
  I.pressKey("H");

  I.say(`Doing another ${testType} after zooming and selecting pan tool`);
  I.pressKey(toolAccelerator);
  await doDrawingAction(I, {
    msg: `${testType} after zoom and pan selected`,
    fromX: OUTLINER_PANEL_WIDTH + 400,
    fromY: 200,
    toX: OUTLINER_PANEL_WIDTH + 400 + 15,
    toY: 400 + 15,
  });

  I.say("There should still only be one region");
  AtOutliner.seeRegions(1);
}

Scenario("Selected brush region should stay between tools", async ({ I, LabelStudio, AtImageView, AtOutliner }) => {
  await testRegion("brush", "B", I, LabelStudio, AtImageView, AtOutliner);
});

Scenario(
  "Selected Magic Wand region should stay between tools",
  async ({ I, LabelStudio, AtImageView, AtOutliner }) => {
    await testRegion("magicwand", "W", I, LabelStudio, AtImageView, AtOutliner);
  },
);
