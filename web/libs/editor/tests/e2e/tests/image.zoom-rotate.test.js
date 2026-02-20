const { serialize } = require("./helpers");

const assert = require("assert");

Feature("Zooming and rotating");

const IMAGE = "/public/files/images/nick-owuor-unsplash.jpg";

const BLUEVIOLET = {
  color: "#8A2BE2",
  rgbArray: [138, 43, 226],
};
const getConfigWithShape = (shape, props = "") => `
  <View>
    <Image name="img" value="$image" zoom="true" zoomBy="1.5" zoomControl="true" rotateControl="true"></Image>
    <${shape}Labels ${props} name="tag" toName="img">
        <Label value="Test" background="${BLUEVIOLET.color}"></Label>
    </${shape}Labels>
  </View>`;

const hScaleCoords = ([x, y], w, h) => {
  const ratio = w / h;

  return [x * ratio, y * ratio];
};
const rotateCoords = (point, degree, w, h) => {
  const [x, y] = point;

  if (!degree) return point;

  degree = (360 + degree) % 360;
  if (degree === 90) return hScaleCoords([h - y - 1, x], w, h);
  if (degree === 270) return hScaleCoords([y, w - x - 1], w, h);
  if (Math.abs(degree) === 180) return [w - x - 1, h - y - 1];
  return [x, y];
};

const shapes = [
  {
    shape: "KeyPoint",
    props: 'strokeWidth="5"',
    action: "clickKonva",
    regions: [
      {
        params: [100, 100],
      },
      {
        params: [200, 100],
      },
    ],
  },
  {
    shape: "Polygon",
    action: "clickPolygonPointsKonva",
    regions: [
      {
        params: [
          [
            [95, 95],
            [95, 105],
            [105, 105],
            [105, 95],
          ],
        ],
      },
      {
        params: [
          [
            [400, 10],
            [400, 90],
            [370, 30],
            [300, 10],
          ],
        ],
      },
    ],
  },
  {
    shape: "Rectangle",
    action: "dragKonva",
    regions: [
      {
        params: [95, 95, 10, 10],
      },
      {
        params: [400, 350, -50, -50],
      },
    ],
  },
  {
    shape: "Ellipse",
    action: "dragKonva",
    regions: [
      {
        params: [100, 100, 10, 10],
      },
      {
        params: [230, 300, -50, -30],
      },
    ],
  },
];
const shapesTable = new DataTable(["shape", "props", "action", "regions"]);

shapes.forEach(({ shape, props = "", action, regions }) => {
  shapesTable.add([shape, props, action, regions]);
});

Before(async ({ LabelStudio }) => {
  LabelStudio.setFeatureFlags({
    fflag_feat_front_optic_1479_improve_image_tag_memory_usage_short: true,
  });
});

Data(shapesTable).Scenario("Simple rotation", async ({ I, LabelStudio, AtImageView, AtOutliner, current }) => {
  const config = getConfigWithShape(current.shape, current.props);

  const params = {
    config,
    data: { image: IMAGE },
  };

  I.amOnPage("/");
  LabelStudio.init(params);
  LabelStudio.waitForObjectsReady();
  await AtImageView.lookForStage();
  I.waitForInvisible(".lsf-image-progress", 30);
  AtOutliner.seeRegions(0);
  const canvasSize = await AtImageView.getCanvasSize();

  for (const region of current.regions) {
    I.pressKey(["u"]);
    I.pressKey("1");
    AtImageView[current.action](...region.params);
  }
  const standard = await I.executeScript(serialize);
  const rotationQueue = ["right", "right", "right", "right", "left", "left", "left", "left"];
  let degree = 0;
  let hasPixel = await AtImageView.hasPixelColor(100, 100, BLUEVIOLET.rgbArray);

  assert.equal(hasPixel, true);
  for (const rotate of rotationQueue) {
    I.click(locate(`[aria-label='rotate-${rotate}']`));
    degree += rotate === "right" ? 90 : -90;
    hasPixel = await AtImageView.hasPixelColor(
      ...rotateCoords([100, 100], degree, canvasSize.width, canvasSize.height).map(Math.round),
      BLUEVIOLET.rgbArray,
    );
    assert.strictEqual(hasPixel, true);
    const result = await I.executeScript(serialize);

    for (let i = 0; i < standard.length; i++) {
      assert.deepEqual(standard[i].result, result[i].result);
    }
  }
});

Data(shapesTable).Scenario("Rotate zoomed", async ({ I, LabelStudio, AtImageView, AtOutliner, current }) => {
  const params = {
    config: getConfigWithShape(current.shape, current.props),
    data: { image: IMAGE },
  };

  I.amOnPage("/");
  LabelStudio.init(params);
  LabelStudio.waitForObjectsReady();
  await AtImageView.lookForStage();
  I.waitForInvisible(".lsf-image-progress", 30);
  AtOutliner.seeRegions(0);
  const canvasSize = await AtImageView.getCanvasSize();

  for (const region of current.regions) {
    I.pressKey(["u"]);
    I.pressKey("1");
    AtImageView[current.action](...region.params);
  }
  const rotationQueue = ["right", "right", "right", "right", "left", "left", "left", "left"];
  let degree = 0;
  const ZOOM = 3;

  AtImageView.setZoom(ZOOM, -100 * ZOOM, -100 * ZOOM);
  let hasPixel = await AtImageView.hasPixelColor(1, 1, BLUEVIOLET.rgbArray);

  assert.strictEqual(hasPixel, true, "Must have pixel before rotation");
  for (const rotate of rotationQueue) {
    I.click(locate(`[aria-label='rotate-${rotate}']`));
    degree += rotate === "right" ? 90 : -90;
    hasPixel = await AtImageView.hasPixelColor(
      ...rotateCoords([1, 1], degree, canvasSize.width, canvasSize.height).map(Math.round),
      BLUEVIOLET.rgbArray,
    );

    assert.strictEqual(hasPixel, true, `Must have pixel after rotation [${degree}deg]`);
  }
});

const windowSizesTable = new DataTable(["width", "height"]);

windowSizesTable.add([1280, 720]);
windowSizesTable.add([1920, 1080]);
windowSizesTable.add([800, 480]);
windowSizesTable.add([1017, 970]);

Data(windowSizesTable).Scenario(
  "Rotation with different window sizes",
  async ({ I, LabelStudio, AtImageView, AtOutliner, current }) => {
    const config = getConfigWithShape("Rectangle");

    const params = {
      config,
      data: { image: IMAGE },
    };

    I.amOnPage("/");
    I.resizeWindow(current.width, current.height);
    LabelStudio.init(params);
    LabelStudio.waitForObjectsReady();
    await AtImageView.lookForStage();
    I.waitForInvisible(".lsf-image-progress", 30);
    I.waitTicks(3);
    await AtImageView.waitForCanvasSizeSync();
    AtOutliner.seeRegions(0);
    const canvasSize = await AtImageView.getCanvasSize();
    const imageSize = await AtImageView.getImageFrameSize();
    const rotationQueue = ["right", "right", "right", "right", "left", "left", "left", "left"];

    const canvasToImageTolerance = 36;
    const waitForCanvasImageSync = async (stage) => {
      let widthDiff = Number.POSITIVE_INFINITY;
      let heightDiff = Number.POSITIVE_INFINITY;

      for (let attempt = 0; attempt < 8; attempt++) {
        await AtImageView.waitForCanvasSizeSync();
        const currentCanvasSize = await AtImageView.getCanvasSize();
        const currentImageSize = await AtImageView.getImageFrameSize();

        widthDiff = Math.abs(currentCanvasSize.width - currentImageSize.width);
        heightDiff = Math.abs(currentCanvasSize.height - currentImageSize.height);

        if (widthDiff <= canvasToImageTolerance && heightDiff <= canvasToImageTolerance) return;

        I.waitTicks(1);
      }

      assert(
        widthDiff <= canvasToImageTolerance,
        `[${stage}] width diff ${widthDiff} exceeds tolerance ${canvasToImageTolerance}`,
      );
      assert(
        heightDiff <= canvasToImageTolerance,
        `[${stage}] height diff ${heightDiff} exceeds tolerance ${canvasToImageTolerance}`,
      );
    };

    assert(Math.abs(canvasSize.width - imageSize.width) <= canvasToImageTolerance);
    assert(Math.abs(canvasSize.height - imageSize.height) <= canvasToImageTolerance);
    for (const rotate of rotationQueue) {
      I.click(locate(`[aria-label='rotate-${rotate}']`));
      await waitForCanvasImageSync(`rotate-${rotate}-${current.width}x${current.height}`);
    }
  },
);

const twoColumnsConfigs = [
  `<View>
    <View style="display:flex;align-items:start;gap:8px;flex-direction:{{direction}}">
        <RectangleLabels name="label" toName="image" showInline="{{showInline}}">
            <Label value="Label 1" background="#2C7873"/>
            <Label value="Label 2" background="#7232F2"/>
        </RectangleLabels>
        <Image name="image" value="$image" zoom="true" rotateControl="true"/>
    </View>
</View>`,
  `<View>
    <View style="display:flex;align-items:start;gap:8px;flex-direction:{{direction}}">
        <RectangleLabels name="label" toName="image" showInline="{{showInline}}">
            <Label value="Label 1" background="#2C7873"/>
            <Label value="Label 2" background="#7232F2"/>
        </RectangleLabels>
        <View style="flex: 100 0 1%; width: 100%">
            <Image name="image" value="$image" zoom="true" rotateControl="true"/>
        </View>
    </View>
</View>`,
];

const layoutVariations = new DataTable(["config", "inline", "reversed"]);

twoColumnsConfigs.forEach((config) => {
  for (const inline of [true, false]) {
    for (const reversed of [true, false]) {
      layoutVariations.add([config, inline, reversed]);
    }
  }
});

const compareSize = async (I, AtImageView, message1, message2, tolerance = 3) => {
  let canvasWidth = Number.NaN;
  let canvasHeight = Number.NaN;
  let imageWidth = Number.NaN;
  let imageHeight = Number.NaN;
  let widthDiff = Number.POSITIVE_INFINITY;
  let heightDiff = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < 10; attempt++) {
    await AtImageView.waitForCanvasSizeSync();
    const canvasSize = await AtImageView.getCanvasSize();
    const imageSize = await AtImageView.getImageFrameSize();

    canvasWidth = canvasSize.width;
    canvasHeight = canvasSize.height;
    imageWidth = imageSize.width;
    imageHeight = imageSize.height;
    widthDiff = Math.abs(canvasWidth - imageWidth);
    heightDiff = Math.abs(canvasHeight - imageHeight);

    if (widthDiff <= tolerance && heightDiff <= tolerance) break;
    I.waitTicks(1);
  }

  const widthMessage = `[${message2}] Check width: [${[canvasWidth, imageWidth]}], diff=${widthDiff}, tolerance=${tolerance}`;
  const heightMessage = `[${message2}] Check height: [${[canvasHeight, imageHeight]}], diff=${heightDiff}, tolerance=${tolerance}`;

  I.say(`${message1} [stage: ${canvasWidth}x${canvasHeight}, image: ${imageWidth}x${imageHeight}]`);
  assert(widthDiff <= tolerance, widthMessage);
  assert(heightDiff <= tolerance, heightMessage);
};

Data(layoutVariations).Scenario(
  "Rotation in the two columns template",
  async ({ I, LabelStudio, AtImageView, current }) => {
    const waitForLoadedRegions = async (count = 1) => {
      await I.waitForFunction(
        (expected) => (window.Htx?.annotationStore?.selected?.regions?.length ?? 0) >= expected,
        [count],
        10,
      );
    };

    I.amOnPage("/");

    const { config, inline, reversed } = current;

    const direction = (inline ? "column" : "row") + (reversed ? "-reverse" : "");
    const resultConfig = config.replace("{{direction}}", direction).replace("{{showInline}}", `${inline}`);
    const params = {
      config: resultConfig,
      data: { image: IMAGE },
      annotations: [
        {
          id: "rotations",
          result: [
            // The region just for canvas size visually indication
            {
              from_name: "label",
              id: "EUsEHxTyrv",
              image_rotation: 0,
              origin: "manual",
              original_height: 2802,
              original_width: 2242,
              to_name: "image",
              type: "rectanglelabels",
              value: {
                height: 100,
                labels: ["Label 2"],
                rotation: 0,
                width: 100,
                x: 0,
                y: 0,
              },
            },
          ],
        },
      ],
    };

    I.say(`Two columns [config: ${twoColumnsConfigs.indexOf(config)}] [${direction}]`);

    LabelStudio.init(params);
    LabelStudio.waitForObjectsReady();
    await AtImageView.lookForStage();
    I.waitForInvisible(".lsf-image-progress", 30);
    await waitForLoadedRegions(1);

    I.click(locate("[aria-label='rotate-right']"));
    await waitForLoadedRegions(1);
    await AtImageView.waitForCanvasSizeSync();
    await compareSize(I, AtImageView, "Dimensions must be equal in landscape", "landscape, rotated", 12);

    I.say("Change to vertical layout");
    I.executeScript(() => {
      window.Htx.settings.toggleBottomSP();
    });
    I.waitTicks(5);
    await AtImageView.waitForCanvasSizeSync();

    await waitForLoadedRegions(1);
    await compareSize(I, AtImageView, "Dimensions must be equal in portrait", "portrait", 24);

    I.click(locate("[aria-label='rotate-right']"));
    await waitForLoadedRegions(1);
    await AtImageView.waitForCanvasSizeSync();
    await compareSize(I, AtImageView, "Dimensions must be equal after rotation in portrait", "portrait, rotated", 64);
  },
);
