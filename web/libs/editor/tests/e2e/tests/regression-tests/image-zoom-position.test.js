const assert = require("assert");
const Helpers = require("../helpers");

Feature("Image zoom position").tag("@regress").config({ waitForAction: 50 });

const IMAGE = "/public/files/images/nick-owuor-unsplash.jpg";

const config = `
  <View>
    <Image name="img" value="$image" zoomby="2"/>
    <Rectangle name="rect" toName="img"/>
  </View>`;

async function getStrokeColor() {
  const circle = window.Konva.stages[0].findOne("Circle");

  return circle.attrs.stroke;
}

Scenario(
  "Zoomed image should keep center image in center of canvas on resizes",
  async ({ I, LabelStudio, AtImageView }) => {
    const waitForLoadedRegions = async (expectedCount = 2) => {
      await I.waitForFunction(
        (count) => (window.Htx?.annotationStore?.selected?.regions?.length ?? 0) >= count,
        [expectedCount],
        10,
      );
    };
    const clickAndCheckTransformer = async (xPerc, yPerc, message) => {
      const offsets = [
        [0, 0],
        [3, 0],
        [-3, 0],
        [0, 3],
        [0, -3],
        [6, 0],
        [-6, 0],
        [0, 6],
        [0, -6],
        [10, 0],
        [-10, 0],
        [0, 10],
        [0, -10],
        [15, 0],
        [-15, 0],
        [0, 15],
        [0, -15],
        [10, 10],
        [-10, 10],
        [10, -10],
        [-10, -10],
      ];
      let transformerVisible = false;
      const clamp = (v) => Math.max(1, Math.min(99, v));

      for (let attempt = 0; attempt < 4; attempt++) {
        for (const [dx, dy] of offsets) {
          AtImageView.clickAt(AtImageView.percToX(clamp(xPerc + dx)), AtImageView.percToY(clamp(yPerc + dy)));
          I.waitTicks(1);
          transformerVisible = await AtImageView.isTransformerExist();
          if (transformerVisible) return;
        }
        await AtImageView.lookForStage();
      }

      assert.strictEqual(transformerVisible, true, message);
    };

    const params = {
      config,
      data: { image: IMAGE },
      annotations: [
        {
          id: "1000",
          result: [
            {
              original_width: 2242,
              original_height: 2802,
              image_rotation: 0,
              value: {
                x: 88.5670731707317,
                y: 88.3130081300813,
                width: 10.645325203252034,
                height: 11.016260162601629,
                rotation: 0,
              },
              id: "Nrzdt6xVq1",
              from_name: "rect",
              to_name: "img",
              type: "rectangle",
              origin: "manual",
            },
            {
              original_width: 2242,
              original_height: 2802,
              image_rotation: 0,
              value: {
                x: 68.75,
                y: 68.78556910569105,
                width: 6.250000000000001,
                height: 6.25,
                rotation: 0,
              },
              id: "S_q7c7DTU4",
              from_name: "rect",
              to_name: "img",
              type: "rectangle",
              origin: "manual",
            },
          ],
        },
      ],
    };

    LabelStudio.setFeatureFlags({
      fflag_fix_front_dev_3377_image_regions_shift_on_resize_280922_short: true,
    });

    I.resizeWindow(1440, 900);
    I.amOnPage("/");
    LabelStudio.init(params);
    LabelStudio.waitForObjectsReady();
    await waitForLoadedRegions(2);

    await AtImageView.lookForStage();

    AtImageView.selectPanTool();

    I.say("Zoom into the first region");
    for (let k = 0; k < 3; k++) {
      I.click("[aria-label='zoom-in']");
      AtImageView.drawByDrag(
        AtImageView.percToX(95),
        AtImageView.percToY(95),
        -AtImageView.percToX(90),
        -AtImageView.percToY(90),
      );
    }

    AtImageView.selectMoveTool();

    I.say("Check that there is a region around the center of visible area");
    await clickAndCheckTransformer(50, 50, "Expected region near center to stay selectable after zoom");
    I.pressKey("U");

    await AtImageView.lookForStage();

    I.say("Check that there is a region around the center after stage refresh");
    await clickAndCheckTransformer(50, 50, "Expected region near center to stay selectable after stage refresh");
    I.pressKey("U");

    I.say("Resize viewport and check selection near center again");
    I.resizeWindow(1200, 780);
    await AtImageView.lookForStage();

    await clickAndCheckTransformer(50, 50, "Expected region near center after first resize");
    I.pressKey("U");

    I.resizeWindow(1600, 900);
    await AtImageView.lookForStage();

    await clickAndCheckTransformer(50, 50, "Expected region near center after second resize");
    I.pressKey("U");

    I.say("Reset changes");
    I.resizeWindow(1440, 900);
    I.amOnPage("/");
    LabelStudio.init(params);
    LabelStudio.waitForObjectsReady();
    await waitForLoadedRegions(2);
    await AtImageView.lookForStage();
    AtImageView.selectPanTool();

    I.say("Zoom into the second region");
    for (let k = 0; k < 3; k++) {
      I.click("[aria-label='zoom-in']");
      AtImageView.drawByDrag(
        AtImageView.percToX(75),
        AtImageView.percToY(75),
        -AtImageView.percToX(25),
        -AtImageView.percToY(25),
      );
    }

    AtImageView.selectMoveTool();

    I.say("Check that there is a region around the center after reset and zoom");
    await clickAndCheckTransformer(50, 50, "Expected region near center to be selectable after reset and zoom");
    I.pressKey("U");

    await AtImageView.lookForStage();

    I.say("Check that the region is still around the center after refresh");
    await clickAndCheckTransformer(50, 50, "Expected region near center to persist after second stage refresh");
    I.pressKey("U");

    I.say("Check that the region is still around the center after resize sequence");
    I.resizeWindow(1280, 820);
    await AtImageView.lookForStage();
    await clickAndCheckTransformer(50, 50, "Expected region near center after third resize");
    I.pressKey("U");

    I.resizeWindow(1680, 980);
    await AtImageView.lookForStage();
    await clickAndCheckTransformer(50, 50, "Expected region near center after fourth resize");
    I.pressKey("U");
  },
);

Scenario(
  "Keeping the zoom center for different image sizes and scaling algorithms",
  async ({ I, LabelStudio, AtImageView, AtPanels }) => {
    const AtOutlinerPanel = AtPanels.usePanel(AtPanels.PANEL.OUTLINER);
    const strokecolor = "rgb(0,111,222)";

    const keyPointBeSelected = async () => {
      const currentStokeColor = await I.executeScript(getStrokeColor);
      const colorIsChanged = currentStokeColor !== strokecolor;

      assert.strictEqual(colorIsChanged, true, "Stroke color must be changed if we are able to select keypoint");
    };

    const params = {
      config: `
  <View>
    <Image name="img" value="$image" zoomby="8"/>
    <KeyPoint name="point" toName="img" strokecolor="${strokecolor}" />
    <Rectangle name="rect" toName="img"/>
  </View>`,
      annotations: [
        {
          id: "1000",
          result: [],
        },
      ],
    };

    LabelStudio.setFeatureFlags({
      fflag_fix_front_dev_3377_image_regions_shift_on_resize_280922_short: true,
    });

    for (const [width, height] of [
      [2242, 2802],
      [768, 576],
    ]) {
      I.amOnPage("/");
      const imageUrl = await I.executeScript(Helpers.generateImageUrl, { width, height });

      LabelStudio.init({
        ...params,
        data: { image: imageUrl },
      });
      LabelStudio.waitForObjectsReady();

      AtImageView.selectPanTool();
      I.click("[aria-label='zoom-in']");
      await AtImageView.lookForStage();
      AtImageView.drawByDrag(
        AtImageView.percToX(75),
        AtImageView.percToY(25),
        -AtImageView.percToX(25),
        AtImageView.percToY(25),
      );

      I.say("Draw a point at the center of visible area");
      I.pressKey("K");
      AtImageView.drawByClick(AtImageView.percToX(50), AtImageView.percToY(50));

      await AtImageView.lookForStage();

      I.say("Check that the region is still at the center of visible area");
      AtImageView.clickAt(AtImageView.percToX(50), AtImageView.percToY(50));
      await keyPointBeSelected();
      I.pressKey("U");

      I.say("Collapse the outliner panel");
      AtOutlinerPanel.collapsePanel();
      await AtImageView.lookForStage();

      I.say("Check that the region is still at the center of visible area");
      AtImageView.clickAt(AtImageView.percToX(50), AtImageView.percToY(50));
      await keyPointBeSelected();
      I.pressKey("U");

      AtOutlinerPanel.expandPanel();
    }
  },
);
