const { serialize, dragKonva } = require("./helpers");

const assert = require("assert");

Feature("Test Image object");

const config = `
  <View>
    <Image name="img" value="$image"></Image>
    <RectangleLabels name="tag" toName="img">
      <Label value="Planet"></Label>
      <Label value="Moonwalker" background="blue"></Label>
    </RectangleLabels>
  </View>`;

const configEllipse = `
  <View>
    <Image name="img" value="$image"></Image>
    <EllipseLabels name="tag" toName="img">
      <Label value="Planet"></Label>
      <Label value="Moonwalker" background="blue"></Label>
    </EllipseLabels>
  </View>`;

const perRegionConfig = `
  <View>
    <Image name="img" value="$image"></Image>
    <RectangleLabels name="tag" toName="img">
      <Label value="Planet"></Label>
      <Label value="Moonwalker" background="blue"></Label>
    </RectangleLabels>
    <TextArea name="answer" toName="img" perRegion="true" />
  </View>`;

const createRegion = (from_name, type, values) => ({
  id: "Dx_aB91ISN",
  source: "$image",
  from_name,
  to_name: "img",
  type,
  origin: "manual",
  value: {
    height: 10.458911419423693,
    rotation: 0,
    width: 12.4,
    x: 50.8,
    y: 5.869797225186766,
    ...values,
  },
});

const annotationMoonwalker = {
  id: "1001",
  lead_time: 15.053,
  result: [createRegion("tag", "rectanglelabels", { rectanglelabels: ["Moonwalker"] })],
};

// perregion regions have the same id as main region
// and their own data (`text` in this case)
const annotationWithPerRegion = {
  id: "1002",
  result: [annotationMoonwalker.result[0], createRegion("answer", "textarea", { text: ["blah"] })],
};

const image = "/public/files/images/nick-owuor-unsplash.jpg";

Scenario("Check Rect region for Image", async ({ I, LabelStudio, AtImageView, AtOutliner }) => {
  const params = {
    config,
    data: { image },
    annotations: [annotationMoonwalker],
  };

  I.amOnPage("/");
  LabelStudio.init(params);

  LabelStudio.waitForObjectsReady();
  await AtImageView.lookForStage();
  AtOutliner.seeRegions(1);
  // select first and only region
  AtOutliner.clickRegion(1);
  AtOutliner.seeSelectedRegion();

  // click on region's rect on the canvas
  AtImageView.clickAt(330, 80);
  I.waitTicks(1);
  AtOutliner.dontSeeSelectedRegion();
});

Scenario("Image with perRegion tags", async ({ I, LabelStudio, AtOutliner }) => {
  let result;
  const params = {
    config: perRegionConfig,
    data: { image },
    annotations: [annotationWithPerRegion],
  };

  I.amOnPage("/");
  LabelStudio.init(params);

  LabelStudio.waitForObjectsReady();
  AtOutliner.seeRegions(1);
  // select first and only region
  AtOutliner.clickRegion(1);
  AtOutliner.seeSelectedRegion();

  // check that there is deserialized text for this region; and without doubles
  I.seeNumberOfElements(locate("mark").withText("blah"), 1);

  // add another note via textarea
  I.fillField("[name=answer]", "another");
  I.pressKey("Enter");
  // texts are concatenated in the regions list (now with \n, so check separately)
  I.seeNumberOfElements(locate("mark").withText("blah"), 1);
  I.seeNumberOfElements(locate("mark").withText("another"), 1);
  // and there is only one tag with all these texts
  I.seeNumberOfElements("mark", 2);

  // serialize with two textarea regions
  result = await I.executeScript(serialize);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].id, "Dx_aB91ISN");
  assert.strictEqual(result[1].id, "Dx_aB91ISN");
  assert.deepStrictEqual(result[0].value.rectanglelabels, ["Moonwalker"]);
  assert.deepStrictEqual(result[1].value.text, ["blah", "another"]);

  // delete first deserialized text and check that only "another" left
  I.click(locate('[aria-label="Delete Region"]').inside('[data-testid="textarea-region"]'));
  I.dontSeeElement(locate("mark").withText("blah"));
  I.seeElement(locate("mark").withText("another"));

  result = await I.executeScript(serialize);
  assert.strictEqual(result.length, 2);
  assert.deepStrictEqual(result[0].value.rectanglelabels, ["Moonwalker"]);
  assert.deepStrictEqual(result[1].value.text, ["another"]);

  // delete also "another" region
  I.click(locate('[aria-label="Delete Region"]').inside('[data-testid="textarea-region"]'));
  // there are should be no texts left at all
  I.dontSeeElement(locate("mark"));

  result = await I.executeScript(serialize);
  assert.strictEqual(result.length, 1);
  assert.deepStrictEqual(result[0].value.rectanglelabels, ["Moonwalker"]);
});

Scenario("Can't create rectangles outside of canvas", async ({ I, AtLabels, AtOutliner, AtImageView, LabelStudio }) => {
  I.amOnPage("/");

  LabelStudio.init({
    config,
    data: { image },
    task: {
      id: 0,
      annotations: [{ id: 1001, result: [] }],
      predictions: [],
    },
  });

  LabelStudio.waitForObjectsReady();
  await AtImageView.lookForStage();

  const canvasSize = await AtImageView.getCanvasSize();

  const draws = [
    [100, 100, -200, -200],
    [canvasSize.width - 100, 100, 200, -200],
    [100, canvasSize.height - 100, -200, 200],
    [canvasSize.width - 100, canvasSize.height - 100, 200, 200],
  ];

  for (const draw of draws) {
    AtLabels.clickLabel("Planet");
    I.waitTicks(1);
    await I.executeScript(dragKonva, draw);
  }

  AtOutliner.seeRegions(4);

  const result = await LabelStudio.serialize();

  const [r1, r2, r3, r4] = result.map((r) => r.value);

  I.say("First region should be in the corner");
  assert.strictEqual(r1.x, 0);
  assert.equal(r1.y, 0);

  I.say("Second region should be in the corner");
  assert.equal(Math.round(r2.x + r2.width), 100);
  assert.equal(r2.y, 0);

  I.say("Third region should be in the corner");
  assert.equal(r3.x, 0);
  assert.equal(Math.round(r3.y + r3.height), 100);

  I.say("Fourth region should be in the corner");
  assert.equal(Math.round(r4.x + r4.width), 100);
  assert.equal(Math.round(r4.y + r4.height), 100);
});

Scenario("Can't create ellipses outside of canvas", async ({ I, AtLabels, AtOutliner, AtImageView, LabelStudio }) => {
  I.amOnPage("/");

  LabelStudio.init({
    config: configEllipse,
    data: { image },
    task: {
      id: 0,
      annotations: [{ id: 1001, result: [] }],
      predictions: [],
    },
  });

  LabelStudio.waitForObjectsReady();
  await AtImageView.lookForStage();

  const canvasSize = await AtImageView.getCanvasSize();
  const draws = [
    [100, 100, -200, -200],
    [canvasSize.width - 100, 100, 200, -200],
    [100, canvasSize.height - 100, -200, 200],
    [canvasSize.width - 100, canvasSize.height - 100, 200, 200],
  ];

  for (const draw of draws) {
    AtLabels.clickLabel("Planet");
    I.waitTicks(1);
    await I.executeScript(dragKonva, draw);
  }

  AtOutliner.seeRegions(4);

  const result = await LabelStudio.serialize();
  const radiusX = (100 / canvasSize.width) * 100;
  const radiusY = (100 / canvasSize.height) * 100;

  for (let i = 0; i < result.length; i++) {
    const res = result[i].value;

    I.say("Make sure ellipse radius is correct (should be same for all)");
    assert.strictEqual(res.radiusX.toFixed(3), radiusX.toFixed(3));
    assert.strictEqual(res.radiusY.toFixed(3), radiusY.toFixed(3));

    I.say("Make sure that center is in correct spot");
    const [expectedX, expectedY] = [(draws[i][0] / canvasSize.width) * 100, (draws[i][1] / canvasSize.height) * 100];

    assert.strictEqual(res.x.toFixed(3), expectedX.toFixed(3));
    assert.strictEqual(res.y.toFixed(3), expectedY.toFixed(3));
  }
});
