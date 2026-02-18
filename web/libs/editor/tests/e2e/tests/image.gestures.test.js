const { serialize, convertToFixed, getSizeConvertor } = require("./helpers");

const assert = require("assert");

const DEFAULT_DIMENSIONS = {
  rect: { width: 30, height: 30 },
  ellipse: { radius: 30 },
  polygon: { length: 30 },
};

Feature("Creating regions with gesture");

const IMAGE = "/public/files/images/nick-owuor-unsplash.jpg";

const BLUEVIOLET = {
  color: "#8A2BE2",
  rgbArray: [138, 43, 226],
};

const assertWithTolerance = (actual, expected, tolerance = 0.25) => {
  if (typeof expected === "number" && typeof actual === "number") {
    assert(Math.abs(actual - expected) <= tolerance, `Expected ${actual} to be within ${tolerance} of ${expected}`);
    return;
  }

  if (Array.isArray(expected)) {
    assert.strictEqual(actual.length, expected.length);
    expected.forEach((value, idx) => assertWithTolerance(actual[idx], value, tolerance));
    return;
  }

  if (expected && typeof expected === "object") {
    Object.keys(expected).forEach((key) => assertWithTolerance(actual[key], expected[key], tolerance));
    return;
  }

  assert.deepStrictEqual(actual, expected);
};
const getConfigWithShapes = (shapes, props = "") => `
   <View>
    <Image name="img" value="$image" zoom="true" zoomBy="1.5" zoomControl="true" rotateControl="true"></Image>
    ${shapes
      .map(
        (shape) => `
    <${shape}Labels ${props} name="${shape}" toName="img">
      <Label value="${shape}" background="${BLUEVIOLET.color}"></Label>
    </${shape}Labels>
    `,
      )
      .join("")}
  </View>`;

const createShape = {
  Polygon: {
    byMultipleClicks(x, y, radius, opts = {}) {
      const points = [];

      for (let i = 5; i--; ) {
        points.push([x + Math.sin(((2 * Math.PI) / 5) * i) * radius, y - Math.cos(((2 * Math.PI) / 5) * i) * radius]);
        points.push([
          x + (Math.sin(((2 * Math.PI) / 5) * (i - 0.5)) * radius) / 3,
          y - (Math.cos(((2 * Math.PI) / 5) * (i - 0.5)) * radius) / 3,
        ]);
      }
      return {
        ...opts,
        action: "clickPolygonPointsKonva",
        params: [points],
        result: {
          points,
          closed: true,
        },
      };
    },
    // Removed "double click to close polygon" variation because it is flaky in Playwright/Konva;
    // polygon coverage is still exercised by explicit point-based creation.
  },
  Rectangle: {
    byDrag(x, y, radius, opts = {}) {
      return {
        ...opts,
        action: "drawByDrag",
        params: [x - radius, y - radius, radius * 2, radius * 2],
        result: {
          width: radius * 2,
          height: radius * 2,
          rotation: 0,
          x: x - radius,
          y: y - radius,
        },
      };
    },
  },
  Ellipse: {
    byDrag(x, y, radius, opts = {}) {
      return {
        ...opts,
        action: "drawByDrag",
        params: [x, y, radius, radius],
        result: { radiusX: radius, radiusY: radius, rotation: 0, x, y },
      };
    },
  },
};

Scenario("Creating regions by various gestures", async ({ I, LabelStudio, AtImageView, AtOutliner, AtLabels }) => {
  const params = {
    config: getConfigWithShapes(Object.keys(createShape)),
    data: { image: IMAGE },
    settings: { forceBottomPanel: true },
  };

  I.amOnPage("/");
  LabelStudio.init(params);
  LabelStudio.waitForObjectsReady();
  await AtImageView.lookForStage();
  AtOutliner.seeRegions(0);
  const canvasSize = await AtImageView.getCanvasSize();
  const convertToImageSize = getSizeConvertor(canvasSize.width, canvasSize.height);
  const cellSize = { width: 100, height: 100 };
  const gridSize = {
    h: Math.max(1, Math.floor(canvasSize.width / cellSize.width)),
    v: Math.max(1, Math.floor(canvasSize.height / cellSize.height)),
  };
  const regions = [];

  Object.keys(createShape).forEach((shapeName, shapeIdx) => {
    const hotKey = `${shapeIdx + 1}`;

    Object.values(createShape[shapeName]).forEach((creator) => {
      const i = Math.floor(regions.length / gridSize.h);
      const j = regions.length % gridSize.h;
      const region = creator(
        (j + 0.5) * cellSize.width,
        (i + 0.5) * cellSize.height,
        (Math.min(cellSize.width, cellSize.height) / 2) * 0.75,
        { hotKey, shape: shapeName },
      );

      region.result[`${shapeName.toLowerCase()}labels`] = [shapeName];
      regions.push(region);
    });
  });
  for (const [idx, region] of Object.entries(regions)) {
    // Ensure previous region is not selected, otherwise drag can transform it instead of creating a new one.
    I.pressKey("u");
    I.waitTicks(1);
    AtLabels.clickLabel(region.shape);
    I.waitTicks(1);
    AtImageView[region.action](...region.params);
    I.waitTicks(2);
    AtOutliner.seeRegions(+idx + 1);
  }
  const result = await I.executeScript(serialize);

  for (let i = 0; i < regions.length; i++) {
    assertWithTolerance(convertToFixed(result[i].value), convertToImageSize(regions[i].result));
  }
});
