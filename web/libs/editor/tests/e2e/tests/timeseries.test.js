const assert = require("assert");

const config = ({ timeformat }) => `
<View>
  <Header value="Select regions:"></Header>
  <TimeSeriesLabels name="label" toName="ts">
    <Label value="Beat"></Label>
    <Label value="Voice"></Label>
    <Label value="Guitar"></Label>
    <Label value="Other"></Label>
  </TimeSeriesLabels>
  <TimeSeries name="ts" value="$timeseries" valueType="json" timeColumn="time" format="date" ${
    timeformat ? `timeFormat="${timeformat}"` : ""
  } overviewChannels="two">
    <Channel units="Hz" displayFormat=",.1f" strokeColor="#1f77b4" legend="Sensor 1" column="one" />
    <Channel units="Hz" displayFormat=",.1f" strokeColor="#ff7f0e" legend="Sensor 2" column="two" />
  </TimeSeries>
</View>
`;

const scenarios = {
  "Works with data sorted ascending by time column": {
    timeseries: {
      time: [-1, 0, 1, 2, 3],
      one: [13.11794020069087, 95.2190411666738, 37.03620982977559, 16.8961637786484, 49.2981075645916],
      two: [-5.653544080516028, 10.07458649100271, 0, -20.140046051127193, 32.40194378594322],
    },
    assert(I) {
      I.waitForVisible(".htx-timeseries", 5);
      I.dontSeeElement(locate(".lsf-errors"));
    },
  },

  "Errors with data sorted descending by time column": {
    timeseries: {
      time: [3, 2, 1],
      one: [37.03620982977559, 16.8961637786484, 49.2981075645916],
      two: [0, -20.140046051127193, 32.40194378594322],
    },
    assert(I) {
      I.seeElement(locate(".lsf-errors"));
    },
  },

  "Errors with data not sorted by time column": {
    timeseries: {
      time: [1, 3, 2],
      one: [37.03620982977559, 16.8961637786484, 49.2981075645916],
      two: [0, -20.140046051127193, 32.40194378594322],
    },
    assert(I) {
      I.seeElement(locate(".lsf-errors"));
    },
  },

  "Works with data formatted and sorted ascending by time column": {
    timeformat: "%Y-%m-%d %H:%M:%S",
    timeseries: {
      time: ["2022-02-07 00:50:00", "2022-02-07 00:51:00", "2022-02-07 00:52:00"],
      one: [37.03620982977559, 16.8961637786484, 49.2981075645916],
      two: [0, -20.140046051127193, 32.40194378594322],
    },
    assert(I) {
      I.waitForVisible(".htx-timeseries", 5);
      I.dontSeeElement(locate(".lsf-errors"));
    },
  },

  "Errors with data formatted and sorted descending by time column": {
    timeformat: "%Y-%m-%d %H:%M:%S",
    timeseries: {
      time: ["2022-02-07 00:52:00", "2022-02-07 00:51:00", "2022-02-07 00:50:00"],
      one: [37.03620982977559, 16.8961637786484, 49.2981075645916],
      two: [0, -20.140046051127193, 32.40194378594322],
    },
    assert(I) {
      I.seeElement(locate(".lsf-errors"));
    },
  },

  "Errors with data formatted and not sorted by time column": {
    timeformat: "%Y-%m-%d %H:%M:%S",
    timeseries: {
      time: ["2022-02-07 00:50:00", "2022-02-07 00:52:00", "2022-02-07 00:51:00"],
      one: [37.03620982977559, 16.8961637786484, 49.2981075645916],
      two: [0, -20.140046051127193, 32.40194378594322],
    },
    assert(I) {
      I.seeElement(locate(".lsf-errors"));
    },
  },

  "Works with microseconds in time column and %f timeFormat": {
    timeformat: "%Y-%m-%d %H:%M:%S.%f",
    timeseries: {
      time: ["2024-07-15 12:34:56.123456", "2024-07-15 12:34:57.654321", "2024-07-15 12:34:58.000123"],
      one: [1, 2, 3],
      two: [4, 5, 6],
    },
    assert(I) {
      I.waitForVisible(".htx-timeseries", 5);
      I.dontSeeElement(locate(".lsf-errors"));
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

Feature("TimeSeries datasets");
Object.entries(scenarios).forEach(([title, scenario]) =>
  Scenario(title, async ({ I, LabelStudio }) => {
    const cfg = config(scenario);
    const params = {
      annotations: [{ id: "test", result: [] }],
      config: cfg,
      data: { timeseries: scenario.timeseries },
    };
    // const configTree = Utils.parseXml(config);

    await I.amOnPage("/");
    LabelStudio.init(params);

    scenario.assert(I);
  }),
);

Scenario("TimeSeries with optimized data", async ({ I, LabelStudio, AtTimeSeries }) => {
  async function doNotSeeProblems() {
    await I.wait(2);
    I.seeElement(".htx-timeseries");
    // The potential errors should be caught by `errorsCollector` plugin

    const counters = await I.executeScript(() => {
      return {
        NaN:
          document.querySelectorAll("[d*='NaN']").length +
          document.querySelectorAll("[cy*='NaN']").length +
          document.querySelectorAll("[transform*='NaN']").length,
        Infinity: document.querySelectorAll("[transform*='Infinity']").length,
      };
    });

    if (counters.NaN) {
      assert.fail("Found element with NaN in attribute");
    }
    if (counters.Infinity) {
      assert.fail("Found element with Infinity in attribute");
    }
  }

  I.amOnPage("/");

  const SLICES_COUNT = 10;
  const BAD_MULTIPLIER = 1.9;
  const screenWidth = await I.executeScript(() => {
    return window.screen.width * window.devicePixelRatio;
  });
  const stepsToGenerate = screenWidth * SLICES_COUNT * BAD_MULTIPLIER;
  const params = {
    annotations: [
      {
        id: "test",
        result: [],
      },
    ],
    config: config({}),
    data: {
      timeseries: generateData(stepsToGenerate),
    },
  };

  LabelStudio.init(params);
  I.waitForVisible(".htx-timeseries");

  I.say("try to get errors by selecting overview range");
  await AtTimeSeries.selectOverviewRange(0.98, 1);
  await doNotSeeProblems();

  I.say("try to get errors by zooming in by mouse wheel");
  I.pressKeyDown("CommandOrControl");
  for (let i = 0; i < 10; i++) {
    await AtTimeSeries.zoomByMouse(-100, { x: 0.98 });
  }
  I.pressKeyUp("CommandOrControl");
  await doNotSeeProblems();

  I.say("try to get errors by moving handle to the extreme position");
  await AtTimeSeries.moveHandle(1.1);
  await AtTimeSeries.moveHandle(1.1);
  await doNotSeeProblems();

  I.say("try to get errors by moving overview range by click");
  await AtTimeSeries.clickOverview(0.15);
  await doNotSeeProblems();

  I.say("try to get errors by creating micro ranges at overview");
  await AtTimeSeries.selectOverviewRange(0.9, 0.9001);
  await doNotSeeProblems();
  await AtTimeSeries.selectOverviewRange(0.9, 0.8999);
  await doNotSeeProblems();

  I.say("check that every timestamps from timeseries data is available to display");
  await AtTimeSeries.selectOverviewRange(0.001, 0.0);
  for (let i = 0; i < 20; i++) {
    await AtTimeSeries.zoomByMouse(-100, { x: 0.001 });
  }

  let lastTimestamp;

  for (let i = 0; i < 15; i++) {
    AtTimeSeries.moveMouseOverChannel({ x: 0.01 + 0.025 * i });
    const timestamp = await AtTimeSeries.grabStickTime();

    if (lastTimestamp !== undefined) {
      I.say(`I see ${timestamp}`);

      assert(
        timestamp === lastTimestamp || timestamp - lastTimestamp === 1,
        `Timestamps should not be skipped. Got ${lastTimestamp} and ${timestamp} but ${timestamp - 1} is missed`,
      );
    }
    lastTimestamp = timestamp;
  }
});

Feature("TimeSeries overviewChannels filtering");

Scenario("Overview should show only specified channels when overviewChannels is set", async ({ I, LabelStudio }) => {
  const config = `
<View>
  <Header value="TimeSeries overviewChannels test"/>
  <TimeSeriesLabels name="label" toName="ts">
    <Label value="Event"></Label>
  </TimeSeriesLabels>
  <TimeSeries name="ts" value="$timeseries" valueType="json" timeColumn="time" overviewChannels="channel1,channel3">
    <Channel column="channel1" strokeColor="#1f77b4" legend="Channel 1" />
    <Channel column="channel2" strokeColor="#ff7f0e" legend="Channel 2" />
    <Channel column="channel3" strokeColor="#2ca02c" legend="Channel 3" />
  </TimeSeries>
</View>
`;

  const data = {
    timeseries: {
      time: [0, 1, 2, 3, 4, 5],
      channel1: [10, 20, 30, 40, 50, 60],
      channel2: [15, 25, 35, 45, 55, 65],
      channel3: [5, 15, 25, 35, 45, 55],
    },
  };

  const params = {
    annotations: [{ id: "test", result: [] }],
    config: config,
    data: data,
  };

  await I.amOnPage("/");
  LabelStudio.init(params);
  I.waitForVisible(".htx-timeseries", 5);
  I.dontSeeElement(locate(".lsf-errors"));

  // Count channel paths in the overview
  const channelCount = await I.executeScript(() => {
    const overview = document.querySelector(".htx-timeseries-overview");
    if (!overview) return 0;
    const svg = overview.querySelector("svg");
    if (!svg) return 0;
    const channelsGroup = svg.querySelector(".channels");
    if (!channelsGroup) return 0;
    return channelsGroup.querySelectorAll("path.channel").length;
  });

  // Should only show 2 channels (channel1 and channel3), not channel2
  assert.equal(channelCount, 2, `Expected 2 channels in overview, but found ${channelCount}`);
});

Scenario("Overview should show all channels when overviewChannels is not set", async ({ I, LabelStudio }) => {
  const config = `
<View>
  <Header value="TimeSeries overviewChannels test"/>
  <TimeSeriesLabels name="label" toName="ts">
    <Label value="Event"></Label>
  </TimeSeriesLabels>
  <TimeSeries name="ts" value="$timeseries" valueType="json" timeColumn="time">
    <Channel column="channel1" strokeColor="#1f77b4" legend="Channel 1" />
    <Channel column="channel2" strokeColor="#ff7f0e" legend="Channel 2" />
    <Channel column="channel3" strokeColor="#2ca02c" legend="Channel 3" />
  </TimeSeries>
</View>
`;

  const data = {
    timeseries: {
      time: [0, 1, 2, 3, 4, 5],
      channel1: [10, 20, 30, 40, 50, 60],
      channel2: [15, 25, 35, 45, 55, 65],
      channel3: [5, 15, 25, 35, 45, 55],
    },
  };

  const params = {
    annotations: [{ id: "test", result: [] }],
    config: config,
    data: data,
  };

  await I.amOnPage("/");
  LabelStudio.init(params);
  I.waitForVisible(".htx-timeseries", 5);
  I.dontSeeElement(locate(".lsf-errors"));

  // Count channel paths in the overview
  const channelCount = await I.executeScript(() => {
    const overview = document.querySelector(".htx-timeseries-overview");
    if (!overview) return 0;
    const svg = overview.querySelector("svg");
    if (!svg) return 0;
    const channelsGroup = svg.querySelector(".channels");
    if (!channelsGroup) return 0;
    return channelsGroup.querySelectorAll("path.channel").length;
  });

  // Should show all 3 channels when overviewChannels is not set
  assert.equal(channelCount, 3, `Expected 3 channels in overview, but found ${channelCount}`);
});

Scenario("Overview should filter channels by numeric index", async ({ I, LabelStudio }) => {
  const config = `
<View>
  <Header value="TimeSeries overviewChannels numeric index test"/>
  <TimeSeriesLabels name="label" toName="ts">
    <Label value="Event"></Label>
  </TimeSeriesLabels>
  <TimeSeries name="ts" value="$timeseries" valueType="json" timeColumn="time" overviewChannels="1,3">
    <Channel column="velocity" strokeColor="#1f77b4" legend="Velocity" />
    <Channel column="acceleration" strokeColor="#ff7f0e" legend="Acceleration" />
    <Channel column="temperature" strokeColor="#2ca02c" legend="Temperature" />
  </TimeSeries>
</View>
`;

  const data = {
    timeseries: {
      time: [0, 1, 2, 3, 4, 5],
      velocity: [10, 20, 30, 40, 50, 60],
      acceleration: [15, 25, 35, 45, 55, 65],
      temperature: [5, 15, 25, 35, 45, 55],
    },
  };

  const params = {
    annotations: [{ id: "test", result: [] }],
    config: config,
    data: data,
  };

  await I.amOnPage("/");
  LabelStudio.init(params);
  I.waitForVisible(".htx-timeseries", 5);
  I.dontSeeElement(locate(".lsf-errors"));

  // Count channel paths in the overview
  const channelCount = await I.executeScript(() => {
    const overview = document.querySelector(".htx-timeseries-overview");
    if (!overview) return 0;
    const svg = overview.querySelector("svg");
    if (!svg) return 0;
    const channelsGroup = svg.querySelector(".channels");
    if (!channelsGroup) return 0;
    return channelsGroup.querySelectorAll("path.channel").length;
  });

  // Should only show 2 channels (velocity at index 1, temperature at index 3), not acceleration
  assert.equal(channelCount, 2, `Expected 2 channels in overview, but found ${channelCount}`);
});

Scenario("Overview should handle case-insensitive channel names", async ({ I, LabelStudio }) => {
  const config = `
<View>
  <Header value="TimeSeries overviewChannels case-insensitive test"/>
  <TimeSeriesLabels name="label" toName="ts">
    <Label value="Event"></Label>
  </TimeSeriesLabels>
  <TimeSeries name="ts" value="$timeseries" valueType="json" timeColumn="time" overviewChannels="VELOCITY,Acceleration">
    <Channel column="velocity" strokeColor="#1f77b4" legend="Velocity" />
    <Channel column="acceleration" strokeColor="#ff7f0e" legend="Acceleration" />
    <Channel column="temperature" strokeColor="#2ca02c" legend="Temperature" />
  </TimeSeries>
</View>
`;

  const data = {
    timeseries: {
      time: [0, 1, 2, 3, 4, 5],
      velocity: [10, 20, 30, 40, 50, 60],
      acceleration: [15, 25, 35, 45, 55, 65],
      temperature: [5, 15, 25, 35, 45, 55],
    },
  };

  const params = {
    annotations: [{ id: "test", result: [] }],
    config: config,
    data: data,
  };

  await I.amOnPage("/");
  LabelStudio.init(params);
  I.waitForVisible(".htx-timeseries", 5);
  I.dontSeeElement(locate(".lsf-errors"));

  // Count channel paths in the overview
  const channelCount = await I.executeScript(() => {
    const overview = document.querySelector(".htx-timeseries-overview");
    if (!overview) return 0;
    const svg = overview.querySelector("svg");
    if (!svg) return 0;
    const channelsGroup = svg.querySelector(".channels");
    if (!channelsGroup) return 0;
    return channelsGroup.querySelectorAll("path.channel").length;
  });

  // Should show 2 channels (velocity and acceleration) despite case differences
  assert.equal(channelCount, 2, `Expected 2 channels in overview, but found ${channelCount}`);
});

Scenario("Overview should handle single channel in overviewChannels", async ({ I, LabelStudio }) => {
  const config = `
<View>
  <Header value="TimeSeries overviewChannels single channel test"/>
  <TimeSeriesLabels name="label" toName="ts">
    <Label value="Event"></Label>
  </TimeSeriesLabels>
  <TimeSeries name="ts" value="$timeseries" valueType="json" timeColumn="time" overviewChannels="channel2">
    <Channel column="channel1" strokeColor="#1f77b4" legend="Channel 1" />
    <Channel column="channel2" strokeColor="#ff7f0e" legend="Channel 2" />
    <Channel column="channel3" strokeColor="#2ca02c" legend="Channel 3" />
  </TimeSeries>
</View>
`;

  const data = {
    timeseries: {
      time: [0, 1, 2, 3, 4, 5],
      channel1: [10, 20, 30, 40, 50, 60],
      channel2: [15, 25, 35, 45, 55, 65],
      channel3: [5, 15, 25, 35, 45, 55],
    },
  };

  const params = {
    annotations: [{ id: "test", result: [] }],
    config: config,
    data: data,
  };

  await I.amOnPage("/");
  LabelStudio.init(params);
  I.waitForVisible(".htx-timeseries", 5);
  I.dontSeeElement(locate(".lsf-errors"));

  // Count channel paths in the overview
  const channelCount = await I.executeScript(() => {
    const overview = document.querySelector(".htx-timeseries-overview");
    if (!overview) return 0;
    const svg = overview.querySelector("svg");
    if (!svg) return 0;
    const channelsGroup = svg.querySelector(".channels");
    if (!channelsGroup) return 0;
    return channelsGroup.querySelectorAll("path.channel").length;
  });

  // Should show only 1 channel (channel2)
  assert.equal(channelCount, 1, `Expected 1 channel in overview, but found ${channelCount}`);
});

Scenario("Overview should filter out invalid channel names", async ({ I, LabelStudio }) => {
  const config = `
<View>
  <Header value="TimeSeries overviewChannels invalid names test"/>
  <TimeSeriesLabels name="label" toName="ts">
    <Label value="Event"></Label>
  </TimeSeriesLabels>
  <TimeSeries name="ts" value="$timeseries" valueType="json" timeColumn="time" overviewChannels="channel1,invalidChannel,channel3">
    <Channel column="channel1" strokeColor="#1f77b4" legend="Channel 1" />
    <Channel column="channel2" strokeColor="#ff7f0e" legend="Channel 2" />
    <Channel column="channel3" strokeColor="#2ca02c" legend="Channel 3" />
  </TimeSeries>
</View>
`;

  const data = {
    timeseries: {
      time: [0, 1, 2, 3, 4, 5],
      channel1: [10, 20, 30, 40, 50, 60],
      channel2: [15, 25, 35, 45, 55, 65],
      channel3: [5, 15, 25, 35, 45, 55],
    },
  };

  const params = {
    annotations: [{ id: "test", result: [] }],
    config: config,
    data: data,
  };

  await I.amOnPage("/");
  LabelStudio.init(params);
  I.waitForVisible(".htx-timeseries", 5);
  I.dontSeeElement(locate(".lsf-errors"));

  // Count channel paths in the overview
  const channelCount = await I.executeScript(() => {
    const overview = document.querySelector(".htx-timeseries-overview");
    if (!overview) return 0;
    const svg = overview.querySelector("svg");
    if (!svg) return 0;
    const channelsGroup = svg.querySelector(".channels");
    if (!channelsGroup) return 0;
    return channelsGroup.querySelectorAll("path.channel").length;
  });

  // Should show only 2 valid channels (channel1 and channel3), invalidChannel should be filtered out
  assert.equal(channelCount, 2, `Expected 2 channels in overview, but found ${channelCount}`);
});
