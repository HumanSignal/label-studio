const assert = require('assert');

Feature('OCR scenarios');

const createConfig = ({ shapes = ['Rectangle'], textareaProps = '' } = {}) => {
  return `<View>
    <Image name="image" value="$image" zoomcontrol="true"></Image>
    ${shapes.map(shapeName => (`<${shapeName} name="image${shapeName}" toName="image"/>`)).join(`
    `)}
    <Labels name="imageLabels" toName="image" allowEmpty="true">
        <Label value="Paragraph" background="#4E86C8"/>
        <Label value="Header" background="#944BFF"/>
        <Label value="List" background="#F88B16"/>
    </Labels>
    <TextArea name="ocr" toName="image" editable="true" perRegion="true"
              placeholder="Recognized Text" displayMode="region-list" ${textareaProps} />
</View>`;
};

const data = {
  'image': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Html_headers.png/640px-Html_headers.png',
};

const H3_POINTS = [[1.25, 50.887573964497044], [21.875, 50.69033530571992], [22.03125, 55.226824457593686], [1.40625, 55.226824457593686]];

Scenario('Basic scenario', async ({ I, LabelStudio, AtImageView, AtSettings, AtLabels, AtSidebar }) => {
  I.amOnPage('/');

  LabelStudio.init({
    config: createConfig({ shapes: ['Polygon'] }),
    data,
    settings: {
      preserveSelectedTool: false,
    },
  });
  AtImageView.waitForImage();
  AtSettings.open();
  AtSettings.setGeneralSettings({
    [AtSettings.GENERAL_SETTINGS.AUTO_SELECT_REGION]: true,
    [AtSettings.GENERAL_SETTINGS.SHOW_LABELS]: true,
  });
  AtSettings.close();
  AtLabels.clickLabel('Paragraph');
  const canvasSize = await AtImageView.getCanvasSize();

  await AtImageView.lookForStage();
  AtImageView.drawByClickingPoints([...H3_POINTS, H3_POINTS[0]].map(([x, y]) => ([x * canvasSize.width / 100, y * canvasSize.height / 100])));
  AtSidebar.seeRegions(1);
  AtSidebar.seeElement('[placeholder="Recognized Text"]');
  const Text = 'The "H3" header';

  I.pressKey('Enter');
  for (const key of 'The "H3" header') {
    I.pressKey(key);
  }
  I.pressKey('Enter');
  const results = await LabelStudio.serialize();
  const hasText = results.find(result => (result && result.value && result.value.text && result.value.text[0] === Text));

  assert(hasText, true);
});

const REGIONS = [
  {
    'label': 'Header',
    'x': 0.625,
    'y': 1.183431952662722,
    'width': 34.375,
    'height': 5.719921104536489,
    'text': 'The "H1" Header',
  },
  {
    'label': 'Paragraph',
    'x': 0.78125,
    'y': 10.453648915187376,
    'width': 98.4375,
    'height': 10.650887573964496,
    'text': 'This is a paragraph contained with the "p" tag. This content repeats itself for demonstration purposes. This content repeats itself for demonstration purposes. This content repeats itself for demonstration purposes. This content repeats itself for demonstration purposes.',
  },
  {
    'label': 'Header',
    'x': 0.625,
    'y': 23.471400394477318,
    'width': 27.1875,
    'height': 6.31163708086785,
    'text': 'The "H2" Header',
  },
  {
    'label': 'Paragraph',
    'x': 0.3125,
    'y': 31.558185404339252,
    'width': 62.34375,
    'height': 4.339250493096647,
    'text': 'This paragraph, also contained with the "p" tag, contains an unordered list:',
  },
  {
    'label': 'List',
    'x': 2.96875,
    'y': 37.8698224852071,
    'width': 41.5625,
    'height': 11.637080867850099,
  },
  {
    'label': 'Header',
    'x': 0.3125,
    'y': 50.69033530571992,
    'width': 22.65625,
    'height': 4.733727810650888,
    'text': 'The "H3" Header',
  },
  {
    'label': 'Paragraph',
    'x': 0.625,
    'y': 57.790927021696255,
    'width': 98.28125,
    'height': 11.242603550295858,
    'text': 'This is a paragraph',
  },
  {
    'label': 'Header',
    'x': 0.15625,
    'y': 71.20315581854044,
    'width': 19.0625,
    'height': 4.339250493096647,
    'text': 'The "H4" Header',
  },
  {
    'label': 'Paragraph',
    'x': 0.46875,
    'y': 78.10650887573965,
    'width': 64.53125,
    'height': 4.930966469428008,
    'text': 'This is a paragraph',
  },
  {
    'label': 'Header',
    'x': 0.625,
    'y': 85.20710059171597,
    'width': 15.3125,
    'height': 4.1420118343195265,
    'text': 'The "H5" Header',
  },
  {
    'label': 'Paragraph',
    'x': 0.46875,
    'y': 92.11045364891518,
    'width': 41.40625,
    'height': 4.536489151873767,
  },
];

Scenario('Drawing multiple blank regions and then attaching labels', async ({ I, LabelStudio, AtImageView, AtSettings, AtLabels, AtOutliner }) => {
  LabelStudio.setFeatureFlags({
    'ff_front_1170_outliner_030222_short': true,
  });
  I.amOnPage('/');
  LabelStudio.init({ config: createConfig(), data });
  AtImageView.waitForImage();
  AtSettings.open();
  AtSettings.setGeneralSettings({
    [AtSettings.GENERAL_SETTINGS.SHOW_LABELS]: true,
  });
  AtSettings.close();
  AtLabels.clickLabel('blank');
  const canvasSize = await AtImageView.getCanvasSize();

  await AtImageView.lookForStage();
  const regions = REGIONS.map(r => ({ ...r, x: r.x * canvasSize.width / 100, y: r.y * canvasSize.height / 100, width: r.width * canvasSize.width / 100, height: r.height * canvasSize.height / 100 }));

  I.say('Drawing');
  for (const region of regions) {
    AtImageView.drawByDrag(region.x, region.y, region.width, region.height);
  }
  AtOutliner.seeRegions(regions.length);

  I.say('Labeling');
  for (const region of Object.values(regions)) {
    AtImageView.dblClickAt(region.x + region.width / 2, region.y + region.height / 2);
    AtLabels.clickLabel(region.label);
    if (region.text) {
      I.fillField(AtOutliner.locateSelectedItem().find('.lsf-textarea-tag__input'), region.text);
    }
  }
  const results = await LabelStudio.serialize();

  for (const region of regions) {
    if (region.text) {
      const hasText = results.find(result => (result && result.value && result.value.text && result.value.text[0] === region.text));

      assert(hasText, true);
    }
  }
  session('Deserialization', () => {
    I.amOnPage('/');
    LabelStudio.init({ config: createConfig(), data, annotations: [{ id: 'test', result: results }] });
    AtImageView.waitForImage();
    AtOutliner.seeRegions(regions.length);
    for (const [idx, region] of Object.entries(regions)) {
      if (region.text) {
        I.seeInField(AtOutliner.locateRegionIndex((+idx) + 1).find('.lsf-textarea-tag__input'), region.text);
      }
    }
  });
});
