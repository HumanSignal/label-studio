const assert = require("assert");

Feature("Zoomed image displaying").tag("@regress");

const IMAGE = "/public/files/images/nick-owuor-unsplash.jpg";
const config = `
  <View>
    <Image name="img" value="$image" zoomby="2"/>
    <Rectangle name="rect" toName="img"/>
  </View>`;
const ZOOM = 10;
const EPSILON = 0.01;

Scenario("Image displaying precision.", async ({ I, LabelStudio, AtImageView, AtOutliner }) => {
  const params = {
    config,
    data: { image: IMAGE },
  };

  I.amOnPage("/");

  LabelStudio.init(params);
  LabelStudio.waitForObjectsReady();
  AtOutliner.seeRegions(0);

  const { imageTransform } = await I.executeScript(async () => {
    const img = window.document.querySelector('[alt="LS"]');
    const { transform: imageTransform } = window.getComputedStyle(img);

    return {
      imageTransform,
    };
  });

  assert.notStrictEqual(
    imageTransform,
    "none",
    'The initial value of "transform" should not be "none" to ensure that the image is rendered correctly.',
  );

  AtImageView.setZoom(ZOOM, -100 * ZOOM, -100 * ZOOM);

  const { fullStageHeight, imageHeight } = await I.executeScript(async () => {
    const stage = window.Konva.stages[0];
    const img = window.document.querySelector('[alt="LS"]');
    const fullStageHeight = stage.height() * stage.scaleY();
    const imageHeight = img.height;

    return {
      fullStageHeight,
      imageHeight,
    };
  });

  assert(
    Math.abs(fullStageHeight - imageHeight) < EPSILON,
    "Heights of the stage and of the image should be equal for correct displaying.",
  );
});
