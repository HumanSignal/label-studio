Feature('Max usage');

const IMAGE = 'https://data.heartex.net/open-images/train_0/mini/0030019819f25b28.jpg';

const createImageToolsConfig = ({ maxUsage }) => `
<View> 
  <Image name="img" value="$image" width="50%"/>
  <Rectangle name="Rectangle" toName="img" />
  <Ellipse name="Ellipse" toName="img" />
  <Brush name="Brush" toName="img" />
  <KeyPoint name="KeyPoint" toName="img" />
  <Polygon name="Polygon" toName="img" />
  <Labels name="Labels" toName="img" ${maxUsage ? ` maxUsages="${maxUsage}"` : ''}>
    <Label value="Label_0" />
    <Label value="Label_1" hotkey="1" />
  </Labels>
</View>`;

const createImageLabelsConfig = ({ maxUsage }) => `
<View>
  <Image name="img" value="$image" width="50%" />
  <RectangleLabels name="Rectangle" toName="img" ${maxUsage ? ` maxUsages="${maxUsage}"` : ''}>
    <Label value="Rectangle_0" />
    <Label value="Rectangle_1" hotkey="1" />
  </RectangleLabels>
  <EllipseLabels name="Ellipse" toName="img" ${maxUsage ? ` maxUsages="${maxUsage}"` : ''}>
    <Label value="Ellipse_0" />
    <Label value="Ellipse_1" hotkey="2" />
  </EllipseLabels>
  <BrushLabels name="Brush" toName="img" ${maxUsage ? ` maxUsages="${maxUsage}"` : ''}>
    <Label value="Brush_0" />
    <Label value="Brush_1" hotkey="3" />
  </BrushLabels>
  <KeyPointLabels name="KeyPoint" toName="img" ${maxUsage ? ` maxUsages="${maxUsage}"` : ''}>
    <Label value="KeyPoint_0" />
    <Label value="KeyPoint_1" hotkey="4" />
  </KeyPointLabels>
  <PolygonLabels name="Polygon" toName="img" ${maxUsage ? ` maxUsages="${maxUsage}"` : ''}>
    <Label value="Polygon_0" />
    <Label value="Polygon_1" hotkey="5" />
  </PolygonLabels>
 </View>`;

const shapes = {
  Rectangle: {
    drawAction: 'drawByDrag',
    shortcut: 'r',
    hotkey: '1',
    byBBox(x, y, width, height) {
      return {
        params: [x, y, width, height],
      };
    },
  },
  Ellipse: {
    drawAction: 'drawByDrag',
    shortcut: 'o',
    hotkey: '2',
    byBBox(x, y, width, height) {
      return {
        params: [x + width / 2, y + height / 2, width / 2, height / 2],
      };
    },
  },
  Brush: {
    drawAction: 'clickAt',
    shortcut: 'b',
    hotkey: '3',
    byBBox(x, y, width, height) {
      return {
        params: [x + width / 2, y + height / 2],
      };
    },
  },
  KeyPoint: {
    drawAction: 'clickAt',
    shortcut: 'k',
    hotkey: '4',
    byBBox(x, y, width, height) {
      return {
        params: [x + width / 2, y + height / 2],
      };
    },
  },
  Polygon: {
    drawAction: 'drawByClickingPoints',
    shortcut: 'p',
    hotkey: '5',
    byBBox(x, y, width, height) {
      const points = [];

      points.push([x, y]);
      points.push([x + width, y]);
      points.push([x + width / 2, y + height]);
      return {
        params: [[...points, points[0]]],
      };
    },
  },
};

function drawShapeByBbox(Shape, x, y, width, height, where) {
  where[Shape.drawAction](...Shape.byBBox(x, y, width, height).params);
}

const maxUsageImageToolsDataTable = new DataTable(['maxUsage', 'shapeName']);

[1,3].forEach(maxUsage => {
  Object.keys(shapes).forEach(shapeName => {
    maxUsageImageToolsDataTable.add([maxUsage, shapeName]);
  });
});

const maxUsageDataTable = new DataTable(['maxUsage']);

[1,3].forEach(maxUsage => {
  maxUsageDataTable.add([maxUsage]);
});

Data(maxUsageImageToolsDataTable).Scenario('Max usages of separated labels in ImageView on region creating', async function({ I, LabelStudio, AtImageView, AtSidebar, current }) {
  const { maxUsage, shapeName } = current;
  const shape = shapes[shapeName];
  const annotations = [];

  for (let k = 0; k < maxUsage; k++) {
    annotations.push({
      'value': {
        'x': k,
        'y': 1,
        'width': 0.6666666666666666,
        'labels': [
          'Label_1',
        ],
      },
      'id': k,
      'from_name': 'Labels',
      'to_name': 'img',
      'type': 'labels',
    });
  }

  I.amOnPage('/');
  LabelStudio.setFeatureFlags({
    fflag_fix_front_dev_3666_max_usages_on_region_creation_171122_short: true,
  });
  LabelStudio.init({
    config: createImageToolsConfig({ maxUsage }),
    data: {
      image: IMAGE,
    },
    annotations: [{
      id: 'test',
      result: annotations,
    }],
  });
  await AtImageView.waitForImage();
  await AtImageView.lookForStage();
  AtSidebar.seeRegions(maxUsage);


  I.pressKey('1');
  I.pressKey(shape.shortcut);
  AtImageView.clickAt(50, 50);

  I.see(`You can't use Label_1 more than ${maxUsage} time(s)`);
});

Data(maxUsageImageToolsDataTable).Scenario('Max usages of labels in ImageView on region creating', async function({ I, LabelStudio, AtImageView, AtSidebar, current }) {
  const { maxUsage, shapeName } = current;
  const shape = shapes[shapeName];

  I.amOnPage('/');
  LabelStudio.setFeatureFlags({
    fflag_fix_front_dev_3666_max_usages_on_region_creation_171122_short: true,
  });
  LabelStudio.init({
    config: createImageLabelsConfig({ maxUsage }),
    data: {
      image: IMAGE,
    },
  });

  await AtImageView.waitForImage();
  await AtImageView.lookForStage();
  AtSidebar.seeRegions(0);

  for (let k = 0; k < maxUsage; k++) {
    I.pressKey(shape.hotkey);
    drawShapeByBbox(shape, 1 + 50 * k, 1, 30,30, AtImageView);
    I.pressKey('u');
  }

  I.pressKey(shape.hotkey);
  AtImageView.clickAt(50, 50);

  I.see(`You can't use ${shapeName}_1 more than ${maxUsage} time(s)`);
});

Data(maxUsageDataTable).Scenario('Max usages of labels in Audio on region creation', async function({ I, LabelStudio, AtSidebar, AtAudioView, current }) {
  const { maxUsage } = current;

  LabelStudio.setFeatureFlags({
    fflag_fix_front_dev_3666_max_usages_on_region_creation_171122_short: true,
    ff_front_dev_2715_audio_3_280722_short: true,
  });
  I.amOnPage('/');
  LabelStudio.init({
    config: `
<View>
  <Labels name="label" toName="audio" maxUsages="${maxUsage}">
    <Label value="Label_0" />
    <Label value="Label_1" hotkey="1"/>
  </Labels>
  <Audio name="audio" value="$audio" />
</View>`,
    data: {
      audio: 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/audio/barradeen-emotional.mp3',
    },
  });

  await AtAudioView.waitForAudio();
  await AtAudioView.lookForStage();
  AtSidebar.seeRegions(0);

  for (let k = 0; k < maxUsage; k++) {
    I.pressKey('1');
    AtAudioView.dragAudioElement(10 + 40 * k,30);
    I.pressKey('u');
  }
  I.pressKey('1');
  AtAudioView.dragAudioElement(10 + 40 * maxUsage,30);

  AtSidebar.seeRegions(maxUsage);
  I.see(`You can't use Label_1 more than ${maxUsage} time(s)`);
});

Data(maxUsageDataTable).Scenario('Max usages of labels in RichText on region creation', async function({ I, LabelStudio, AtSidebar, AtRichText, current }) {
  const { maxUsage } = current;

  I.amOnPage('/');
  LabelStudio.setFeatureFlags({
    fflag_fix_front_dev_3666_max_usages_on_region_creation_171122_short: true,
  });
  LabelStudio.init({
    config: `
<View>
  <Labels name="label" toName="text" maxUsages="${maxUsage}">
    <Label value="Label_0" />
    <Label value="Label_1" hotkey="1"/>
  </Labels>
  <HyperText name="text" valueType="url" value="$url" inline="true" />
</View>`,
    data: {
      url: 'https://htx-pub.s3.amazonaws.com/example.txt',
    },
  });

  LabelStudio.waitForObjectsReady();
  AtSidebar.seeRegions(0);

  for (let k = 0; k < maxUsage; k++) {
    I.pressKey('1');
    AtRichText.selectTextByGlobalOffset(1 + 5 * k, 5 * (k + 1));
    I.pressKey('u');
  }
  I.pressKey('1');
  AtRichText.selectTextByGlobalOffset(1 + 5 * maxUsage, 5 * (maxUsage + 1));

  I.see(`You can't use Label_1 more than ${maxUsage} time(s)`);
});

Data(maxUsageDataTable).Scenario('Max usages of labels in Paragraphs on region creation', async function({ I, LabelStudio, AtSidebar, AtParagraphs, current }) {
  const { maxUsage } = current;

  I.amOnPage('/');
  LabelStudio.setFeatureFlags({
    fflag_fix_front_dev_3666_max_usages_on_region_creation_171122_short: true,
  });
  LabelStudio.init({
    config: `
<View>
  <ParagraphLabels name="label" toName="text" maxUsages="${maxUsage}">
    <Label value="Label_0" />
    <Label value="Label_1" hotkey="1"/>
  </ParagraphLabels>
  <Paragraphs audioUrl="$audio" name="text" value="$dialogue" layout="dialogue" savetextresult="no" />
</View>`,
    data: require('../examples/text-paragraphs').data,
  });

  LabelStudio.waitForObjectsReady();
  AtSidebar.seeRegions(0);

  for (let k = 0; k < maxUsage; k++) {
    I.pressKey('1');
    AtParagraphs.selectTextByOffset(k + 1, 0, 3);
    I.pressKey('u');
  }
  I.pressKey('1');
  AtParagraphs.selectTextByOffset(maxUsage + 1, 0, 3);

  I.see(`You can't use Label_1 more than ${maxUsage} time(s)`);
});

Data(maxUsageDataTable).Scenario('Max usages of labels in Timeseries on region creation', async function({ I, LabelStudio, AtSidebar, AtTimeSeries, current }) {
  const { maxUsage } = current;

  I.amOnPage('/');
  LabelStudio.setFeatureFlags({
    fflag_fix_front_dev_3666_max_usages_on_region_creation_171122_short: true,
  });
  LabelStudio.init({
    config: `
<View>
  <TimeSeriesLabels name="label" toName="ts" maxUsages="${maxUsage}">
    <Label value="Label_0" />
    <Label value="Label_1" hotkey="1"/>
  </TimeSeriesLabels>
  <TimeSeries name="ts" value="$timeseries" valueType="json" timeColumn="time" format="date" overviewChannels="two">
    <Channel units="Hz" displayFormat=",.1f" strokeColor="#1f77b4" legend="Sensor 1" column="one" />
    <Channel units="Hz" displayFormat=",.1f" strokeColor="#ff7f0e" legend="Sensor 2" column="two" />
  </TimeSeries>
</View>`,
    data: require('../examples/data/sample-sin.json'),
  });

  LabelStudio.waitForObjectsReady();
  AtSidebar.seeRegions(0);
  await AtTimeSeries.lookForStage();

  for (let k = 0; k < maxUsage; k++) {
    I.pressKey('1');
    AtTimeSeries.drawByDrag(1 + k * 20, 10);
    I.pressKey('u');
  }
  I.pressKey('1');
  AtTimeSeries.drawByDrag(1 + maxUsage * 20, 10);

  I.see(`You can't use Label_1 more than ${maxUsage} time(s)`);
});
