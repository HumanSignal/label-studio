const { serialize } = require('./helpers');

const assert = require('assert');

Feature('Zooming and rotating');

const IMAGE =
  'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg';

const BLUEVIOLET = {
  color: '#8A2BE2',
  rgbArray: [138, 43, 226],
};
const getConfigWithShape = (shape, props = '') => `
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
    shape: 'KeyPoint',
    props: 'strokeWidth="5"',
    action: 'clickKonva',
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
    shape: 'Polygon',
    action: 'clickPolygonPointsKonva',
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
    shape: 'Rectangle',
    action: 'dragKonva',
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
    shape: 'Ellipse',
    action: 'dragKonva',
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
const shapesTable = new DataTable(['shape', 'props', 'action', 'regions']);

shapes.forEach(({ shape, props = '', action, regions }) => {
  shapesTable.add([shape, props, action, regions]);
});

Data(shapesTable).Scenario('Simple rotation', async function({ I, LabelStudio, AtImageView, AtSidebar, current }) {
  const config = getConfigWithShape(current.shape, current.props);

  const params = {
    config,
    data: { image: IMAGE },
  };

  I.amOnPage('/');
  LabelStudio.init(params);
  AtImageView.waitForImage();
  AtSidebar.seeRegions(0);
  const canvasSize = await AtImageView.getCanvasSize();

  for (const region of current.regions) {
    I.pressKey(['u']);
    I.pressKey('1');
    AtImageView[current.action](...region.params);
  }
  const standard = await I.executeScript(serialize);
  const rotationQueue = ['right', 'right', 'right', 'right', 'left', 'left', 'left', 'left'];
  let degree = 0;
  let hasPixel = await AtImageView.hasPixelColor(100, 100, BLUEVIOLET.rgbArray);

  assert.equal(hasPixel, true);
  for (const rotate of rotationQueue) {
    I.click(locate(`[aria-label='rotate-${rotate}']`));
    degree += rotate === 'right' ? 90 : -90;
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

Data(shapesTable).Scenario('Rotate zoomed', async function({ I, LabelStudio, AtImageView, AtSidebar, current }) {
  const params = {
    config: getConfigWithShape(current.shape, current.props),
    data: { image: IMAGE },
  };

  I.amOnPage('/');
  LabelStudio.init(params);
  AtImageView.waitForImage();
  AtSidebar.seeRegions(0);
  const canvasSize = await AtImageView.getCanvasSize();

  for (const region of current.regions) {
    I.pressKey(['u']);
    I.pressKey('1');
    AtImageView[current.action](...region.params);
  }
  const rotationQueue = ['right', 'right', 'right', 'right', 'left', 'left', 'left', 'left'];
  let degree = 0;
  const ZOOM = 3;

  AtImageView.setZoom(ZOOM, -100 * ZOOM, -100 * ZOOM);
  let hasPixel = await AtImageView.hasPixelColor(1, 1, BLUEVIOLET.rgbArray);

  assert.strictEqual(hasPixel, true, 'Must have pixel before rotation');
  for (const rotate of rotationQueue) {
    I.click(locate(`[aria-label='rotate-${rotate}']`));
    degree += rotate === 'right' ? 90 : -90;
    hasPixel = await AtImageView.hasPixelColor(
      ...rotateCoords([1, 1], degree, canvasSize.width, canvasSize.height).map(Math.round),
      BLUEVIOLET.rgbArray,
    );

    assert.strictEqual(hasPixel, true, `Must have pixel after rotation [${degree}deg]`);
  }
});

const windowSizesTable = new DataTable(['width', 'height']);

windowSizesTable.add([1280, 720]);
windowSizesTable.add([1920, 1080]);
windowSizesTable.add([800, 480]);
windowSizesTable.add([1017, 970]);

Data(windowSizesTable).Scenario('Rotation with different window sizes', async function({ I, LabelStudio, AtImageView, AtSidebar, current }) {
  const config = getConfigWithShape('Rectangle');

  const params = {
    config,
    data: { image: IMAGE },
  };

  I.amOnPage('/');
  I.resizeWindow(current.width, current.height);
  LabelStudio.init(params);
  AtImageView.waitForImage();
  AtSidebar.seeRegions(0);
  const canvasSize = await AtImageView.getCanvasSize();
  const imageSize = await AtImageView.getImageFrameSize();
  const rotationQueue = ['right', 'right', 'right', 'right', 'left', 'left', 'left', 'left'];

  assert(Math.abs(canvasSize.width - imageSize.width) < 1);
  assert(Math.abs(canvasSize.height - imageSize.height) < 1);
  for (const rotate of rotationQueue) {
    I.click(locate(`[aria-label='rotate-${rotate}']`));
    // Just checking that we see image, to get some time for rotating to be finished and correctly rendered
    I.seeElement('[alt="LS"]');
    const rotatedCanvasSize = await AtImageView.getCanvasSize();
    const rotatedImageSize = await AtImageView.getImageFrameSize();

    assert(Math.abs(rotatedCanvasSize.width - rotatedImageSize.width) < 1);
    assert(Math.abs(rotatedCanvasSize.height - rotatedImageSize.height) < 1);
  }
});

const twoColumnsConfigs = [`<View>
    <View style="display:flex;align-items:start;gap:8px;flex-direction:{{direction}}">
        <RectangleLabels name="label" toName="image" showInline="{{showInline}}">
            <Label value="Label 1" background="#2C7873"/>
            <Label value="Label 2" background="#7232F2"/>
        </RectangleLabels>
        <Image name="image" value="$image" zoom="true" rotateControl="true"/>
    </View>
</View>`, `<View>
    <View style="display:flex;align-items:start;gap:8px;flex-direction:{{direction}}">
        <RectangleLabels name="label" toName="image" showInline="{{showInline}}">
            <Label value="Label 1" background="#2C7873"/>
            <Label value="Label 2" background="#7232F2"/>
        </RectangleLabels>
        <View style="flex: 100 0 1%; width: 100%">
            <Image name="image" value="$image" zoom="true" rotateControl="true"/>
        </View>
    </View>
</View>`];

const layoutVariations = new DataTable(['config', 'inline', 'reversed']);

twoColumnsConfigs.forEach(config => {
  for (const inline of [true, false]) {
    for (const reversed of [true, false]) {
      layoutVariations.add([config, inline, reversed]);
    }
  }
});

const compareSize = async (I, AtImageView, message1, message2) => {
  const { width: canvasWidth, height: canvasHeight } = await AtImageView.getCanvasSize();
  const { width: imageWidth, height: imageHeight } = await AtImageView.getImageFrameSize();

  const widthMessage = `[${message2}] Check width: [${[canvasWidth, imageWidth]}]`;
  const heightMessage = `[${message2}] Check height: [${[canvasHeight, imageHeight]}]`;

  I.say(`${message1} [stage: ${canvasWidth}x${canvasHeight}, image: ${imageWidth}x${imageHeight}]`);
  assert(Math.abs(canvasWidth - imageWidth) <= 1, widthMessage);
  assert(Math.abs(canvasHeight - imageHeight) <= 1, heightMessage);
};

Data(layoutVariations).Scenario('Rotation in the two columns template', async function({ I, LabelStudio, AtImageView, AtSidebar, AtSettings, current }) {
  I.amOnPage('/');
  let isVerticalLayout = false;

  const { config, inline, reversed } = current;

  const direction = (inline ? 'column' : 'row') + (reversed ? '-reverse' : '');
  const resultConfig = config.replace('{{direction}}', direction).replace('{{showInline}}',`${inline}`);
  const params = {
    config: resultConfig,
    data: { image: IMAGE },
    annotations: [{
      id: 'rotations',
      result: [
        // The region just for canvas size visually indication
        {
          from_name: 'label',
          id: 'EUsEHxTyrv',
          image_rotation: 0,
          origin: 'manual',
          original_height: 2802,
          original_width: 2242,
          to_name: 'image',
          type: 'rectanglelabels',
          value: {
            height: 100,
            labels: ['Label 2'],
            rotation: 0,
            width: 100,
            x: 0,
            y: 0,
          },
        },
      ],
    }],
  };

  I.say(`Two columns [config: ${twoColumnsConfigs.indexOf(config)}] [${direction}]`);

  LabelStudio.init(params);
  AtImageView.waitForImage();
  AtSidebar.seeRegions(1);

  I.click(locate('[aria-label=\'rotate-right\']'));
  AtSidebar.seeRegions(1);

  await compareSize(I, AtImageView, 'Dimensions must be equal in landscape', 'landscape, rotated');

  I.say('Change to vertcal layout');
  AtSettings.open();
  isVerticalLayout = !isVerticalLayout;
  AtSettings.setLayoutSettings({
    [AtSettings.LAYOUT_SETTINGS.VERTICAL_LAYOUT]: isVerticalLayout,
  });
  AtSettings.close();

  AtSidebar.seeRegions(1);
  await compareSize(I, AtImageView, 'Dimensions must be equal in portrait', 'portrait');

  I.click(locate('[aria-label=\'rotate-right\']'));

  AtSidebar.seeRegions(1);
  await compareSize(I, AtImageView, 'Dimensions must be equal after rotation in portrain', 'portrait, rotated');
});
