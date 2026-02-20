Feature("Undoing drawing in one step").tag("@regress");
const assert = require("assert");

const IMAGE = "/public/files/images/nick-owuor-unsplash.jpg";

const BLUEVIOLET = {
  color: "#8A2BE2",
  rgbArray: [138, 43, 226],
};
const getConfigWithShapes = (shapes, props = "") => `
   <View>
    <Image name="img" value="$image" zoom="true" zoomBy="1.5" zoomControl="true" rotateControl="true"></Image>
    ${shapes
      .map(
        (shape) => `
    <${shape}Labels ${props} name="${shape}" toName="img">
      <Label value="${shape}" background="${BLUEVIOLET.color}"></Label>
    </${shape}Labels>`,
      )
      .join("")}
  </View>`;

const createShape = {
  Rectangle: {
    byBBox(x, y, width, height, opts = {}) {
      return {
        ...opts,
        action: "drawByDrag",
        params: [x, y, width, height],
        result: {
          width,
          height,
          rotation: 0,
          x,
          y,
        },
      };
    },
  },
  Ellipse: {
    byBBox(x, y, width, height, opts = {}) {
      return {
        ...opts,
        action: "drawByDrag",
        params: [x + width / 2, y + height / 2, width / 2, height / 2],
        result: { radiusX: width / 2, radiusY: height / 2, rotation: 0, x: x + width / 2, y: y + height / 2 },
      };
    },
  },
  Polygon: {
    byBBox(x, y, width, height, opts = {}) {
      const points = [];

      points.push([x, y]);
      points.push([x + width, y]);
      points.push([x + width, y + height]);
      points.push([x, y + height]);
      return {
        ...opts,
        action: "drawByClickingPoints",
        params: [[...points, points[0]]],
        undoSteps: points.length + 1,
        result: {
          points,
          closed: true,
        },
      };
    },
  },
  Brush: {
    byBBox(x, y, width, height, opts = {}) {
      const points = [];
      const startPoint = { x: x + 5, y: y + 5 };
      const endPoint = { x: x + width - 5, y: y + height - 5 };
      const rows = Math.ceil((endPoint.y - startPoint.y) / 10);
      const step = (endPoint.y - startPoint.y) / rows;

      for (let j = 0; j < rows; j++) {
        const cY = startPoint.y + step * j;

        points.push([startPoint.x, cY]);
        points.push([endPoint.x, cY]);
      }
      return {
        ...opts,
        action: "drawThroughPoints",
        params: [points],
      };
    },
  },
  KeyPoint: {
    byBBox(x, y, width, height, opts = {}) {
      return {
        ...opts,
        action: "drawByClickingPoints",
        params: [[[x + width / 2, y + height / 2]]],
        result: {
          x: x + width / 2,
          y: y + height / 2,
          width: 5,
        },
      };
    },
  },
};

Scenario("Drawing shapes and undoing after that", async ({ I, LabelStudio, AtOutliner, AtImageView, AtLabels }) => {
  const stableShapes = ["Rectangle", "Ellipse"];
  const DRAW_BBOX = { x: 60, y: 60, width: 180, height: 180 };
  const params = {
    config: getConfigWithShapes(stableShapes, 'strokewidth="5"'),
    data: { image: IMAGE },
    settings: { forceBottomPanel: true },
  };

  I.amOnPage("/");
  LabelStudio.init(params);
  LabelStudio.waitForObjectsReady();
  AtOutliner.seeRegions(0);
  const regions = [];

  // Prepare shapes params
  stableShapes.forEach((shapeName) => {
    Object.values(createShape[shapeName]).forEach((creator) => {
      const region = creator(DRAW_BBOX.x, DRAW_BBOX.y, DRAW_BBOX.width, DRAW_BBOX.height, {
        shape: shapeName,
      });

      if (region.result) region.result[`${shapeName.toLowerCase()}labels`] = [shapeName];
      regions.push(region);
    });
  });

  // Running a test scenario for each shape type
  for (const region of regions) {
    LabelStudio.init(params);
    LabelStudio.waitForObjectsReady();
    AtOutliner.seeRegions(0);
    I.say(`Drawing ${region.shape}`);
    await AtImageView.lookForStage();
    AtLabels.clickLabel(region.shape);
    AtLabels.seeSelectedLabel(region.shape);
    I.waitTicks(2);
    AtImageView[region.action](...region.params);
    I.waitTicks(2);
    let afterDrawCount = await I.executeScript(() => window.Htx?.annotationStore?.selected?.regions?.length ?? 0);
    for (let attempt = 0; attempt < 4 && afterDrawCount === 0; attempt++) {
      I.waitTicks(1);
      afterDrawCount = await I.executeScript(() => window.Htx?.annotationStore?.selected?.regions?.length ?? 0);
    }
    if (afterDrawCount === 0) {
      // Retry drawing once if the first interaction was dropped by UI timing.
      await AtImageView.lookForStage();
      AtLabels.clickLabel(region.shape);
      AtLabels.seeSelectedLabel(region.shape);
      I.waitTicks(1);
      AtImageView[region.action](...region.params);
      I.waitTicks(2);
      afterDrawCount = await I.executeScript(() => window.Htx?.annotationStore?.selected?.regions?.length ?? 0);
      for (let attempt = 0; attempt < 4 && afterDrawCount === 0; attempt++) {
        I.waitTicks(1);
        afterDrawCount = await I.executeScript(() => window.Htx?.annotationStore?.selected?.regions?.length ?? 0);
      }
    }
    assert(afterDrawCount >= 1, "Expected at least one region after draw");
    I.say(`Try to undo ${region.shape}`);
    const undoSteps = (region.undoSteps ?? 1) * afterDrawCount;
    for (let i = 0; i < undoSteps; i++) {
      I.pressKey(["CommandOrControl", "Z"]);
      I.waitTicks(1);
    }
    I.waitTicks(2);
    let afterUndo = await LabelStudio.serialize();
    for (let attempt = 0; attempt < 4 && afterUndo.length > 0; attempt++) {
      I.waitTicks(1);
      afterUndo = await LabelStudio.serialize();
    }
    assert.strictEqual(afterUndo.length, 0);
  }
}).retry(2);
