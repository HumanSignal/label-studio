const assert = require('assert');
const Asserts = require('../utils/asserts');
const Helpers = require('./helpers');

Feature('Image transformer');

const IMAGE =
  'https://user.fm/files/v2-901310d5cb3fa90e0616ca10590bacb3/spacexmoon-800x501.jpg';

const annotationEmpty = {
  id: '1000',
  result: [],
};

const getParamsWithShape = (shape, params = '') => ({
  config: `
  <View>
    <Image name="img" value="$image" />
    <${shape} ${params} name="tag" toName="img" />
  </View>`,
  data: { image: IMAGE },
  annotations: [annotationEmpty],
});

const getParamsWithLabels = (shape) => ({
  config: `
  <View>
    <Image name="img" value="$image" />
    <${shape}Labels name="tag" toName="img">
      <Label value="${shape}" background="orange"/>
    </${shape}Labels>
  </View>`,
  data: { image: IMAGE },
  annotations: [annotationEmpty],
});

const shapes = {
  Rectangle: {
    drawAction: 'drawByDrag',
    hasTransformer: true,
    hasRotator: true,
    hasMoveToolTransformer: true,
    hasMultiSelectionTransformer: true,
    hasMultiSelectionRotator: true,
    hotKey: 'r',
    byBBox(x, y, width, height) {
      return {
        params: [x, y, width, height],
        result: { width, height, rotation: 0, x, y },
      };
    },
  },
  Ellipse: {
    drawAction: 'drawByDrag',
    hasTransformer: true,
    hasRotator: true,
    hasMoveToolTransformer: true,
    hasMultiSelectionTransformer: true,
    hasMultiSelectionRotator: true,
    hotKey: 'o',
    byBBox(x, y, width, height) {
      return {
        params: [x + width / 2, y + height / 2, width / 2, height / 2],
        result: { radiusX: width / 2, radiusY: height / 2, rotation: 0, x: x + width / 2, y: y + height / 2 },
      };
    },
  },
  Polygon: {
    drawAction: 'drawByClickingPoints',
    hasTransformer: false,
    hasRotator: false,
    hasMoveToolTransformer: true,
    hasMultiSelectionTransformer: true,
    hasMultiSelectionRotator: false,
    hotKey: 'p',
    byBBox(x, y, width, height) {
      const points = [];

      points.push([x, y]);
      points.push([x + width, y]);
      points.push([x + width / 2, y + height / 2]);
      points.push([x + width, y + height]);
      points.push([x, y + height]);
      return {
        params: [[...points, points[0]]],
        result: {
          points,
        },
      };
    },
  },
  KeyPoint: {
    drawAction: 'clickAt',
    hasTransformer: false,
    hasRotator: false,
    hasMoveToolTransformer: false,
    hasMultiSelectionTransformer: true,
    hasMultiSelectionRotator: false,
    hotKey: 'k',
    params: 'strokeWidth="2"',
    byBBox(x, y, width, height) {
      return {
        params: [x + width / 2, y + height / 2],
        result: {
          x: x + width / 2,
          y: y + height / 2,
          width: 2,
        },
      };
    },
  },
};

function drawShapeByBbox(Shape, x, y, width, height, where) {
  where[Shape.drawAction](...Shape.byBBox(x, y, width, height).params);
}

const shapesTable = new DataTable(['shapeName']);

for (const shapeName of Object.keys(shapes)) {
  shapesTable.add([shapeName]);
}

Data(shapesTable).Scenario('Check transformer existing for different shapes, their amount and modes.', async ({ I, LabelStudio, AtImageView, AtSidebar, current }) => {
  const { shapeName } = current;
  const Shape = shapes[shapeName];

  I.amOnPage('/');
  const bbox1 = {
    x: 100,
    y: 100,
    width: 200,
    height: 200,
  };
  const bbox2 = {
    x: 400,
    y: 100,
    width: 200,
    height: 200,
  };
  const getCenter = bbox => [bbox.x + bbox.width / 2, bbox.y + bbox.height / 2];
  let isTransformerExist;

  LabelStudio.init(getParamsWithLabels(shapeName));
  AtImageView.waitForImage();
  AtSidebar.seeRegions(0);
  await AtImageView.lookForStage();

  // Draw two regions
  I.pressKey('1');
  drawShapeByBbox(Shape, bbox1.x, bbox1.y, bbox1.width, bbox1.height, AtImageView);
  AtSidebar.seeRegions(1);
  I.pressKey('1');
  drawShapeByBbox(Shape, bbox2.x, bbox2.y, bbox2.width, bbox2.height, AtImageView);
  AtSidebar.seeRegions(2);

  // Check that it wasn't a cause to show a transformer
  isTransformerExist = await AtImageView.isTransformerExist();
  assert.strictEqual(isTransformerExist, false);

  // Select the first region
  AtImageView.clickAt(...getCenter(bbox1));
  AtSidebar.seeSelectedRegion();

  // Match if transformer exist with expectations in single selected mode
  isTransformerExist = await AtImageView.isTransformerExist();
  assert.strictEqual(isTransformerExist, Shape.hasTransformer);

  // Match if rotator at transformer exist with expectations in single selected mode
  isTransformerExist = await AtImageView.isRotaterExist();
  assert.strictEqual(isTransformerExist, Shape.hasRotator);

  // Switch to move tool
  I.pressKey('v');

  // Match if rotator at transformer exist with expectations in single selected mode with move tool chosen
  isTransformerExist = await AtImageView.isTransformerExist();
  assert.strictEqual(isTransformerExist, Shape.hasMoveToolTransformer);

  // Deselect the previous selected region
  I.pressKey(['u']);

  // Select 2 regions
  AtImageView.drawThroughPoints([
    [bbox1.x - 5, bbox1.y - 5],
    [bbox2.x + bbox2.width + 5, bbox2.y + bbox2.height + 5],
  ], 'steps', 10);

  // Match if transformer exist with expectations in multiple selected mode
  isTransformerExist = await AtImageView.isTransformerExist();
  assert.strictEqual(isTransformerExist, Shape.hasMultiSelectionTransformer);

  // Match if rotator exist with expectations in multiple selected mode
  isTransformerExist = await AtImageView.isRotaterExist();
  assert.strictEqual(isTransformerExist, Shape.hasMultiSelectionRotator);
});

Data(shapesTable.filter(({ shapeName }) => shapes[shapeName].hasMoveToolTransformer))
  .Scenario('Resizing a single region', async ({ I, LabelStudio, AtImageView, AtSidebar, current }) => {
    const { shapeName } = current;
    const Shape = shapes[shapeName];

    I.amOnPage('/');
    LabelStudio.init(getParamsWithShape(shapeName, Shape.params));
    AtImageView.waitForImage();
    AtSidebar.seeRegions(0);
    await AtImageView.lookForStage();
    const canvasSize = await AtImageView.getCanvasSize();
    const convertToImageSize = Helpers.getSizeConvertor(canvasSize.width, canvasSize.height);

    // Draw a region in bbox {x1:50,y1:50,x2:150,y2:150}
    I.pressKey(Shape.hotKey);
    drawShapeByBbox(Shape, 50, 50, 100, 100, AtImageView);
    AtSidebar.seeRegions(1);

    // Select the shape
    AtImageView.clickAt(100, 100);
    AtSidebar.seeSelectedRegion();

    // Switch to move tool to force appearance of transformer
    I.pressKey('v');
    const isTransformerExist = await AtImageView.isTransformerExist();

    assert.strictEqual(isTransformerExist, true);


    // Transform the shape
    // Move the top anchor up for 50px (limited by image border) => {x1:50,y1:0,x2:150,y2:150}
    AtImageView.drawByDrag(100, 50, 0, -100);
    // Move the left anchor left for 50px (limited by image border) => {x1:0,y1:0,x2:150,y2:150}
    AtImageView.drawByDrag(50, 75, -300, -100);
    // Move the right anchor left for 50px => {x1:0,y1:0,x2:100,y2:150}
    AtImageView.drawByDrag(150, 75, -50, 0);
    // Move the bottom anchor down for 100px => {x1:0,y1:0,x2:100,y2:250}
    AtImageView.drawByDrag(50, 150, 10, 100);
    // Move the right-bottom anchor right for 200px and down for 50px => {x1:0,y1:0,x2:300,y2:300}
    AtImageView.drawByDrag(100, 250, 200, 50);
    // Check resulting sizes
    const rectangleResult = await LabelStudio.serialize();
    const exceptedResult = Shape.byBBox(0, 0, 300, 300).result;

    Asserts.deepEqualWithTolerance(rectangleResult[0].value, convertToImageSize(exceptedResult));
  });

Data(shapesTable.filter(({ shapeName }) => shapes[shapeName].hasMoveToolTransformer))
  .Scenario('Resizing a single region with zoom', async ({ I, LabelStudio, AtImageView, AtSidebar, current }) => {
    const { shapeName } = current;
    const Shape = shapes[shapeName];

    I.amOnPage('/');

    LabelStudio.setFeatureFlags({
      'ff_front_dev_2394_zoomed_transforms_260522_short': true,
    });

    LabelStudio.init(getParamsWithShape(shapeName, Shape.params));
    AtImageView.waitForImage();
    AtSidebar.seeRegions(0);
    await AtImageView.lookForStage();
    const canvasSize = await AtImageView.getCanvasSize();
    const convertToImageSize = Helpers.getSizeConvertor(canvasSize.width, canvasSize.height);

    // Draw a region in bbox {x1:50,y1:50,x2:150,y2:150}
    I.pressKey(Shape.hotKey);
    drawShapeByBbox(Shape, 50, 50, 300, 300, AtImageView);
    AtSidebar.seeRegions(1);

    // Select the shape
    AtImageView.clickAt(100, 100);
    AtSidebar.seeSelectedRegion();

    // Switch to move tool to force appearance of transformer
    I.pressKey('v');
    const isTransformerExist = await AtImageView.isTransformerExist();

    assert.strictEqual(isTransformerExist, true);

    AtImageView.setZoom(3, 0, 0);

    // Transform the shape
    AtImageView.drawByDrag(150, 150, -150, -150);
    I.wait(1);

    AtImageView.drawByDrag(0, 0, -300, -100);
    I.wait(1);

    AtImageView.drawByDrag(0, 0, 150, 150);
    I.wait(1);

    // Check resulting sizes
    const rectangleResult = await LabelStudio.serialize();

    I.wait(10);

    const exceptedResult = Shape.byBBox(50, 50, 300, 300).result;

    Asserts.deepEqualWithTolerance(rectangleResult[0].value, convertToImageSize(exceptedResult), 0);
  });

Data(shapesTable.filter(({ shapeName }) => shapes[shapeName].hasMultiSelectionRotator))
  .Scenario('Simple rotating', async ({ I, LabelStudio, AtImageView, AtSidebar, current }) => {
    const { shapeName } = current;
    const Shape = shapes[shapeName];

    I.amOnPage('/');
    LabelStudio.init(getParamsWithShape(shapeName, Shape.params));
    AtImageView.waitForImage();
    AtSidebar.seeRegions(0);
    await AtImageView.lookForStage();
    const canvasSize = await AtImageView.getCanvasSize();

    // Draw a region in bbox {x1:40%,y1:40%,x2:60%,y2:60%}
    const rectangle = {
      x: canvasSize.width * .4,
      y: canvasSize.height * .4,
      width: canvasSize.width * .2,
      height: canvasSize.height * .2,
    };
    const rectangleCenter = {
      x: rectangle.x + rectangle.width / 2,
      y: rectangle.y + rectangle.height / 2,
    };

    I.pressKey(Shape.hotKey);
    drawShapeByBbox(Shape, rectangle.x, rectangle.y, rectangle.width, rectangle.height, AtImageView);
    AtSidebar.seeRegions(1);


    // Select the shape and check that transformer appears
    AtImageView.clickAt(rectangleCenter.x, rectangleCenter.y);
    AtSidebar.seeSelectedRegion();

    // Switch to move tool to force appearance of transformer
    I.pressKey('v');
    const isTransformerExist = await AtImageView.isTransformerExist();

    assert.strictEqual(isTransformerExist, true);

    // The rotator anchor must be above top anchor by 50 pixels
    const rotatorPosition = {
      x: rectangleCenter.x,
      y: rectangle.y - 50,
    };

    // Rotate for 45 degrees clockwise
    AtImageView.drawThroughPoints(
      [
        [rotatorPosition.x, rotatorPosition.y],
        [rectangleCenter.x + 500, rectangleCenter.y - 500],
      ], 'steps', 5);

    // Check resulting rotation
    const rectangleResult = await LabelStudio.serialize();

    Asserts.deepEqualWithTolerance(Math.round(rectangleResult[0].value.rotation), 45);

  });

Data(shapesTable.filter(({ shapeName }) => shapes[shapeName].hasMultiSelectionRotator))
  .Scenario('Rotating of unrotatable region', async ({ I, LabelStudio, AtImageView, AtSidebar, current }) => {
    const { shapeName } = current;
    const Shape = shapes[shapeName];

    I.amOnPage('/');
    LabelStudio.init(getParamsWithShape(shapeName, Shape.params));
    AtImageView.waitForImage();
    AtSidebar.seeRegions(0);
    await AtImageView.lookForStage();
    const canvasSize = await AtImageView.getCanvasSize();

    // Draw a region which we cannot rotate 'cause of position near the image's border {x1:0,y1:20%,x2:20%,y2:50%}
    const rectangle = {
      x: 0,
      y: canvasSize.height * .2,
      width: canvasSize.width * .2,
      height: canvasSize.height * .3,
    };
    const rectangleCenter = {
      x: rectangle.x + rectangle.width / 2,
      y: rectangle.y + rectangle.height / 2,
    };

    I.pressKey(Shape.hotKey);
    drawShapeByBbox(Shape, rectangle.x, rectangle.y, rectangle.width, rectangle.height, AtImageView);
    AtSidebar.seeRegions(1);

    // Select the shape and check that transformer appears
    AtImageView.clickAt(rectangleCenter.x, rectangleCenter.y);
    AtSidebar.seeSelectedRegion();

    // Switch to move tool to force appearance of transformer
    I.pressKey('v');
    const isTransformerExist = await AtImageView.isTransformerExist();

    assert.strictEqual(isTransformerExist, true);

    // The rotator anchor must be above top anchor by 50 pixels
    const rotatorPosition = {
      x: rectangleCenter.x,
      y: rectangle.y - 50,
    };

    // Rotate for 45 degrees clockwise
    AtImageView.drawByDrag(rotatorPosition.x, rotatorPosition.y, rectangleCenter.y - rotatorPosition.y + 100, -100);

    // Check the region hasn't been rotated
    const rectangleResult = await LabelStudio.serialize();

    Asserts.deepEqualWithTolerance(rectangleResult[0].value.rotation, 0);
  });

Data(shapesTable.filter(({ shapeName }) => shapes[shapeName].hasMultiSelectionRotator))
  .Scenario('Broke the limits with rotation', async ({ I, LabelStudio, AtImageView, AtSidebar, current }) => {
    const { shapeName } = current;
    const Shape = shapes[shapeName];

    I.amOnPage('/');
    LabelStudio.init(getParamsWithShape(shapeName, Shape.params));
    AtImageView.waitForImage();
    AtSidebar.seeRegions(0);
    await AtImageView.lookForStage();
    const canvasSize = await AtImageView.getCanvasSize();

    {
      // Draw a region which have limitation at rotating by bbox {x1:5,y1:100,x2:305,y2:350}
      const rectangle = {
        x: 5,
        y: 100,
        width: 300,
        height: 300,
      };
      const rectangleCenter = {
        x: rectangle.x + rectangle.width / 2,
        y: rectangle.y + rectangle.height / 2,
      };

      I.pressKey(Shape.hotKey);
      drawShapeByBbox(Shape, rectangle.x, rectangle.y, rectangle.width, rectangle.height, AtImageView);
      AtSidebar.seeRegions(1);

      // Select the shape and check that transformer appears
      AtImageView.clickAt(rectangleCenter.x, rectangleCenter.y);
      AtSidebar.seeSelectedRegion();

      // Switch to move tool to force appearance of transformer
      I.pressKey('v');
      const isTransformerExist = await AtImageView.isTransformerExist();

      assert.strictEqual(isTransformerExist, true);

      // The rotator anchor must be above top anchor by 50 pixels
      const rotatorPosition = {
        x: rectangleCenter.x,
        y: rectangle.y - 50,
      };

      // Rotate for 45 degrees clockwise
      AtImageView.drawThroughPoints([
        [rotatorPosition.x, rotatorPosition.y],
        [rectangleCenter.x + 500, rectangleCenter.y - 500],
      ], 'steps', 200);

      // Check that we cannot rotate it like this
      let rectangleResult = await LabelStudio.serialize();

      assert.notStrictEqual(
        Math.round(rectangleResult[0].value.rotation),
        0,
        'Region must be rotated',
      );
      assert.notStrictEqual(
        Math.round(rectangleResult[0].value.rotation),
        45,
        'Angle must not be 45 degrees',
      );

      // Undo changes
      I.pressKey(['CommandOrControl', 'z']);

      // Rotate for 90 degrees clockwise instead
      AtImageView.drawThroughPoints([
        [rotatorPosition.x, rotatorPosition.y],
        [rectangle.x + rectangle.width + 100, rectangleCenter.y],
        [rectangle.x + rectangle.width + 200, rectangleCenter.y],
      ], 'steps', 200);

      // Check the resulted rotation
      rectangleResult = await LabelStudio.serialize();

      Asserts.deepEqualWithTolerance(rectangleResult[0].value.rotation, 90, 'Angle must be 90 degrees');
      // remove region
      I.pressKey('Backspace');
    }

    I.say('Check that it works same way with right border');

    {
      // Draw a region which have limitation at rotating by bbox {x1:100% - 305,y1:100,x2:100% - 5,y2:350}
      const rectangle = {
        x: canvasSize.width - 305,
        y: 100,
        width: 300,
        height: 300,
      };
      const rectangleCenter = {
        x: rectangle.x + rectangle.width / 2,
        y: rectangle.y + rectangle.height / 2,
      };

      I.pressKey(Shape.hotKey);
      drawShapeByBbox(Shape, rectangle.x, rectangle.y, rectangle.width, rectangle.height, AtImageView);
      AtSidebar.seeRegions(1);

      // Select the shape and check that transformer appears
      AtImageView.clickAt(rectangleCenter.x, rectangleCenter.y);
      AtSidebar.seeSelectedRegion();

      // Switch to move tool to force appearance of transformer
      I.pressKey('v');
      const isTransformerExist = await AtImageView.isTransformerExist();

      assert.strictEqual(isTransformerExist, true);

      // The rotator anchor must be above top anchor by 50 pixels
      const rotatorPosition = {
        x: rectangleCenter.x,
        y: rectangle.y - 50,
      };

      // Rotate for 45 degrees clockwise
      AtImageView.drawThroughPoints([
        [rotatorPosition.x, rotatorPosition.y],
        [rectangleCenter.x + 500, rectangleCenter.y - 500],
      ], 'steps', 200);

      // Check the resulted rotation
      let rectangleResult = await LabelStudio.serialize();

      assert.notStrictEqual(Math.round(rectangleResult[0].value.rotation), 0);
      assert.notStrictEqual(Math.round(rectangleResult[0].value.rotation), 45);

      // Undo changes
      I.pressKey(['CommandOrControl', 'z']);

      // Rotate for 90 degrees clockwise instead
      AtImageView.drawThroughPoints([
        [rotatorPosition.x, rotatorPosition.y],
        [rectangle.x + rectangle.width + 100, rectangleCenter.y],
        [rectangle.x + rectangle.width + 200, rectangleCenter.y],
      ], 'steps', 200);

      // Check that we cannot rotate it like this
      rectangleResult = await LabelStudio.serialize();

      Asserts.deepEqualWithTolerance(rectangleResult[0].value.rotation, 90);
    }

  });

Data(shapesTable.filter(({ shapeName }) => shapes[shapeName].hasMultiSelectionRotator))
  .Scenario('Check the initial rotation of transformer for the single region', async ({ I, LabelStudio, AtImageView, AtSidebar, current }) => {
    const { shapeName } = current;
    const Shape = shapes[shapeName];

    I.amOnPage('/');
    LabelStudio.init(getParamsWithShape(shapeName, Shape.params));
    AtImageView.waitForImage();
    AtSidebar.seeRegions(0);
    await AtImageView.lookForStage();

    const bbox = {
      x: 100,
      y: 100,
      width: 100,
      height: 100,
    };
    const bboxCenter = {
      x: bbox.x + bbox.width / 2,
      y: bbox.y + bbox.height / 2,
    };

    // Draw a region
    I.pressKey(Shape.hotKey);
    drawShapeByBbox(Shape, bbox.x, bbox.y, bbox.width, bbox.height, AtImageView);
    AtSidebar.seeRegions(1);

    // Select it
    AtImageView.clickAt(bboxCenter.x, bboxCenter.y);
    AtSidebar.seeSelectedRegion();

    // Switch to move tool to force appearance of transformer
    I.pressKey('v');
    const isTransformerExist = await AtImageView.isTransformerExist();

    assert.strictEqual(isTransformerExist, true);

    // The rotator anchor must be above top anchor by 50 pixels
    let rotatorPosition = {
      x: bboxCenter.x,
      y: bbox.y - 50,
    };

    // Rotate for 90 degrees clockwise
    AtImageView.drawThroughPoints([
      [rotatorPosition.x, rotatorPosition.y],
      [bbox.x + bbox.width + 100, bboxCenter.y],
      [bbox.x + bbox.width + 200, bboxCenter.y],
    ], 'steps', 10);

    // Unselect current region
    I.pressKey('u');
    AtSidebar.dontSeeSelectedRegion();

    // Select it again
    AtImageView.clickAt(bboxCenter.x, bboxCenter.y);
    AtSidebar.seeSelectedRegion();

    // The trick is that we turn it further, based on the assumption that transformer appears in rotated state on region selection
    // So let's try to rotate it
    // The rotator anchor must be to the right of the right anchor by 50 pixels

    rotatorPosition = {
      x: bbox.x + bbox.width + 50,
      y: bboxCenter.y,
    };

    // Rotate for 90 degrees clockwise once again
    AtImageView.drawThroughPoints([
      [rotatorPosition.x, rotatorPosition.y],
      [bboxCenter.x, bbox.y + bbox.height + 100],
      [bboxCenter.x, bbox.y + bbox.height + 200],
    ], 'steps', 10);

    // Check that region has been rotated for 180 degrees
    const rectangleResult = await LabelStudio.serialize();

    Asserts.deepEqualWithTolerance(rectangleResult[0].value.rotation, 180);
  });

Data(shapesTable.filter(({ shapeName }) => shapes[shapeName].hasMultiSelectionRotator))
  .Scenario('Check the initial rotation of transformer for the couple of regions', async ({ I, LabelStudio, AtImageView, AtSidebar, current }) => {
    const { shapeName } = current;
    const Shape = shapes[shapeName];

    I.amOnPage('/');
    LabelStudio.init(getParamsWithShape(shapeName, Shape.params));
    AtImageView.waitForImage();
    AtSidebar.seeRegions(0);
    await AtImageView.lookForStage();

    const bbox1 = {
      x: 100,
      y: 100,
      width: 40,
      height: 40,
    };

    const bbox2 = {
      x: 160,
      y: 160,
      width: 40,
      height: 40,
    };

    const transformerBbox = {
      x: bbox1.x,
      y: bbox1.y,
      width: bbox2.x + bbox2.width - bbox1.x,
      height: bbox2.y + bbox2.height - bbox1.y,
    };
    const transformerBboxCenter = {
      x: transformerBbox.x + transformerBbox.width / 2,
      y: transformerBbox.y + transformerBbox.height / 2,
    };

    // Draw the first region
    I.pressKey(Shape.hotKey);
    drawShapeByBbox(Shape, bbox1.x, bbox1.y, bbox1.width, bbox1.height, AtImageView);
    AtSidebar.seeRegions(1);

    // Draw the second region
    I.pressKey(Shape.hotKey);
    drawShapeByBbox(Shape, bbox2.x, bbox2.y, bbox2.width, bbox2.height, AtImageView);
    AtSidebar.seeRegions(2);

    // Switch to move tool and select them
    I.pressKey('v');
    AtImageView.drawThroughPoints([
      [transformerBbox.x - 20, transformerBbox.y - 20],
      [transformerBbox.x + transformerBbox.width + 20, transformerBbox.y + transformerBbox.height + 20],
    ]);
    AtSidebar.seeSelectedRegion();

    // The rotator anchor must be above top anchor by 50 pixels
    const rotatorPosition = {
      x: transformerBboxCenter.x,
      y: transformerBbox.y - 50,
    };

    // Rotate for 180 degrees clockwise
    AtImageView.drawThroughPoints([
      [rotatorPosition.x, rotatorPosition.y],
      [transformerBboxCenter.x + 100, transformerBboxCenter.y + 100],
      [transformerBboxCenter.x, transformerBboxCenter.y + 100],
      [transformerBboxCenter.x, transformerBboxCenter.y + 200],
    ], 'steps', 10);

    // Unselect current regions
    I.pressKey('u');
    AtSidebar.dontSeeSelectedRegion();

    // Select them again
    AtImageView.drawThroughPoints([
      [transformerBbox.x - 20, transformerBbox.y - 20],
      [transformerBbox.x + transformerBbox.width + 20, transformerBbox.y + transformerBbox.height + 20],
    ]);
    AtSidebar.seeSelectedRegion();

    // So we have couple of rotated regions, let's check if rotates still appears above the top anchor

    // Rotate for 90 degrees clockwise
    AtImageView.drawThroughPoints([
      [rotatorPosition.x, rotatorPosition.y],
      [transformerBboxCenter.x + 100, transformerBboxCenter.y],
      [transformerBboxCenter.x + 200, transformerBboxCenter.y],
    ], 'steps', 10);

    // Check that region has been rotated for (180 + 90) degrees
    const rectangleResult = await LabelStudio.serialize();

    Asserts.deepEqualWithTolerance(rectangleResult[0].value.rotation, 180 + 90);
  });

// KeyPoints are transformed unpredictable so for now just skip them
Data(shapesTable.filter(({ shapeName }) => shapes[shapeName].hasMultiSelectionTransformer && shapeName !== 'KeyPoint'))
  .Scenario('Transforming of multiple regions', async ({ I, LabelStudio, AtImageView, AtSidebar, current }) => {
    const { shapeName } = current;
    const Shape = shapes[shapeName];

    I.amOnPage('/');
    LabelStudio.init(getParamsWithShape(shapeName, Shape.params));
    AtImageView.waitForImage();
    AtSidebar.seeRegions(0);
    await AtImageView.lookForStage();
    const canvasSize = await AtImageView.getCanvasSize();
    const convertToImageSize = Helpers.getSizeConvertor(canvasSize.width, canvasSize.height);

    const bbox1 = {
      x: 100,
      y: 100,
      width: 50,
      height: 50,
    };

    const bbox2 = {
      x: 150,
      y: 150,
      width: 50,
      height: 50,
    };

    const transformerBbox = {
      x: bbox1.x,
      y: bbox1.y,
      width: bbox2.x + bbox2.width - bbox1.x,
      height: bbox2.y + bbox2.height - bbox1.y,
    };
    const transformerBboxCenter = {
      get x() {
        return transformerBbox.x + transformerBbox.width / 2;
      },
      get y() {
        return transformerBbox.y + transformerBbox.height / 2;
      },
    };

    // Draw the first region
    I.pressKey(Shape.hotKey);
    drawShapeByBbox(Shape, bbox1.x, bbox1.y, bbox1.width, bbox1.height, AtImageView);
    AtSidebar.seeRegions(1);

    // Draw the second region
    I.pressKey(Shape.hotKey);
    I.pressKeyDown('Control');
    drawShapeByBbox(Shape, bbox2.x, bbox2.y, bbox2.width, bbox2.height, AtImageView);
    I.pressKeyUp('Control');
    AtSidebar.seeRegions(2);

    // Switch to move tool and select them
    I.pressKey('v');
    AtImageView.drawThroughPoints([
      [transformerBbox.x - 20, transformerBbox.y - 20],
      [transformerBbox.x + transformerBbox.width + 20, transformerBbox.y + transformerBbox.height + 20],
    ]);
    AtSidebar.seeSelectedRegion();
    // Scale the shapes vertically
    AtImageView.drawByDrag(transformerBboxCenter.x, transformerBbox.y + transformerBbox.height, 0, 50);
    transformerBbox.height += 50;
    AtSidebar.seeSelectedRegion();
    // Scale the shapes horizontally
    AtImageView.drawByDrag(transformerBbox.x + transformerBbox.width, transformerBboxCenter.y, 50, 0);
    transformerBbox.width += 50;
    AtSidebar.seeSelectedRegion();
    // Scale the shapes in both directions
    AtImageView.drawByDrag(transformerBbox.x + transformerBbox.width, transformerBbox.y + transformerBbox.height, 50, 50);
    transformerBbox.height += 50;
    transformerBbox.width += 50;
    AtSidebar.seeSelectedRegion();

    // Check resulting sizes
    const rectangleResult = await LabelStudio.serialize();
    const exceptedResult1 = Shape.byBBox(bbox1.x, bbox1.y, bbox1.width + 50, bbox1.height + 50).result;
    const exceptedResult2 = Shape.byBBox(bbox2.x + 50, bbox2.y + 50, bbox2.width + 50, bbox2.height + 50).result;

    Asserts.deepEqualWithTolerance(rectangleResult[0].value, convertToImageSize(exceptedResult1));
    Asserts.deepEqualWithTolerance(rectangleResult[1].value, convertToImageSize(exceptedResult2));
  });

Data(shapesTable.filter(({ shapeName }) => shapes[shapeName].hasMultiSelectionTransformer))
  .Scenario('Move regions by drag', async ({ I, LabelStudio, AtImageView, AtSidebar, current }) => {
    const { shapeName } = current;
    const Shape = shapes[shapeName];

    I.amOnPage('/');
    LabelStudio.init(getParamsWithShape(shapeName, Shape.params));
    AtImageView.waitForImage();
    AtSidebar.seeRegions(0);
    await AtImageView.lookForStage();
    const canvasSize = await AtImageView.getCanvasSize();
    const convertToImageSize = Helpers.getSizeConvertor(canvasSize.width, canvasSize.height);

    const bbox1 = {
      x: 100,
      y: 100,
      width: 20,
      height: 20,
    };
    const bbox1Center = {
      x: bbox1.x + bbox1.width / 2,
      y: bbox1.y + bbox1.height / 2,
    };

    const bbox2 = {
      x: 140,
      y: 140,
      width: 20,
      height: 20,
    };
    const bbox2Center = {
      x: bbox2.x + bbox2.width / 2,
      y: bbox2.y + bbox2.height / 2,
    };

    const transformerBbox = {
      x: bbox1.x,
      y: bbox1.y,
      width: bbox2.x + bbox2.width - bbox1.x,
      height: bbox2.y + bbox2.height - bbox1.y,
    };
    const transformerBboxCenter = {
      x: transformerBbox.x + transformerBbox.width / 2,
      y: transformerBbox.y + transformerBbox.height / 2,
    };

    // Draw the first region
    I.pressKey(Shape.hotKey);
    drawShapeByBbox(Shape, bbox1.x, bbox1.y, bbox1.width, bbox1.height, AtImageView);
    AtSidebar.seeRegions(1);

    // Draw the second region
    I.pressKey(Shape.hotKey);
    drawShapeByBbox(Shape, bbox2.x, bbox2.y, bbox2.width, bbox2.height, AtImageView);
    AtSidebar.seeRegions(2);

    if (shapeName === 'KeyPoint') {
      // Draw more points to get more space in transformer
      I.pressKey(Shape.hotKey);
      drawShapeByBbox(Shape, bbox1.x, bbox1.y, 0, 0, AtImageView);
      AtSidebar.seeRegions(3);

      I.pressKey(Shape.hotKey);
      drawShapeByBbox(Shape, bbox2.x + bbox2.width, bbox2.y + bbox2.height, 0, 0, AtImageView);
      AtSidebar.seeRegions(4);
    }

    // Switch to move tool and select them
    I.pressKey('v');
    AtImageView.drawThroughPoints([
      [transformerBbox.x - 20, transformerBbox.y - 20],
      [transformerBbox.x + transformerBbox.width + 20, transformerBbox.y + transformerBbox.height + 20],
    ]);
    AtSidebar.seeSelectedRegion();

    const dragShapes = (startPoint, shift, rememberShift = true) => {
      AtImageView.drawThroughPoints([
        [startPoint.x, startPoint.y],
        [startPoint.x + shift.x, startPoint.y + shift.y],
        [startPoint.x + shift.x, startPoint.y + shift.y],
      ], 'steps', 10);
      AtSidebar.seeSelectedRegion();

      if (rememberShift) {
        bbox1Center.x += shift.x;
        bbox1Center.y += shift.y;
        bbox2Center.x += shift.x;
        bbox2Center.y += shift.y;
        transformerBboxCenter.x += shift.x;
        transformerBboxCenter.y += shift.y;
      }
    };

    // Drag shapes by holding onto the first region
    dragShapes(bbox1Center, { x: 100, y: 0 });
    // Drag shapes by holding onto the second region
    dragShapes(bbox2Center, { x: 0, y: 100 });
    // Drag shapes by holding onto the transformer background
    dragShapes(transformerBboxCenter, { x: 150, y: 150 }, false);
    // Move back throught history to check that transformer's background moving with it
    I.pressKey(['Control', 'z']);
    // Drag shapes by holding onto the transformer background again
    dragShapes(transformerBboxCenter, { x: 100, y: 100 }, false);


    // Check that dragging was successful
    const rectangleResult = await LabelStudio.serialize();
    const exceptedResult1 = Shape.byBBox(bbox1.x + 200, bbox1.y + 200, bbox1.width, bbox1.height).result;
    const exceptedResult2 = Shape.byBBox(bbox2.x + 200, bbox2.y + 200, bbox2.width, bbox2.height).result;

    Asserts.deepEqualWithTolerance(rectangleResult[0].value, convertToImageSize(exceptedResult1));
    Asserts.deepEqualWithTolerance(rectangleResult[1].value, convertToImageSize(exceptedResult2));
  });

Data(shapesTable.filter(({ shapeName }) => shapes[shapeName].hasMultiSelectionRotator))
  .Scenario('Limitation of dragging a single rotated region', async ({ I, LabelStudio, AtImageView, AtSidebar, current }) => {
    const { shapeName } = current;
    const Shape = shapes[shapeName];

    I.amOnPage('/');
    LabelStudio.init(getParamsWithShape(shapeName, Shape.params));
    AtImageView.waitForImage();
    AtSidebar.seeRegions(0);
    await AtImageView.lookForStage();
    const canvasSize = await AtImageView.getCanvasSize();

    const bbox = {
      x: canvasSize.width / 2 - 50,
      y: canvasSize.height / 2 - 50,
      width: 100,
      height: 100,
    };
    const bboxCenter = {
      x: bbox.x + bbox.width / 2,
      y: bbox.y + bbox.height / 2,
    };

    // Draw a region
    I.pressKey(Shape.hotKey);
    drawShapeByBbox(Shape, bbox.x, bbox.y, bbox.width, bbox.height, AtImageView);
    AtSidebar.seeRegions(1);

    // Select it
    AtImageView.clickAt(bboxCenter.x, bboxCenter.y);
    AtSidebar.seeSelectedRegion();

    // Switch to move tool to force appearance of transformer
    I.pressKey('v');
    const isTransformerExist = await AtImageView.isTransformerExist();

    assert.strictEqual(isTransformerExist, true);

    // The rotator anchor must be above top anchor by 50 pixels
    const rotatorPosition = {
      x: bboxCenter.x,
      y: bbox.y - 50,
    };

    // Rotate for 180 degrees clockwise
    AtImageView.drawThroughPoints([
      [rotatorPosition.x, rotatorPosition.y],
      [bboxCenter.x + 100, bboxCenter.y],
      [bboxCenter.x, bboxCenter.y + 100],
      [bboxCenter.x, bboxCenter.y + 200],
    ], 'steps', 10);

    // When we have the  rotated region, we need to check its behavior when we drag it across the borders of the image
    let rectangleResult;

    I.say('Drag the region over the left border');
    AtImageView.drawThroughPoints([
      [bboxCenter.x, bboxCenter.y],
      [-500, bboxCenter.y],
    ], 'steps', 20);
    AtSidebar.seeSelectedRegion();
    // moving of the region should be constrained by borders
    rectangleResult = await LabelStudio.serialize();
    Asserts.deepEqualWithTolerance(
      rectangleResult[0].value.x * canvasSize.width / 100,
      Shape.byBBox(bbox.width, bbox.y + bbox.height, -bbox.width, -bbox.height).result.x,
    );
    // reset position by undo
    I.pressKey(['Control', 'z']);

    I.say('Drag the region over the top border');
    AtImageView.drawThroughPoints([
      [bboxCenter.x, bboxCenter.y],
      [bboxCenter.x, -500],
    ], 'steps', 20);
    AtSidebar.seeSelectedRegion();
    // moving of the region should be constrained by borders
    rectangleResult = await LabelStudio.serialize();
    Asserts.deepEqualWithTolerance(
      rectangleResult[0].value.y * canvasSize.height / 100,
      Shape.byBBox(bbox.x + bbox.width, bbox.height, -bbox.width, -bbox.height).result.y,
    );
    // reset position by undo
    I.pressKey(['Control', 'z']);

    I.say('Drag the region over the right border');
    AtImageView.drawThroughPoints([
      [bboxCenter.x, bboxCenter.y],
      [canvasSize.width + 500, bboxCenter.y],
    ], 'steps', 20);
    AtSidebar.seeSelectedRegion();
    // moving of the region should be constrained by borders
    rectangleResult = await LabelStudio.serialize();

    Asserts.deepEqualWithTolerance(
      rectangleResult[0].value.x * canvasSize.width / 100,
      Shape.byBBox(canvasSize.width, bbox.y + bbox.height, -bbox.width, -bbox.height).result.x,
    );
    // reset position by undo
    I.pressKey(['Control', 'z']);

    I.say('Drag the region over the bottom border');
    AtImageView.drawThroughPoints([
      [bboxCenter.x, bboxCenter.y],
      [bboxCenter.x, canvasSize.height + 500],
    ], 'steps', 20);
    AtSidebar.seeSelectedRegion();
    // moving of the region should be constrained by borders
    rectangleResult = await LabelStudio.serialize();
    Asserts.deepEqualWithTolerance(
      rectangleResult[0].value.y * canvasSize.height / 100,
      Shape.byBBox(bbox.x + bbox.width, canvasSize.height, -bbox.width, -bbox.height).result.y,
    );
  });

Data(shapesTable.filter(({ shapeName }) => shapes[shapeName].hasMultiSelectionRotator))
  .Scenario('Limitation of dragging a couple of rotated regions', async ({ I, LabelStudio, AtImageView, AtSidebar, current }) => {
    const { shapeName } = current;
    const Shape = shapes[shapeName];

    I.amOnPage('/');
    LabelStudio.init(getParamsWithShape(shapeName, Shape.params));
    AtImageView.waitForImage();
    AtSidebar.seeRegions(0);
    await AtImageView.lookForStage();
    const canvasSize = await AtImageView.getCanvasSize();

    const bbox1 = {
      x: canvasSize.width / 2 - 50,
      y: canvasSize.height / 2 - 50,
      width: 50,
      height: 50,
    };

    const bbox2 = {
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
      width: 50,
      height: 50,
    };

    const transformerBbox = {
      x: bbox1.x,
      y: bbox1.y,
      width: bbox2.x + bbox2.width - bbox1.x,
      height: bbox2.y + bbox2.height - bbox1.y,
    };
    const transformerBboxCenter = {
      get x() {
        return transformerBbox.x + transformerBbox.width / 2;
      },
      get y() {
        return transformerBbox.y + transformerBbox.height / 2;
      },
    };

    // Draw the first region
    I.pressKey(Shape.hotKey);
    drawShapeByBbox(Shape, bbox1.x, bbox1.y, bbox1.width, bbox1.height, AtImageView);
    AtSidebar.seeRegions(1);

    // Draw the second region
    I.pressKey(Shape.hotKey);
    I.pressKeyDown('Control');
    drawShapeByBbox(Shape, bbox2.x, bbox2.y, bbox2.width, bbox2.height, AtImageView);
    I.pressKeyUp('Control');
    AtSidebar.seeRegions(2);

    // Select them by move tool
    I.pressKey('v');
    AtImageView.drawThroughPoints(
      [
        [transformerBbox.x - 50, transformerBbox.y - 50],
        [transformerBbox.x + transformerBbox.width + 50, transformerBbox.y + transformerBbox.height + 50],
      ], 'steps', 10,
    );
    AtSidebar.seeSelectedRegion();

    // The rotator anchor must be above top anchor by 50 pixels
    const rotatorPosition = {
      x: transformerBboxCenter.x,
      y: transformerBbox.y - 50,
    };

    // Rotate for 180 degrees clockwise
    AtImageView.drawThroughPoints([
      [rotatorPosition.x, rotatorPosition.y],
      [transformerBboxCenter.x + 100, transformerBboxCenter.y],
      [transformerBboxCenter.x, transformerBboxCenter.y + 100],
      [transformerBboxCenter.x, transformerBboxCenter.y + 200],
    ], 'steps', 10);

    // When we have the  rotated region, we need to check its behavior when we drag it across the borders of the image
    let rectangleResult;

    I.say('Drag the region over the left border');
    AtImageView.drawThroughPoints([
      [transformerBboxCenter.x, transformerBboxCenter.y],
      [-500, transformerBboxCenter.y],
    ], 'steps', 20);
    AtSidebar.seeSelectedRegion();
    // moving of the region should be constrained by borders
    rectangleResult = await LabelStudio.serialize();
    Asserts.deepEqualWithTolerance(
      rectangleResult[0].value.x * canvasSize.width / 100,
      Shape.byBBox(transformerBbox.width, transformerBbox.y + transformerBbox.height, -bbox1.width, -bbox1.height).result.x,
    );
    Asserts.deepEqualWithTolerance(
      rectangleResult[1].value.x * canvasSize.width / 100,
      Shape.byBBox(bbox2.width, transformerBbox.y + bbox2.height, -bbox2.width, -bbox2.height).result.x,
    );
    // reset position by undo
    I.pressKey(['Control', 'z']);

    I.say('Drag the region over the top border');
    AtImageView.drawThroughPoints([
      [transformerBboxCenter.x, transformerBboxCenter.y],
      [transformerBboxCenter.x, -500],
    ], 'steps', 20);
    AtSidebar.seeSelectedRegion();
    // moving of the region should be constrained by borders
    rectangleResult = await LabelStudio.serialize();
    Asserts.deepEqualWithTolerance(
      rectangleResult[0].value.y * canvasSize.height / 100,
      Shape.byBBox(transformerBbox.x + transformerBbox.width, transformerBbox.height, -bbox1.width, -bbox1.height).result.y,
    );
    Asserts.deepEqualWithTolerance(
      rectangleResult[1].value.y * canvasSize.height / 100,
      Shape.byBBox(transformerBbox.x + bbox2.width, bbox2.height, -bbox2.width, -bbox2.height).result.y,
    );
    // reset position by undo
    I.pressKey(['Control', 'z']);

    I.say('Drag the region over the right border');
    AtImageView.drawThroughPoints([
      [transformerBboxCenter.x, transformerBboxCenter.y],
      [canvasSize.width + 500, transformerBboxCenter.y],
    ], 'steps', 20);
    AtSidebar.seeSelectedRegion();
    // moving of the region should be constrained by borders
    rectangleResult = await LabelStudio.serialize();

    Asserts.deepEqualWithTolerance(
      rectangleResult[0].value.x * canvasSize.width / 100,
      Shape.byBBox(canvasSize.width, transformerBbox.y + transformerBbox.height, -bbox1.width, -bbox1.height).result.x,
    );
    Asserts.deepEqualWithTolerance(
      rectangleResult[1].value.x * canvasSize.width / 100,
      Shape.byBBox(canvasSize.width - transformerBbox.width + bbox2.width, transformerBbox.y + bbox2.height, -bbox2.width, -bbox2.height).result.x,
    );
    // reset position by undo
    I.pressKey(['Control', 'z']);

    I.say('Drag the region over the bottom border');
    AtImageView.drawThroughPoints([
      [transformerBboxCenter.x, transformerBboxCenter.y],
      [transformerBboxCenter.x, canvasSize.height + 500],
    ], 'steps', 20);
    AtSidebar.seeSelectedRegion();
    // moving of the region should be constrained by borders
    rectangleResult = await LabelStudio.serialize();
    Asserts.deepEqualWithTolerance(
      rectangleResult[0].value.y * canvasSize.height / 100,
      Shape.byBBox(transformerBbox.x + transformerBbox.width, canvasSize.height, -bbox1.width, -bbox1.height).result.y,
    );
    Asserts.deepEqualWithTolerance(
      rectangleResult[1].value.y * canvasSize.height / 100,
      Shape.byBBox(transformerBbox.x + bbox2.width, canvasSize.height - transformerBbox.height + bbox2.height, -bbox2.width, -bbox2.height).result.y,
    );
  });

Data(shapesTable.filter(({ shapeName }) => shapes[shapeName].hasRotator))
  .Scenario('Rotating the region near the border', async ({ I, LabelStudio, AtImageView, AtSidebar, current }) => {
    const { shapeName } = current;
    const Shape = shapes[shapeName];

    I.amOnPage('/');
    LabelStudio.init(getParamsWithShape(shapeName, Shape.params));
    AtImageView.waitForImage();
    AtSidebar.seeRegions(0);
    await AtImageView.lookForStage();
    const canvasSize = await AtImageView.getCanvasSize();

    const bbox = {
      x: canvasSize.width - Math.ceil(Math.sqrt(100 ** 2 + 100 ** 2)) / 2 - 50,
      y: canvasSize.height - Math.ceil(Math.sqrt(100 ** 2 + 100 ** 2)) / 2 - 50,
      width: 100,
      height: 100,
    };

    const bboxCenter = {
      x: bbox.x + bbox.width / 2,
      y: bbox.y + bbox.height / 2,
    };

    // Draw the region
    I.pressKey(Shape.hotKey);
    drawShapeByBbox(Shape, bbox.x, bbox.y, bbox.width, bbox.height, AtImageView);
    AtSidebar.seeRegions(1);

    // Select it
    AtImageView.clickAt(bboxCenter.x, bboxCenter.y);
    AtSidebar.seeSelectedRegion();

    // The rotator anchor must be above top anchor by 50 pixels
    const rotatorPosition = {
      x: bboxCenter.x,
      y: bbox.y - 50,
    };

    // Check 7 different rotations
    const rotatorWayPoints = [[rotatorPosition.x, rotatorPosition.y]];
    const angle45 = Math.PI / 4;

    for (let i = 0; i < 8; i++) {
      const angle = angle45 * i;

      rotatorWayPoints.push([bboxCenter.x + Math.sin(angle) * 100, bboxCenter.y - Math.cos(angle) * 100]);
      rotatorWayPoints.push([bboxCenter.x + Math.sin(angle) * 1000, bboxCenter.y - Math.cos(angle) * 1000]);

      // Rotate clockwise by 45 * i degrees
      AtImageView.drawThroughPoints(rotatorWayPoints, 'steps', 10);
      AtSidebar.seeSelectedRegion();
      // Check that rotating was successful
      const rectangleResult = await LabelStudio.serialize();

      Asserts.deepEqualWithTolerance(
        Math.round(rectangleResult[0].value.rotation),
        45 * i,
      );

      // undo rotation
      I.pressKey(['Control', 'z']);
      // clear unnecessary waypoints
      rotatorWayPoints.pop();
    }
  });
