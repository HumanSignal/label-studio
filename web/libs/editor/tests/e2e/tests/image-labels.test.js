const assert = require('assert');
const { toKebabCase } = require('strman');

Feature('Images\' labels type matching');

const IMAGE =
  'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg';

const createConfig = ({ shapes = ['Rectangle'], props } = {}) => {
  return `<View>
    <Image name="image" value="$image" zoomControl="false" selectionControl="false"></Image>
    ${shapes.map(shapeName => (`
        <${shapeName} name="image${shapeName}" toName="image" ${props} />
        <${shapeName}Labels name="image${shapeName}Labels" toName="image" allowEmpty="true" ${props}>
            <Label value="${shapeName}Create"/>
            <Label value="${shapeName}Append"/>
        </${shapeName}Labels>
    `)).join('\n')}
    <Labels name="imageLabels" toName="image" allowEmpty="true">
        <Label value="Label"/>
    </Labels>
</View>`;
};

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
};

const DataStore = Data(Object.keys(createShape));

DataStore.Scenario('Preventing applying labels of mismatch types', async ({
  I,
  LabelStudio,
  AtImageView,
  AtSidebar,
  AtLabels,
  current,
}) => {
  const shape = current;
  const config = createConfig({
    shapes: [shape],
    props: 'strokewidth="5"',
  });

  const params = {
    config,
    data: { image: IMAGE },
  };

  I.amOnPage('/');
  LabelStudio.init(params);
  AtImageView.waitForImage();
  AtSidebar.seeRegions(0);
  const canvasSize = await AtImageView.getCanvasSize();
  const size = Math.min(canvasSize.width, canvasSize.height);
  const offset = size * 0.05;
  const toolSelectors = [
    (shapeName, shapeIdx) => {
      I.click(locate('.lsf-toolbar').find('.lsf-tool').at(+shapeIdx + 1));
    },
    (_, shapeIdx) => {
      I.click(AtLabels.locateLabel('blank').at(+shapeIdx + 1));
    },
    (shapeName) => {
      AtLabels.clickLabel(shapeName + 'Create');
    },
  ];

  for (const creator of Object.values(createShape[shape])) {
    const regions = toolSelectors.map((selector, idx) => {
      const x1 = size / 3 * idx + offset;
      const x2 = size / 3 * (idx + 1) - offset;
      const y1 = size / 3;
      const y2 = size / 3 * 2;

      return creator(x1, y1, x2 - x1, y2 - y1, { shape });
    });

    const labelsCounter = (results, currentLabelName = 'Label') => {
      return results.reduce((counter, result) => {
        const { type, value } = result;

        return counter + (type.endsWith('labels') && value[type] && value[type].includes(currentLabelName));
      }, 0);
    };

    const toolSelector = `[aria-label=${toKebabCase(`${shape}-tool`)}]`;

    LabelStudio.init(params);
    AtImageView.waitForImage();
    AtSidebar.seeRegions(0);
    I.click(toolSelector);
    await AtImageView.lookForStage();
    I.say(`${shape}: Drawing.`);

    regions.forEach((region, idx) => {
      toolSelectors[idx](shape, 0);
      AtImageView[region.action](...region.params);
      AtSidebar.seeRegions(idx + 1);
      I.pressKey(['u']);
    });

    I.click(toolSelector);
    I.say(`${shape}: Labeling.`);

    const currentLabelName = shape + 'Append';

    regions.forEach((region, idx) => {
      AtSidebar.clickRegion(+idx + 1);
      AtLabels.clickLabel(currentLabelName);
      I.pressKey(['u']);
    });

    const results1 = await LabelStudio.serialize();

    assert.strictEqual(
      labelsCounter(results1, currentLabelName),
      3,
      'Labels number don\'t match',
    );

    regions.forEach((region, idx) => {
      I.say(`Click label ${idx}`);
      AtSidebar.clickRegion(+idx + 1);
      AtLabels.clickLabel('Label');
    });

    const results = await LabelStudio.serialize();

    assert.strictEqual(
      labelsCounter(results, 'Label'),
      3,
      'Labels number don\'t match',
    );
  }
});
