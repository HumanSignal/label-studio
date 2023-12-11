const { initLabelStudio } = require('./helpers');
const assert = require('assert');

const config = ({ timeformat }) => `
<View>
  <Header value="Select regions:"></Header>
  <TimeSeriesLabels name="label" toName="ts">
    <Label value="Beat"></Label>
    <Label value="Voice"></Label>
    <Label value="Guitar"></Label>
    <Label value="Other"></Label>
  </TimeSeriesLabels>
  <TimeSeries name="ts" value="$timeseries" valueType="json" timeColumn="time" format="date" ${timeformat ? `timeFormat="${timeformat}"` : ''} overviewChannels="two">
    <Channel units="Hz" displayFormat=",.1f" strokeColor="#1f77b4" legend="Sensor 1" column="one" />
    <Channel units="Hz" displayFormat=",.1f" strokeColor="#ff7f0e" legend="Sensor 2" column="two" />
  </TimeSeries>
</View>
`;

const scenarios = {
  'Works with data sorted ascending by time column': {
    'timeseries': {
      'time': [
        -1,
        0,
        1,
        2,
        3,
      ],
      'one': [
        13.11794020069087,
        95.2190411666738,
        37.03620982977559,
        16.8961637786484,
        49.2981075645916,
      ],
      'two': [
        -5.653544080516028,
        10.07458649100271,
        0,
        -20.140046051127193,
        32.40194378594322,
      ],
    },
    assert(I) {
      I.waitForVisible('.htx-timeseries', 5);
      I.dontSeeElement(locate('.ls-errors'));
    },
  },

  'Errors with data sorted descending by time column': {
    'timeseries': {
      'time': [
        3,
        2,
        1,
      ],
      'one': [
        37.03620982977559,
        16.8961637786484,
        49.2981075645916,
      ],
      'two': [
        0,
        -20.140046051127193,
        32.40194378594322,
      ],
    },
    assert(I) {
      I.seeElement(locate('.ls-errors'));
    },
  },

  'Errors with data not sorted by time column': {
    'timeseries': {
      'time': [
        1,
        3,
        2,
      ],
      'one': [
        37.03620982977559,
        16.8961637786484,
        49.2981075645916,
      ],
      'two': [
        0,
        -20.140046051127193,
        32.40194378594322,
      ],
    },
    assert(I) {
      I.seeElement(locate('.ls-errors'));
    },
  },

  'Works with data formatted and sorted ascending by time column': {
    'timeformat': '%Y-%m-%d %H:%M:%S',
    'timeseries': {
      'time': [
        '2022-02-07 00:50:00',
        '2022-02-07 00:51:00',
        '2022-02-07 00:52:00',
      ],
      'one': [
        37.03620982977559,
        16.8961637786484,
        49.2981075645916,
      ],
      'two': [
        0,
        -20.140046051127193,
        32.40194378594322,
      ],
    },
    assert(I) {
      I.waitForVisible('.htx-timeseries', 5);
      I.dontSeeElement(locate('.ls-errors'));
    },
  },

  'Errors with data formatted and sorted descending by time column': {
    'timeformat': '%Y-%m-%d %H:%M:%S',
    'timeseries': {
      'time': [
        '2022-02-07 00:52:00',
        '2022-02-07 00:51:00',
        '2022-02-07 00:50:00',
      ],
      'one': [
        37.03620982977559,
        16.8961637786484,
        49.2981075645916,
      ],
      'two': [
        0,
        -20.140046051127193,
        32.40194378594322,
      ],
    },
    assert(I) {
      I.seeElement(locate('.ls-errors'));
    },
  },

  'Errors with data formatted and not sorted by time column': {
    'timeformat': '%Y-%m-%d %H:%M:%S',
    'timeseries': {
      'time': [
        '2022-02-07 00:50:00',
        '2022-02-07 00:52:00',
        '2022-02-07 00:51:00',
      ],
      'one': [
        37.03620982977559,
        16.8961637786484,
        49.2981075645916,
      ],
      'two': [
        0,
        -20.140046051127193,
        32.40194378594322,
      ],
    },
    assert(I) {
      I.seeElement(locate('.ls-errors'));
    },
  },
};

function generateData(stepsNumber) {
  const timeseries = {
    time: [],
    one: [],
    two: [],
  };

  for (let i = 0; i < stepsNumber; i++) {
    timeseries.time[i] = i;
    timeseries.one[i] = Math.sin(Math.sqrt(i));
    timeseries.two[i] = Math.cos(Math.sqrt(i));
  }

  return timeseries;
}

Feature('TimeSeries datasets');
Object.entries(scenarios).forEach(([title, scenario]) =>
  Scenario(title, async function({ I }) {
    const cfg = config(scenario);
    const params = { annotations: [{ id: 'test', result: [] }], config: cfg, data: { timeseries: scenario.timeseries } };
    // const configTree = Utils.parseXml(config);

    await I.amOnPage('/');
    await I.executeScript(initLabelStudio, params);

    scenario.assert(I);
  }));

Scenario('TimeSeries with optimized data', async ({ I, LabelStudio, AtTimeSeries }) => {
  async function doNotSeeProblems() {
    await I.wait(2);
    I.seeElement('.htx-timeseries');
    // The potential errors should be caught by `errorsCollector` plugin

    const counters = await I.executeScript(() => {
      return {
        NaN: document.querySelectorAll('[d*=\'NaN\']').length +
          document.querySelectorAll('[cy*=\'NaN\']').length +
          document.querySelectorAll('[transform*=\'NaN\']').length,
        Infinity: document.querySelectorAll('[transform*=\'Infinity\']').length,
      };
    }); 

    if (counters.NaN) {
      assert.fail('Found element with NaN in attribute');
    }
    if (counters.Infinity) {
      assert.fail('Found element with Infinity in attribute');
    }
  }

  I.amOnPage('/');

  const SLICES_COUNT = 10;
  const BAD_MULTIPLIER = 1.9;
  const screenWidth = await I.executeScript(() => {
    return window.screen.width * window.devicePixelRatio;
  });
  const stepsToGenerate = screenWidth * SLICES_COUNT * BAD_MULTIPLIER;
  const params = {
    annotations: [{
      id: 'test',
      result: [], 
    }],
    config: config({}),
    data: {
      timeseries: generateData(stepsToGenerate),
    },
  };

  LabelStudio.init(params);
  I.waitForVisible('.htx-timeseries');

  I.say('try to get errors by selecting overview range');
  await AtTimeSeries.selectOverviewRange(.98, 1);
  await doNotSeeProblems();

  I.say('try to get errors by zooming in by mouse wheel');
  I.pressKeyDown('Control');
  for (let i = 0; i < 10; i++) {
    await AtTimeSeries.zoomByMouse(-100, { x: .98 });
  }
  I.pressKeyUp('Control');
  await doNotSeeProblems();

  I.say('try to get errors by moving handle to the extreme position');
  await AtTimeSeries.moveHandle(1.1);
  await AtTimeSeries.moveHandle(1.1);
  await doNotSeeProblems();

  I.say('try to get errors by moving overview range by click');
  await AtTimeSeries.clickOverview(0.15);
  await doNotSeeProblems();

  I.say('try to get errors by creating micro ranges at overview');
  await AtTimeSeries.selectOverviewRange(.9, .9001);
  await doNotSeeProblems();
  await AtTimeSeries.selectOverviewRange(.9, .8999);
  await doNotSeeProblems();

  I.say('check that every timestamps from timeseries data is available to display');
  await AtTimeSeries.selectOverviewRange(.001, .000);
  for (let i = 0; i < 20; i++) {
    await AtTimeSeries.zoomByMouse(-100, { x: .001 });
  }

  let lastTimestamp;

  for (let i = 0; i < 15;i++) {
    AtTimeSeries.moveMouseOverChannel({ x: .01 + .025 * i });
    const timestamp = await AtTimeSeries.grabStickTime();

    if (lastTimestamp !== undefined) {
      I.say(`I see ${timestamp}`);
    
      assert(timestamp === lastTimestamp || timestamp - lastTimestamp === 1,
        `Timestamps should not be skipped. Got ${lastTimestamp} and ${timestamp} but ${timestamp -  1} is missed`);
    }
    lastTimestamp = timestamp;
  }

});
