Feature('Undoing drawing in one step').tag('@regress');

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
  KeyPoint: {
    byBBox(x, y, width, height, opts = {}) {
      return {
        ...opts,
        action: 'drawByClickingPoints',
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

Scenario('Drawing shapes and undoing after that', async function({ I, LabelStudio, AtSidebar, AtImageView }) {
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
  const regions = [];

  // Prepare shapes params
  Object.keys(createShape).forEach((shapeName, shapeIdx) => {
    const hotKey = `${shapeIdx + 1}`;

    Object.values(createShape[shapeName]).forEach(creator => {
      const region = creator(50, 50, size - 50 * 2, size - 50 * 2, {
        hotKey,
        shape: shapeName,
      });

      if (region.result) region.result[`${shapeName.toLowerCase()}labels`] = [shapeName];
      regions.push(region);
    });
  });

  // Running a test scenario for each shape type
  for (const region of regions) {

    LabelStudio.init(params);
    AtImageView.waitForImage();
    AtSidebar.seeRegions(0);
    I.say(`Drawing ${region.shape}`);
    await AtImageView.lookForStage();
    I.pressKey(region.hotKey);
    AtImageView[region.action](...region.params);
    AtSidebar.seeRegions(1);
    I.say(`Try to undo ${region.shape}`);
    I.pressKey(['CommandOrControl', 'Z']);
    AtSidebar.seeRegions(0);
  }
}).retry(2);
