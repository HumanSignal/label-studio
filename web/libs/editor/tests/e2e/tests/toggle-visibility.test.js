const assert = require('assert');
const { initLabelStudio, countKonvaShapes, switchRegionTreeView } = require('./helpers');

const ALL_VISIBLE_SELECTOR = '.lsf-entities__visibility:not(.lsf-entities__visibility_hidden)';
const ALL_HIDDEN_SELECTOR = '.lsf-entities__visibility.lsf-entities__visibility_hidden';
const ONE_VISIBLE_SELECTOR = '.lsf-region-item__toggle.lsf-region-item__toggle_active';
const ONE_HIDDEN_SELECTOR = '.lsf-region-item__toggle:not(.lsf-region-item__toggle_active)';

const config = `
<View>
  <Image name="img" value="$image"></Image>
  <RectangleLabels name="tag" toName="img" fillOpacity="0.5" strokeWidth="5">
    <Label value="Planet"></Label>
    <Label value="Moonwalker" background="blue"></Label>
  </RectangleLabels>
</View>
`;

const data = {
  image:
    'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg',
};

const createRegion = (from_name, type, values) => ({
  id: createRegion.id++,
  source: '$image',
  from_name,
  to_name: 'img',
  type,
  origin: 'manual',
  value: {
    height: 10.458911419423693,
    rotation: 0,
    width: 12.4,
    x: 50.8,
    y: 5.869797225186766,
    ...values,
  },
});

createRegion.id = 1;

const annotations = [
  {
    id: '1001',
    lead_time: 15.053,
    result: [
      createRegion('tag', 'rectanglelabels', { rectanglelabels: ['Moonwalker'] }),
      createRegion('tag', 'rectanglelabels', { rectanglelabels: ['Moonwalker'], x: 1 }),
      createRegion('tag', 'rectanglelabels', { rectanglelabels: ['Moonwalker'], y: 60 }),
    ],
  },
];

Feature('Toggle regions visibility');

Scenario('Checking mass toggling of visibility', async ({ I, AtImageView, AtSidebar }) => {
  const checkVisible = async num => {
    switch (num) {
      case 0:
        I.seeElement(ALL_HIDDEN_SELECTOR);
        I.seeElement(ONE_HIDDEN_SELECTOR);
        I.dontSeeElement(ONE_VISIBLE_SELECTOR);
        break;
      case 1:
      case 2:
        I.seeElement(ALL_VISIBLE_SELECTOR);
        I.seeElement(ONE_VISIBLE_SELECTOR);
        I.seeElement(ONE_HIDDEN_SELECTOR);
        break;
      case 3:
        I.seeElement(ALL_VISIBLE_SELECTOR);
        I.seeElement(ONE_VISIBLE_SELECTOR);
        I.dontSeeElement(ONE_HIDDEN_SELECTOR);
        break;
    }
    const count = await I.executeScript(countKonvaShapes);

    assert.strictEqual(count, num);
  };
  const hideAll = () => {
    I.click(ALL_VISIBLE_SELECTOR);
  };
  const showAll = () => {
    I.click(ALL_HIDDEN_SELECTOR);
  };
  const hideOne = () => {
    I.click(ONE_VISIBLE_SELECTOR);
  };
  const showOne = () => {
    I.click(ONE_HIDDEN_SELECTOR);
  };

  await I.amOnPage('/');
  I.executeScript(initLabelStudio, { annotations, config, data });
  AtImageView.waitForImage();
  AtSidebar.seeRegions(3);
  await checkVisible(3);
  hideOne();
  await checkVisible(2);
  showOne();
  await checkVisible(3);
  hideAll();
  await checkVisible(0);
  showOne();
  await checkVisible(1);
  hideOne();
  await checkVisible(0);
  showAll();
  await checkVisible(3);
  hideOne();
  await checkVisible(2);
  hideAll();
  await checkVisible(0);
});

Scenario('Hiding bulk visibility toggle', ({ I, AtImageView, AtLabels, AtSidebar }) => {
  I.amOnPage('/');
  I.executeScript(initLabelStudio, { config, data });
  AtImageView.waitForImage();
  AtSidebar.seeRegions(0);
  I.dontSeeElement(ALL_VISIBLE_SELECTOR);
  AtLabels.clickLabel('Planet');
  AtImageView.dragKonva(300, 300, 50, 50);
  AtSidebar.seeRegions(1);
  I.seeElement(ALL_VISIBLE_SELECTOR);
});

Scenario('Checking regions grouped by label', async ({ I, AtImageView }) => {
  const checkVisible = async num => {
    switch (num) {
      case 0:
        I.seeElement(ALL_HIDDEN_SELECTOR);
        I.seeElement(ONE_HIDDEN_SELECTOR);
        I.dontSeeElement(ONE_VISIBLE_SELECTOR);
        break;
      case 1:
      case 2:
        I.seeElement(ALL_VISIBLE_SELECTOR);
        I.seeElement(ONE_VISIBLE_SELECTOR);
        I.seeElement(ONE_HIDDEN_SELECTOR);
        break;
      case 3:
        I.seeElement(ALL_VISIBLE_SELECTOR);
        I.seeElement(ONE_VISIBLE_SELECTOR);
        I.dontSeeElement(ONE_HIDDEN_SELECTOR);
        break;
    }
    const count = await I.executeScript(countKonvaShapes);

    assert.strictEqual(count, num);
  };
  const hideAll = () => {
    I.click(ALL_VISIBLE_SELECTOR);
  };
  const showAll = () => {
    I.click(ALL_HIDDEN_SELECTOR);
  };
  const hideOne = () => {
    I.click(ONE_VISIBLE_SELECTOR);
  };
  const showOne = () => {
    I.click(ONE_HIDDEN_SELECTOR);
  };

  await I.amOnPage('/');
  I.executeScript(initLabelStudio, { annotations, config, data });
  AtImageView.waitForImage();
  I.executeScript(switchRegionTreeView, 'labels');
  I.see('Labels');
  await checkVisible(3);
  hideOne();
  await checkVisible(2);
  showOne();
  await checkVisible(3);
  hideAll();
  await checkVisible(0);
  showOne();
  await checkVisible(1);
  hideOne();
  await checkVisible(0);
  showAll();
  await checkVisible(3);
  hideOne();
  await checkVisible(2);
  hideAll();
  await checkVisible(0);
});

const examples = [
  require('../examples/audio-regions'),
  require('../examples/image-bboxes'),
  require('../examples/image-ellipses'),
  require('../examples/image-keypoints'),
  require('../examples/image-polygons'),
  require('../examples/ner-url'),
  require('../examples/nested'),
  require('../examples/text-html'),
  require('../examples/text-paragraphs'),
  require('../examples/timeseries-url-indexed'),
];
const examplesTable = new DataTable(['title', 'config', 'data', 'result']);

examples.forEach(example => {
  const { annotations, config, data, result = annotations[0].result, title } = example;

  examplesTable.add([title, config, data, result]);
});

Data(examplesTable).Scenario('Check visibility switcher through all examples', ({ I, AtSidebar, current }) => {
  const { config, data, result } = current;
  const params = { annotations: [{ id: 'test', result }], config, data };

  const ids = [];

  result.forEach(r => !ids.includes(r.id) && Object.keys(r.value).length > 1 && ids.push(r.id));

  I.amOnPage('/');
  I.executeScript(initLabelStudio, params);
  const regionsCount = ids.length;

  AtSidebar.seeRegions(regionsCount);

  if (regionsCount) {
    I.seeElement(ALL_VISIBLE_SELECTOR);
    I.seeNumberOfElements(ONE_VISIBLE_SELECTOR, regionsCount);
    I.click(ALL_VISIBLE_SELECTOR);
    I.seeElement(ALL_HIDDEN_SELECTOR);
    I.seeNumberOfElements(ONE_HIDDEN_SELECTOR, regionsCount);
  }
});
