const {
  initLabelStudio,
  waitForImage,
  getSizeConvertor,
  convertToFixed,
  clickKonva,
  polygonKonva,
  dragKonva,
  serialize,
} = require('./helpers');

const assert = require('assert');

Feature('Test Image object');

const getConfigWithShape = (shape, props = '') => `
  <View>
    <Image name="img" value="$image" />
    <${shape} ${props} name="tag" toName="img" />
  </View>`;

const IMAGE =
  'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg';

// precalculated image size on the screen; may change because of different reasons
const WIDTH = 706;
const HEIGHT = 882;
const convertToImageSize = getSizeConvertor(WIDTH, HEIGHT);

const annotationEmpty = {
  id: '1000',
  result: [],
};

const shapes = [
  {
    shape: 'KeyPoint',
    props: 'strokeWidth="5"',
    action: clickKonva,
    regions: [
      {
        params: [200, 100],
        result: { x: 200, y: 100, width: 5 },
      },
      {
        params: [100, 100],
        result: { x: 100, y: 100, width: 5 },
      },
    ],
  },
  {
    shape: 'Polygon',
    action: polygonKonva,
    regions: [
      {
        // outer array — params, inner array — points as the first param
        params: [
          [
            [200, 20],
            [400, 100],
            [300, 200],
          ],
        ],
        result: {
          points: [
            [200, 20],
            [400, 100],
            [300, 200],
          ],
        },
      },
      {
        // outer array — params, inner array — points as the first param
        params: [
          [
            [400, 10],
            [400, 90],
            [370, 30],
            [300, 10],
          ],
        ],
        result: {
          points: [
            [400, 10],
            [400, 90],
            [370, 30],
            [300, 10],
          ],
        },
      },
    ],
  },
  {
    shape: 'Rectangle',
    action: dragKonva,
    regions: [
      {
        params: [100, 210, 80, 30],
        result: { width: 80, height: 30, rotation: 0, x: 100, y: 210 },
      },
      {
        params: [100, 350, -50, -50],
        result: { width: 50, height: 50, rotation: 0, x: 50, y: 300 },
      },
    ],
  },
  {
    shape: 'Ellipse',
    action: dragKonva,
    regions: [
      {
        params: [300, 300, 50, 50],
        result: { radiusX: 50, radiusY: 50, rotation: 0, x: 300, y: 300 },
      },
      {
        // @todo Ellipse behave differently depending on direction of drawing
        // it keeps center at the start point on right-down movement
        // and it moves center after the cursor on left-up movement
        // @todo looks like a bug
        params: [230, 300, -50, -30],
        result: { radiusX: 50, radiusY: 30, rotation: 0, x: 180, y: 270 },
      },
    ],
  },
];

// eslint-disable-next-line no-undef,codeceptjs/no-skipped-tests
xScenario('Simple shapes on Image', async function({ I, AtImageView, AtSidebar }) {
  for (const shape of shapes) {
    const params = {
      config: getConfigWithShape(shape.shape, shape.props),
      data: { image: IMAGE },
      annotations: [annotationEmpty],
    };

    I.amOnPage('/');
    await I.executeScript(initLabelStudio, params);
    // canvas won't be initialized fully before the image loads
    await I.executeScript(waitForImage);
    AtImageView.waitForImage();
    AtSidebar.seeRegions(0);

    for (const region of shape.regions) {
      // draw the shape using corresponding helper and params
      const err = await I.executeScript(shape.action, region.params);

      if (err) throw new Error(err);
    }

    const result = await I.executeScript(serialize);

    for (let i = 0; i < shape.regions.length; i++) {
      assert.equal(result[i].type, shape.shape.toLowerCase());
      assert.deepEqual(convertToFixed(result[i].value), convertToImageSize(shape.regions[i].result));
    }
  }
});
