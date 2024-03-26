const { initLabelStudio, serialize, convertToFixed, getSizeConvertor } = require('./helpers');

const assert = require('assert');

const DEFAULT_DIMENSIONS = {
  rect: { width: 30, height: 30 },
  ellipse: { radius: 30 },
  polygon: { length: 30 },
};

Feature('Creating regions with gesture');

const IMAGE =
  'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg';

const BLUEVIOLET = {
  color: '#8A2BE2',
  rgbArray: [138, 43, 226],
};
const getConfigWithShapes = (shapes, props = '') => `
   <View>
    <Image name="img" value="$image" zoom="true" zoomBy="1.5" zoomControl="true" rotateControl="true"></Image>
    ${shapes
    .map(
      shape => `
    <${shape}Labels ${props} name="${shape}" toName="img">
      <Label value="${shape}" background="${BLUEVIOLET.color}"></Label>
    </${shape}Labels>
    `,
    )
    .join('')}
  </View>`;

const createShape = {
  Polygon: {
    byMultipleClicks(x, y, radius, opts = {}) {
      const points = [];

      for (let i = 5; i--;) {
        points.push([x + Math.sin(((2 * Math.PI) / 5) * i) * radius, y - Math.cos(((2 * Math.PI) / 5) * i) * radius]);
        points.push([
          x + (Math.sin(((2 * Math.PI) / 5) * (i - 0.5)) * radius) / 3,
          y - (Math.cos(((2 * Math.PI) / 5) * (i - 0.5)) * radius) / 3,
        ]);
      }
      return {
        ...opts,
        action: 'clickPolygonPointsKonva',
        params: [points],
        result: {
          points,
        },
      };
    },
    byDoubleClick(x, y, radius, opts = {}) {
      return {
        ...opts,
        action: 'clickPointsKonva',
        params: [
          [
            [x, y],
            [x, y],
          ],
        ],
        result: {
          points: [
            [x, y],
            [x + DEFAULT_DIMENSIONS.polygon.length, y],
            [x + DEFAULT_DIMENSIONS.polygon.length / 2, y + Math.sin(Math.PI / 3) * DEFAULT_DIMENSIONS.polygon.length],
          ],
        },
      };
    },
  },
  Rectangle: {
    byDrag(x, y, radius, opts = {}) {
      return {
        ...opts,
        action: 'dragKonva',
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
    byThreeClicks(x, y, radius, opts = {}) {
      return {
        ...opts,
        action: 'clickPointsKonva',
        params: [
          [
            [x , y],
            [x + radius, y + radius],
          ],
        ],
        result: {
          width: radius,
          height: radius,
          rotation: 0,
          x,
          y,
        },
      };
    },
    byDoubleClick(x, y, radius, opts = {}) {
      return {
        ...opts,
        action: 'clickPointsKonva',
        params: [
          [
            [x, y],
            [x, y],
          ],
        ],
        result: {
          width: DEFAULT_DIMENSIONS.rect.width,
          height: DEFAULT_DIMENSIONS.rect.height,
          rotation: 0,
          x,
          y,
        },
      };
    },
  },
  Ellipse: {
    byDrag(x, y, radius, opts = {}) {
      return {
        ...opts,
        action: 'dragKonva',
        params: [x, y, radius, radius],
        result: { radiusX: radius, radiusY: radius, rotation: 0, x, y },
      };
    },
    byTwoClicks(x, y, radius, opts = {}) {
      return {
        ...opts,
        action: 'clickPointsKonva',
        params: [
          [
            [x, y],
            [x + radius, y + radius],
          ],
        ],
        result: { radiusX: radius, radiusY: radius, rotation: 0, x, y },
      };
    },
    byDoubleClick(x, y, radius, opts = {}) {
      return {
        ...opts,
        action: 'clickPointsKonva',
        params: [
          [
            [x, y],
            [x, y],
          ],
        ],
        result: {
          radiusX: DEFAULT_DIMENSIONS.ellipse.radius,
          radiusY: DEFAULT_DIMENSIONS.ellipse.radius,
          rotation: 0,
          x,
          y,
        },
      };
    },
  },
};

Scenario('Creating regions by various gestures', async function({ I, AtImageView, AtSidebar }) {
  const params = {
    config: getConfigWithShapes(Object.keys(createShape)),
    data: { image: IMAGE },
  };

  I.amOnPage('/');
  await I.executeScript(initLabelStudio, params);
  AtImageView.waitForImage();
  AtSidebar.seeRegions(0);
  const canvasSize = await AtImageView.getCanvasSize();
  const convertToImageSize = getSizeConvertor(canvasSize.width, canvasSize.height);
  const cellSize = { width: 100, height: 100 };
  const gridSize = {
    h: Math.floor(canvasSize.width / cellSize.width),
    v: Math.floor(canvasSize.height / cellSize.height),
  };
  const regions = [];

  Object.keys(createShape).forEach((shapeName, shapeIdx) => {
    const hotKey = `${shapeIdx + 1}`;

    Object.values(createShape[shapeName]).forEach(creator => {
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
    I.pressKey(region.hotKey);
    AtImageView[region.action](...region.params);
    AtSidebar.seeRegions(+idx + 1);
  }
  const result = await I.executeScript(serialize);

  for (let i = 0; i < regions.length; i++) {
    assert.deepEqual(convertToFixed(result[i].value), convertToImageSize(regions[i].result));
  }
});
