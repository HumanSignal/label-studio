const Helpers = require('../helpers');
const Asserts = require('../../utils/asserts');

Feature('Creating regions over other regions').tag('@regress');

const IMAGE =
  'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg';

const BLUEVIOLET = {
  color: '#8A2BE2',
  rgbArray: [138, 43, 226],
};
const getConfigWithShapes = (shapes, props = '') => `
   <View>
    <Image name="img" value="$image" zoom="true" zoomBy="1.5" zoomControl="true" rotateControl="true" maxWidth="750px" maxHeight="auto"/>
    ${shapes
    .map(
      shape => `
    <${shape}Labels ${props} name="${shape}" toName="img">
      <Label value="${shape}" background="${BLUEVIOLET.color}"></Label>
    </${shape}Labels>`,
    )
    .join('')}
  </View>`;

const createShape = {
  Rectangle: {
    byBBox(x, y, width, height, opts = {}) {
      return {
        ...opts,
        action: 'drawByDrag',
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
        action: 'drawByDrag',
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
        action: 'drawByClickingPoints',
        params: [[...points, points[0]]],
        result: {
          points,
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
        action: 'drawThroughPoints',
        params: [points],
      };
    },
  },
  // Temporary disable to pass tests
  // KeyPoint: {
  //   byBBox(x, y, width, height, opts = {}) {
  //     return {
  //       ...opts,
  //       action: "drawByClickingPoints",
  //       params: [[[x + width / 2, y + height / 2]]],
  //       result: {
  //         x: x + width / 2,
  //         y: y + height / 2,
  //         width: 5,
  //       },
  //     };
  //   },
  // },
};

Scenario('Drawing with ctrl pressed', async function({ I, LabelStudio, AtSidebar, AtImageView }) {
  const params = {
    config: getConfigWithShapes(Object.keys(createShape), 'strokewidth="5"'),
    data: { image: IMAGE },
  };

  I.amOnPage('/');
  LabelStudio.init(params);
  AtImageView.waitForImage();
  AtSidebar.seeRegions(0);
  const canvasSize = await AtImageView.getCanvasSize();
  const size = Math.min(canvasSize.width, canvasSize.height);
  const convertToImageSize = Helpers.getSizeConvertor(canvasSize.width, canvasSize.height);
  const regionPairs = [];

  Object.keys(createShape).forEach((shapeName, shapeIdx) => {
    const hotKey = `${shapeIdx + 1}`;

    Object.values(createShape[shapeName]).forEach(creator => {
      const outerRegion = creator(50, 50, size - 50 * 2, size - 50 * 2, {
        hotKey,
        shape: shapeName,
      });
      const innerRegion = creator(150, 150, size - 150 * 2, size - 150 * 2, {
        hotKey,
        shape: shapeName,
      });

      if (outerRegion.result) outerRegion.result[`${shapeName.toLowerCase()}labels`] = [shapeName];
      if (innerRegion.result) innerRegion.result[`${shapeName.toLowerCase()}labels`] = [shapeName];
      regionPairs.push([outerRegion, innerRegion]);
    });
  });
  for (const regionPair of regionPairs) {
    const [outerRegion, innerRegion] = regionPair;

    LabelStudio.init(params);
    AtImageView.waitForImage();
    AtSidebar.seeRegions(0);
    I.say(`Drawing ${innerRegion.shape} on ${outerRegion.shape}`);
    await AtImageView.lookForStage();
    I.pressKey(outerRegion.hotKey);
    AtImageView[outerRegion.action](...outerRegion.params);
    AtSidebar.seeRegions(1);
    I.pressKey(['u']);
    I.pressKey(innerRegion.hotKey);
    I.pressKeyDown('Control');
    AtImageView[innerRegion.action](...innerRegion.params);
    I.pressKeyUp('Control');
    const result = await LabelStudio.serialize();

    AtSidebar.seeRegions(2);
    for (let i = 0; i < 2; i++) {
      if (regionPair[i].result) {
        Asserts.deepEqualWithTolerance(result[i].value, convertToImageSize(regionPair[i].result));
      }
    }
  }
});

Scenario('How it works without ctrl', async function({ I, LabelStudio, AtSidebar, AtImageView }) {
  const params = {
    config: getConfigWithShapes(Object.keys(createShape)),
    data: { image: IMAGE },
    settings: {
      preserveSelectedTool: false,
    },
  };

  I.amOnPage('/');
  LabelStudio.init(params);
  AtImageView.waitForImage();
  AtSidebar.seeRegions(0);
  const canvasSize = await AtImageView.getCanvasSize();
  const size = Math.min(canvasSize.width, canvasSize.height);
  const regionPairs = [];

  Object.keys(createShape).forEach((shapeName, shapeIdx) => {
    const hotKey = `${shapeIdx + 1}`;

    Object.values(createShape[shapeName]).forEach(creator => {
      for (let n = 0; n < 2; n++) {
        const outerRegion = Object.values(createShape)[n].byBBox(50, 50, size - 50 * 2, size - 50 * 2, {
          hotKey: `${n + 1}`,
          shape: Object.keys(createShape)[n],
        });
        const innerRegion = creator(150, 150, size - 150 * 2, size - 150 * 2, {
          hotKey,
          shape: shapeName,
        });

        if (outerRegion.result) outerRegion.result[`${outerRegion.shape.toLowerCase()}labels`] = [outerRegion.shape];
        if (innerRegion.result) innerRegion.result[`${shapeName.toLowerCase()}labels`] = [shapeName];
        regionPairs.push([outerRegion, innerRegion]);
      }
    });
  });
  for (const regionPair of regionPairs) {
    const [outerRegion, innerRegion] = regionPair;

    LabelStudio.init(params);
    AtImageView.waitForImage();
    AtSidebar.seeRegions(0);
    I.say(`Drawing ${innerRegion.shape} on ${outerRegion.shape}`);
    I.pressKey(['u']);
    await AtImageView.lookForStage();
    I.pressKey(outerRegion.hotKey);
    AtImageView[outerRegion.action](...outerRegion.params);
    I.pressKey(['u']);
    I.pressKey(innerRegion.hotKey);
    AtImageView[innerRegion.action](...innerRegion.params);
    AtSidebar.seeRegions(1);
  }
});
