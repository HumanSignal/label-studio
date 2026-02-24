// Set up performance.now mock before any imports
import * as d3 from "d3";
import { types } from "mobx-state-tree";
import { mockFF } from "../../../../__mocks__/global";
import { TimeSeriesModel } from "../TimeSeries";
// Import Channel to ensure Registry is initialized
import "../TimeSeries/Channel";

const ff = mockFF();

// Mock environment
const mockEnv = {
  events: { addNamed: jest.fn(), removeNamed: jest.fn() },
  syncManager: { syncSend: jest.fn() },
  messages: {
    URL_TAGS_DOCS: "https://labelstud.io/tags",
    ERR_LOADING_S3: "S3 loading error",
    ERR_LOADING_CORS: "CORS loading error",
  },
};

// Mock store setup following the pattern from Paragraphs tests
const MockStore = types
  .model({
    timeseries: TimeSeriesModel,
  })
  .volatile(() => ({
    task: { dataObj: {} },
    annotationStore: {
      initialized: true,
      selected: {},
      root: {},
      names: [],
      addErrors: jest.fn(),
    },
  }));

// Set up feature flags
ff.setup();

describe("TimeSeries brush range calculation", () => {
  // creating models can be a long one, so all tests will share one model
  const model = TimeSeriesModel.create(
    {
      name: "timeseries",
      value: "$timeseries",
      sync: "video1",
      timeformat: "",
      defaultwidth: "100%",
      timecolumn: "time",
      children: [],
    },
    mockEnv,
  );
  const store = MockStore.create({ timeseries: model }, mockEnv);

  // Set up test data with proper structure
  const times = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  store.task.dataObj = {
    timeseries: {
      time: times,
      value: times.map((t) => t * 2),
    },
  };
  model.updateValue(store);

  it("returns full range if times.length < MIN_POINTS_ON_SCREEN", () => {
    const result = model.calculateInitialBrushRange(times);
    expect(result).toEqual([0, 9]);
  });

  it("returns expanded range if initial range is too small", () => {
    const times = Array.from({ length: 20 }, (_, i) => i);
    store.task.dataObj = {
      timeseries: {
        time: times,
        value: times.map((t) => t * 2),
      },
    };
    model.updateValue(store);

    // defaultOverviewWidth = [0, 0.05] would only select 1-2 points
    const result = model.calculateInitialBrushRange(times, [0, 0.05]);
    // Should expand to at least 10 points
    expect(result[1] - result[0] + 1).toBeGreaterThanOrEqual(10);
  });

  it("returns range based on defaultOverviewWidth", () => {
    const times = Array.from({ length: 20 }, (_, i) => i);
    store.task.dataObj = {
      timeseries: {
        time: times,
        value: times.map((t) => t * 2),
      },
    };
    model.updateValue(store);

    // With defaultOverviewWidth = [0, 0.5], for 20 points:
    // startIndex = Math.round((20 - 1) * 0) = 0
    // endIndex = Math.round((20 - 1) * 0.5) = 9
    const result = model.calculateInitialBrushRange(times, [0, 0.5]);
    expect(result).toEqual([0, 9]); // Not 10, because endIndex is calculated as 9
  });
});

describe("TimeSeries time parsing", () => {
  const model = TimeSeriesModel.create(
    {
      name: "timeseries",
      timeformat: "%Y-%m-%d %H:%M:%S.%L",
      value: "$timeseries",
      sync: "video1",
      defaultwidth: "100%",
      timecolumn: "time",
      children: [],
    },
    mockEnv,
  );
  const store = MockStore.create({ timeseries: model }, mockEnv);

  it("parses millisecond timestamps into unix timestamps", () => {
    const value = "2024-07-15 12:34:56.123";
    const parsed = model.parseTime(value);
    const expected = d3.utcParse("%Y-%m-%d %H:%M:%S.%L")(value).getTime();
    expect(parsed).toBe(expected);
  });

  it("parses microseconds as milliseconds", () => {
    const modelWithMicros = TimeSeriesModel.create(
      {
        name: "timeseries",
        timeformat: "%Y-%m-%d %H:%M:%S.%f",
        value: "$timeseries",
        sync: "video1",
        defaultwidth: "100%",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    const storeWithMicros = MockStore.create({ timeseries: modelWithMicros }, mockEnv);

    const value = "2024-07-15 12:34:56.123456";
    const parsed = modelWithMicros.parseTime(value);
    // Should parse as if it were "2024-07-15 12:34:56.123"
    const expected = d3.utcParse("%Y-%m-%d %H:%M:%S.%L")("2024-07-15 12:34:56.123").getTime();
    expect(parsed).toBe(expected);
  });

  it("returns numeric values as-is when no timeformat is specified", () => {
    const modelNoFormat = TimeSeriesModel.create(
      {
        name: "timeseries",
        timeformat: "",
        value: "$timeseries",
        sync: "video1",
        defaultwidth: "100%",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    const storeNoFormat = MockStore.create({ timeseries: modelNoFormat }, mockEnv);

    const time = 1234.56;
    expect(modelNoFormat.parseTime(time)).toBe(time);
  });
});

describe("TimeSeries fractional seconds padding", () => {
  const model = TimeSeriesModel.create(
    {
      name: "timeseries",
      timeformat: "%Y-%m-%d %H:%M:%S.%L",
      value: "$timeseries",
      sync: "video1",
      defaultwidth: "100%",
      timecolumn: "time",
      children: [],
    },
    mockEnv,
  );
  const store = MockStore.create({ timeseries: model }, mockEnv);

  it("should pad single digit fractional seconds to 3 digits", () => {
    // Set up test data with single digit fractional seconds
    const testData = {
      time: ["2025-07-06 16:35:17.0", "2025-07-06 16:35:18.5"],
      value: [1, 1.5],
    };

    store.task.dataObj = { timeseries: testData };
    model.setData(testData);

    // Get the processed data object which should have padded timestamps
    const dataObj = model.dataObj;
    expect(dataObj).toBeTruthy();
    expect(dataObj.time).toBeDefined();

    // Verify that single digit fractional seconds are padded to 3 digits
    const expectedTimestamps = [
      d3.utcParse("%Y-%m-%d %H:%M:%S.%L")("2025-07-06 16:35:17.000").getTime(),
      d3.utcParse("%Y-%m-%d %H:%M:%S.%L")("2025-07-06 16:35:18.500").getTime(),
    ];

    expect(dataObj.time).toEqual(expectedTimestamps);
  });

  it("should pad two digit fractional seconds to 3 digits", () => {
    // Set up test data with two digit fractional seconds
    const testData = {
      time: ["2025-07-06 16:35:17.12", "2025-07-06 16:35:18.99"],
      value: [1, 1.5],
    };

    store.task.dataObj = { timeseries: testData };
    model.setData(testData);

    const dataObj = model.dataObj;
    expect(dataObj).toBeTruthy();

    // Verify that two digit fractional seconds are padded to 3 digits
    const expectedTimestamps = [
      d3.utcParse("%Y-%m-%d %H:%M:%S.%L")("2025-07-06 16:35:17.120").getTime(),
      d3.utcParse("%Y-%m-%d %H:%M:%S.%L")("2025-07-06 16:35:18.990").getTime(),
    ];

    expect(dataObj.time).toEqual(expectedTimestamps);
  });

  it("should leave three digit fractional seconds unchanged", () => {
    // Set up test data with already correct 3 digit fractional seconds
    const testData = {
      time: ["2025-07-06 16:35:17.123", "2025-07-06 16:35:18.456"],
      value: [1, 1.5],
    };

    store.task.dataObj = { timeseries: testData };
    model.setData(testData);

    const dataObj = model.dataObj;
    expect(dataObj).toBeTruthy();

    // Verify that 3 digit fractional seconds remain unchanged
    const expectedTimestamps = [
      d3.utcParse("%Y-%m-%d %H:%M:%S.%L")("2025-07-06 16:35:17.123").getTime(),
      d3.utcParse("%Y-%m-%d %H:%M:%S.%L")("2025-07-06 16:35:18.456").getTime(),
    ];

    expect(dataObj.time).toEqual(expectedTimestamps);
  });

  it("should handle microseconds and pad remaining digits correctly", () => {
    const modelWithMicros = TimeSeriesModel.create(
      {
        name: "timeseries",
        timeformat: "%Y-%m-%d %H:%M:%S.%f",
        value: "$timeseries",
        sync: "video1",
        defaultwidth: "100%",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    const storeWithMicros = MockStore.create({ timeseries: modelWithMicros }, mockEnv);

    // Test data mixing microseconds and shorter fractional seconds
    const testData = {
      time: [
        "2025-07-06 16:35:17.123456", // 6 digits - should truncate to .123
        "2025-07-06 16:35:18.0", // 1 digit - should pad to .000
        "2025-07-06 16:35:19.12", // 2 digits - should pad to .120
      ],
      value: [1, 1.5, 2],
    };

    storeWithMicros.task.dataObj = { timeseries: testData };
    modelWithMicros.setData(testData);

    const dataObj = modelWithMicros.dataObj;
    expect(dataObj).toBeTruthy();

    // Verify microseconds are truncated and other values are padded
    const expectedTimestamps = [
      d3.utcParse("%Y-%m-%d %H:%M:%S.%L")("2025-07-06 16:35:17.123").getTime(),
      d3.utcParse("%Y-%m-%d %H:%M:%S.%L")("2025-07-06 16:35:18.000").getTime(),
      d3.utcParse("%Y-%m-%d %H:%M:%S.%L")("2025-07-06 16:35:19.120").getTime(),
    ];

    expect(dataObj.time).toEqual(expectedTimestamps);
  });

  it("should handle timestamps without fractional seconds", () => {
    // Create a model with timeFormat that doesn't expect fractional seconds
    const modelNoFractional = TimeSeriesModel.create(
      {
        name: "timeseries",
        timeformat: "%Y-%m-%d %H:%M:%S", // No .%L here
        value: "$timeseries",
        sync: "video1",
        defaultwidth: "100%",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    const storeNoFractional = MockStore.create({ timeseries: modelNoFractional }, mockEnv);

    // Test data with no decimal points
    const testData = {
      time: ["2025-07-06 16:35:17", "2025-07-06 16:35:18"],
      value: [1, 1.5],
    };

    storeNoFractional.task.dataObj = { timeseries: testData };
    modelNoFractional.setData(testData);

    const dataObj = modelNoFractional.dataObj;
    expect(dataObj).toBeTruthy();

    // Verify timestamps without decimals are processed normally
    // These should pass through D3 parsing without our padding logic
    const expectedTimestamps = [
      d3.utcParse("%Y-%m-%d %H:%M:%S")("2025-07-06 16:35:17").getTime(),
      d3.utcParse("%Y-%m-%d %H:%M:%S")("2025-07-06 16:35:18").getTime(),
    ];

    expect(dataObj.time).toEqual(expectedTimestamps);
  });

  it("should handle mixed fractional second formats in the same dataset", () => {
    // Test data with various fractional second formats
    const testData = {
      time: [
        "2025-07-06 16:35:17.0", // 1 digit
        "2025-07-06 16:35:17.5", // 1 digit
        "2025-07-06 16:35:18.0", // 1 digit
        "2025-07-06 16:35:18.5", // 1 digit
        "2025-07-06 16:35:19.0", // 1 digit
      ],
      value: [1, 1.5, 1, 2.5, 1.5],
    };

    store.task.dataObj = { timeseries: testData };
    model.setData(testData);

    const dataObj = model.dataObj;
    expect(dataObj).toBeTruthy();

    // This matches the exact example from the user's request
    const expectedTimestamps = [
      d3.utcParse("%Y-%m-%d %H:%M:%S.%L")("2025-07-06 16:35:17.000").getTime(),
      d3.utcParse("%Y-%m-%d %H:%M:%S.%L")("2025-07-06 16:35:17.500").getTime(),
      d3.utcParse("%Y-%m-%d %H:%M:%S.%L")("2025-07-06 16:35:18.000").getTime(),
      d3.utcParse("%Y-%m-%d %H:%M:%S.%L")("2025-07-06 16:35:18.500").getTime(),
      d3.utcParse("%Y-%m-%d %H:%M:%S.%L")("2025-07-06 16:35:19.000").getTime(),
    ];

    expect(dataObj.time).toEqual(expectedTimestamps);
  });
});

describe("TimeSeries playback", () => {
  const model = TimeSeriesModel.create(
    {
      name: "timeseries",
      value: "$timeseries",
      sync: "video1",
      timeformat: "",
      defaultwidth: "100%",
      timecolumn: "time", // This is important for keyColumn
      children: [],
    },
    mockEnv,
  );
  const store = MockStore.create({ timeseries: model }, mockEnv);

  // Store original window functions
  const originalRequestAnimationFrame = global.requestAnimationFrame;
  const originalCancelAnimationFrame = global.cancelAnimationFrame;
  const originalPerformanceNow = performance.now;

  beforeAll(() => {
    // Ensure performance.now mock is in place
    jest.spyOn(performance, "now").mockImplementation(() => 1000);
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up other mocks
    global.requestAnimationFrame = jest.fn().mockReturnValue(1); // Return a frame ID
    global.cancelAnimationFrame = jest.fn();

    // Set up test data with proper structure
    const times = [0, 20, 40, 60, 80, 100];
    const data = {
      time: times, // Must match timecolumn
      value: times.map((t) => t * 2),
    };

    // Initialize the model with the data
    model.setData(data); // This also sets valueLoaded to true
    model.setColumnNames(["time", "value"]);

    // Set up required view properties
    model.updateCanvasWidth(1000);

    // Verify data is properly set up
    expect(model.dataObj).toBeTruthy();
    expect(model.dataObj.time).toEqual(times);
    expect(model.keysRange).toEqual([0, 100]);

    // Set up view range
    model.updateTR([0, 100]); // Set initial time range
    expect(model.brushRange).toEqual([0, 100]);
    expect(model.canvasWidth).toBe(1000);

    // Register sync handlers
    model.registerSyncHandlers();
  });

  afterEach(() => {
    // Restore original functions
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  afterAll(() => {
    // Restore all mocks
    jest.restoreAllMocks();
    performance.now = originalPerformanceNow;
  });

  it("should start playback", () => {
    // Initial state
    expect(model.isPlaying).toBe(false);
    expect(model.playStartTime).toBeNull();
    expect(model.playStartPosition).toBeNull();
    expect(model.playbackSpeed).toBe(1);

    // Verify mock is working
    expect(performance.now()).toBe(1000);

    // Start playback
    const data = { time: 50, speed: 2 };
    model._handlePlay(data);

    // Verify playback state
    expect(model.isPlaying).toBe(true);
    expect(model.playStartPosition).toBe(50);
    expect(model.playStartTime).toBe(1000); // From our mock
    expect(model.playbackSpeed).toBe(2);
    expect(global.requestAnimationFrame).toHaveBeenCalledWith(model.playbackLoop);
  });

  it("should pause playback", () => {
    // Start playback first
    model._handlePlay({ time: 50, speed: 2 });
    expect(model.isPlaying).toBe(true);
    expect(model.animationFrameId).toBe(1); // Check for specific frame ID

    // Pause playback
    model._handlePause({ time: 60 });

    // Verify paused state
    expect(model.isPlaying).toBe(false);
    expect(model.playStartTime).toBeNull();
    expect(model.playStartPosition).toBeNull();
    expect(global.cancelAnimationFrame).toHaveBeenCalledWith(1); // Check frame ID was passed
    expect(model.animationFrameId).toBeNull();
  });

  it("should update view during playback loop", () => {
    // Set initial time to 0
    jest.spyOn(performance, "now").mockImplementation(() => 0);

    // Start playback at position 50
    const data = { time: 50, speed: 2 };
    model._handlePlay(data);

    // Verify initial playback state
    expect(model.isPlaying).toBe(true);
    expect(model.playStartPosition).toBe(50);
    expect(model.playStartTime).toBe(0); // Initial time
    expect(model.playbackSpeed).toBe(2);

    // Mock performance.now() to return a time 1 second later
    jest.spyOn(performance, "now").mockImplementation(() => 1000);

    // Run playback loop
    model.playbackLoop();

    // With 1 second elapsed and speed=2, we should have moved 2 seconds forward
    // from position 50, so we should be at position 52
    expect(model.cursorTime).toBe(52);
    expect(model.isPlaying).toBe(true);
    expect(global.requestAnimationFrame).toHaveBeenCalledWith(model.playbackLoop);
  });
});

describe("TimeSeries overviewChannels filtering", () => {
  it("should return all channels when overviewChannels is not set", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        valuetype: "json",
        timecolumn: "time",
        overviewchannels: "",
        children: [
          { type: "channel", column: "channel1" },
          { type: "channel", column: "channel2" },
          { type: "channel", column: "channel3" },
        ],
      },
      mockEnv,
    );

    const store = MockStore.create({ timeseries: model }, mockEnv);
    model.setColumnNames(["time", "channel1", "channel2", "channel3"]);

    const filtered = model.filteredOverviewChannels;

    expect(filtered).toEqual(["channel1", "channel2", "channel3"]);
    expect(filtered.length).toBe(3);
  });

  it("should filter channels by name when overviewChannels is set", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        valuetype: "json",
        timecolumn: "time",
        overviewchannels: "channel1,channel3",
        children: [
          { type: "channel", column: "channel1" },
          { type: "channel", column: "channel2" },
          { type: "channel", column: "channel3" },
        ],
      },
      mockEnv,
    );

    const store = MockStore.create({ timeseries: model }, mockEnv);
    model.setColumnNames(["time", "channel1", "channel2", "channel3"]);

    const filtered = model.filteredOverviewChannels;

    expect(filtered).toEqual(["channel1", "channel3"]);
    expect(filtered.length).toBe(2);
    expect(filtered).not.toContain("channel2");
  });

  it("should filter channels by numeric index when overviewChannels uses indices", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        valuetype: "json",
        timecolumn: "time",
        overviewchannels: "1,3",
        children: [
          { type: "channel", column: "velocity" },
          { type: "channel", column: "acceleration" },
          { type: "channel", column: "temperature" },
        ],
      },
      mockEnv,
    );

    const store = MockStore.create({ timeseries: model }, mockEnv);
    // Headers array: [0: "time", 1: "velocity", 2: "acceleration", 3: "temperature"]
    model.setColumnNames(["time", "velocity", "acceleration", "temperature"]);

    const filtered = model.filteredOverviewChannels;

    // Should map index 1 -> "velocity", index 3 -> "temperature"
    expect(filtered).toEqual(["velocity", "temperature"]);
    expect(filtered.length).toBe(2);
    expect(filtered).not.toContain("acceleration");
  });

  it("should handle case-insensitive channel names", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        valuetype: "json",
        timecolumn: "time",
        overviewchannels: "VELOCITY,Acceleration",
        children: [
          { type: "channel", column: "velocity" },
          { type: "channel", column: "acceleration" },
          { type: "channel", column: "temperature" },
        ],
      },
      mockEnv,
    );

    const store = MockStore.create({ timeseries: model }, mockEnv);
    model.setColumnNames(["time", "velocity", "acceleration", "temperature"]);

    const filtered = model.filteredOverviewChannels;

    expect(filtered).toEqual(["velocity", "acceleration"]);
    expect(filtered.length).toBe(2);
  });

  it("should handle whitespace in overviewChannels", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        valuetype: "json",
        timecolumn: "time",
        overviewchannels: " channel1 , channel2 ",
        children: [
          { type: "channel", column: "channel1" },
          { type: "channel", column: "channel2" },
          { type: "channel", column: "channel3" },
        ],
      },
      mockEnv,
    );

    const store = MockStore.create({ timeseries: model }, mockEnv);
    model.setColumnNames(["time", "channel1", "channel2", "channel3"]);

    const filtered = model.filteredOverviewChannels;

    expect(filtered).toEqual(["channel1", "channel2"]);
    expect(filtered.length).toBe(2);
  });

  it("should filter out invalid channel names", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        valuetype: "json",
        timecolumn: "time",
        overviewchannels: "channel1,invalidChannel,channel2",
        children: [
          { type: "channel", column: "channel1" },
          { type: "channel", column: "channel2" },
          { type: "channel", column: "channel3" },
        ],
      },
      mockEnv,
    );

    const store = MockStore.create({ timeseries: model }, mockEnv);
    model.setColumnNames(["time", "channel1", "channel2", "channel3"]);

    const filtered = model.filteredOverviewChannels;

    // Should only include valid channels
    expect(filtered).toEqual(["channel1", "channel2"]);
    expect(filtered.length).toBe(2);
    expect(filtered).not.toContain("invalidChannel");
    expect(filtered).not.toContain("channel3");
  });

  it("should return all channels when all specified channels are invalid", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        valuetype: "json",
        timecolumn: "time",
        overviewchannels: "invalid1,invalid2",
        children: [
          { type: "channel", column: "channel1" },
          { type: "channel", column: "channel2" },
        ],
      },
      mockEnv,
    );

    const store = MockStore.create({ timeseries: model }, mockEnv);
    model.setColumnNames(["time", "channel1", "channel2"]);

    const filtered = model.filteredOverviewChannels;

    // When all channels are invalid, should return all channels (fallback behavior)
    expect(filtered).toEqual(["channel1", "channel2"]);
  });

  it("should handle single channel in overviewChannels", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        valuetype: "json",
        timecolumn: "time",
        overviewchannels: "channel2",
        children: [
          { type: "channel", column: "channel1" },
          { type: "channel", column: "channel2" },
          { type: "channel", column: "channel3" },
        ],
      },
      mockEnv,
    );

    const store = MockStore.create({ timeseries: model }, mockEnv);
    model.setColumnNames(["time", "channel1", "channel2", "channel3"]);

    const filtered = model.filteredOverviewChannels;

    expect(filtered).toEqual(["channel2"]);
    expect(filtered.length).toBe(1);
  });

  it("should handle mixed numeric indices and channel names", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        valuetype: "json",
        timecolumn: "time",
        overviewchannels: "1,channel3",
        children: [
          { type: "channel", column: "velocity" },
          { type: "channel", column: "acceleration" },
          { type: "channel", column: "channel3" },
        ],
      },
      mockEnv,
    );

    const store = MockStore.create({ timeseries: model }, mockEnv);
    // Headers: [0: "time", 1: "velocity", 2: "acceleration", 3: "channel3"]
    model.setColumnNames(["time", "velocity", "acceleration", "channel3"]);

    const filtered = model.filteredOverviewChannels;

    // Index 1 maps to "velocity", "channel3" is used directly
    expect(filtered).toEqual(["velocity", "channel3"]);
    expect(filtered.length).toBe(2);
  });

  it("should handle headless CSV with numeric column indices", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        valuetype: "json",
        timecolumn: "0",
        overviewchannels: "1,2",
        children: [
          { type: "channel", column: "1" },
          { type: "channel", column: "2" },
          { type: "channel", column: "3" },
        ],
      },
      mockEnv,
    );

    const store = MockStore.create({ timeseries: model }, mockEnv);
    // Headless CSV: headers are numeric strings ["0", "1", "2", "3"]
    model.setColumnNames(["0", "1", "2", "3"]);

    const filtered = model.filteredOverviewChannels;

    // For headless CSV, numeric indices map to header names
    expect(filtered).toEqual(["1", "2"]);
    expect(filtered.length).toBe(2);
  });
});

describe("TimeSeries view getters and defaultOverviewWidth", () => {
  it("defaultOverviewWidth returns [0, 0.25] for default overviewwidth 25%", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        overviewwidth: "25%",
        children: [],
      },
      mockEnv,
    );
    expect(model.defaultOverviewWidth).toEqual([0, 0.25]);
  });

  it("defaultOverviewWidth caps overviewwidth at 100%", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        overviewwidth: "150%",
        children: [],
      },
      mockEnv,
    );
    expect(model.defaultOverviewWidth).toEqual([0, 1]);
  });

  it("expandRangeToMinimumPoints expands range when too few points", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        overviewwidth: "2%",
        children: [],
      },
      mockEnv,
    );
    const times = Array.from({ length: 100 }, (_, i) => i);
    const smallRange = [5, 7];
    const result = model.expandRangeToMinimumPoints(times, smallRange, 10);
    expect(result[1] - result[0]).toBeGreaterThanOrEqual(9);
  });

  it("isNotReady is true when brushRange is missing", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    expect(model.isNotReady).toBe(true);
  });

  it("centerTime returns midpoint of brushRange", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.updateTR([10, 30]);
    expect(model.centerTime).toBe(20);
  });

  it("keyColumn returns timecolumn lowercased or fallback", () => {
    const withCol = TimeSeriesModel.create({ name: "ts", value: "$x", timecolumn: "Time", children: [] }, mockEnv);
    expect(withCol.keyColumn).toBe("time");
    const noCol = TimeSeriesModel.create({ name: "ts", value: "$x", children: [] }, mockEnv);
    expect(noCol.keyColumn).toBe("#@$");
  });

  it("isDate is true when timeformat or timedisplayformat has letter", () => {
    const withFormat = TimeSeriesModel.create(
      { name: "ts", value: "$x", timeformat: "%Y", timecolumn: "t", children: [] },
      mockEnv,
    );
    expect(withFormat.isDate).toBe(true);
    const withDisplay = TimeSeriesModel.create(
      { name: "ts", value: "$x", timedisplayformat: "date", timecolumn: "t", children: [] },
      mockEnv,
    );
    expect(withDisplay.isDate).toBe(true);
    const numeric = TimeSeriesModel.create({ name: "ts", value: "$x", timecolumn: "t", children: [] }, mockEnv);
    expect(Boolean(numeric.isDate)).toBe(false);
  });

  it("channelsMap and channels return child channels", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [
          { type: "channel", column: "a" },
          { type: "channel", column: "b" },
        ],
      },
      mockEnv,
    );
    expect(Object.keys(model.channelsMap)).toEqual(["a", "b"]);
    expect(model.channels.length).toBe(2);
  });
});

describe("TimeSeries dataObj autogenerated indices and errors", () => {
  it("dataObj uses autogenerated indices when timecolumn is empty", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "",
        children: [],
      },
      mockEnv,
    );
    const data = { value: [10, 20, 30] };
    model.setData(data);
    expect(model.dataObj).toBeTruthy();
    expect(model.dataObj["#@$"]).toEqual([0, 1, 2]);
  });

  it("dataObj throws when timecolumn has non-numeric values and no timeformat", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        timeformat: "",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: ["a", "b", "c"], value: [1, 2, 3] });
    expect(() => model.dataObj).toThrow(/timeColumn.*non-numbers|timeFormat/);
  });

  it("dataObj throws when timestamps are not sequential", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        timeformat: "",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 2, 1], value: [1, 2, 3] });
    expect(() => model.dataObj).toThrow(/incremental and sequentially ordered/);
  });

  it("dataHash and keysRange reflect dataObj", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 10, 20], value: [1, 2, 3] });
    expect(model.keysRange).toEqual([0, 20]);
    const hash = model.dataHash;
    expect(hash).toBeTruthy();
    expect(hash.length).toBe(3);
  });
});

describe("TimeSeries formatTime and formatDuration", () => {
  it("formatTime uses timedisplayformat when set", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        timedisplayformat: ".0f",
        children: [],
      },
      mockEnv,
    );
    expect(model.formatTime(123.456)).toBe("123");
  });

  it("formatDuration uses durationdisplayformat when set", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        durationdisplayformat: ".1f",
        children: [],
      },
      mockEnv,
    );
    expect(model.formatDuration(5.67)).toBe("5.7");
  });
});

describe("TimeSeries actions and panView", () => {
  it("updateTR sets brushRange and initialRange", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 100], value: [1, 2] });
    model.updateCanvasWidth(800);
    model.updateTR([10, 90]);
    expect(model.brushRange).toEqual([10, 90]);
    expect(model.initialRange).toEqual([10, 90]);
  });

  it("setCursor and setCursorAndSeek update cursorTime and seekTo", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setCursor(50);
    expect(model.cursorTime).toBe(50);
    expect(model.seekTo).toBeNull();
    model.setCursorAndSeek(60);
    expect(model.cursorTime).toBe(60);
    expect(model.seekTo).toBe(60);
  });

  it("resetSeekTo and setSuppressSync work", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setCursorAndSeek(50);
    model.resetSeekTo();
    expect(model.seekTo).toBeNull();
    model.setSuppressSync(true);
    expect(model.suppressSync).toBe(true);
  });

  it("panView shifts brush range within keysRange", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 100], value: Array(101).fill(0) });
    model.updateCanvasWidth(800);
    model.updateTR([20, 60]);
    model.panView(0.5);
    expect(model.brushRange[0]).toBeGreaterThan(20);
    expect(model.brushRange[1]).toBeGreaterThan(60);
  });
});

describe("TimeSeries _handleSeek and _updateViewForTime", () => {
  it("_handleSeek updates view for numeric time", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    const store = MockStore.create({ timeseries: model }, mockEnv);
    model.setData({ time: [0, 50, 100], value: [1, 2, 3] });
    model.setColumnNames(["time", "value"]);
    model.updateCanvasWidth(1000);
    model.updateTR([0, 100]);
    model.registerSyncHandlers();
    model._handleSeek({ time: 25 });
    expect(model.seekTo).toBe(25);
    expect(model.cursorTime).toBe(25);
  });

  it("_handleSeek ignores invalid data.time", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 100], value: [1, 2] });
    model.updateCanvasWidth(800);
    model.updateTR([0, 100]);
    const before = [...model.brushRange];
    model._handleSeek({ time: Number.NaN });
    model._handleSeek({ time: "not a number" });
    expect(model.brushRange).toEqual(before);
  });
});

describe("TimeSeries updateValue and updateTR", () => {
  it("updateValue does not overwrite brushRange when already set", async () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    const store = MockStore.create({ timeseries: model }, mockEnv);
    model.setData({ time: [0, 10, 20, 30], value: [1, 2, 3, 4] });
    model.updateCanvasWidth(800);
    model.updateTR([5, 25]);
    const rangeBefore = [...model.brushRange];
    await model.updateValue(store);
    expect(model.brushRange).toEqual(rangeBefore);
  });

  it("updateTR ignores null", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 100], value: [1, 2] });
    model.updateTR([10, 90]);
    model.updateTR(null);
    expect(model.brushRange).toEqual([10, 90]);
  });

  it("throttledRangeUpdate returns a function", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    const throttled = model.throttledRangeUpdate();
    expect(typeof throttled).toBe("function");
  });
});

describe("TimeSeries scrollToRegion and emitSeekSync", () => {
  it("scrollToRegion updates view when region is outside current brush", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 25, 50, 75, 100], value: [1, 2, 3, 4, 5] });
    model.updateCanvasWidth(800);
    model.updateTR([0, 25]);
    const mockRegion = { start: 60, end: 80 };
    model.scrollToRegion(mockRegion);
    expect(model.brushRange[0]).toBeLessThanOrEqual(60);
    expect(model.brushRange[1]).toBeGreaterThanOrEqual(80);
  });

  it("scrollToRegion is no-op when region already in view", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 50, 100], value: [1, 2, 3] });
    model.updateTR([10, 90]);
    const before = [...model.brushRange];
    model.scrollToRegion({ start: 30, end: 60 });
    expect(model.brushRange).toEqual(before);
  });

  it("emitSeekSync is no-op when suppressSync is true", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        sync: "video1",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 50, 100], value: [1, 2, 3] });
    model.updateTR([10, 90]);
    model.setSuppressSync(true);
    expect(() => model.emitSeekSync()).not.toThrow();
  });
});

describe("TimeSeries restartPlaybackFromTime", () => {
  it("restartPlaybackFromTime updates play position when playing", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 50, 100], value: [1, 2, 3] });
    model.setColumnNames(["time", "value"]);
    model.updateCanvasWidth(1000);
    model.updateTR([0, 100]);
    model.registerSyncHandlers();
    model._handlePlay({ time: 25, speed: 1 });
    expect(model.isPlaying).toBe(true);
    model.restartPlaybackFromTime(60);
    expect(model.playStartPosition).toBe(60);
  });

  it("restartPlaybackFromTime is no-op when not playing", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 100], value: [1, 2] });
    model.updateTR([0, 100]);
    model.restartPlaybackFromTime(50);
    expect(model.isPlaying).toBe(false);
  });
});

describe("TimeSeries playbackLoop boundary and formatTime date", () => {
  it("playbackLoop stops at maxKey when target exceeds end", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 50, 100], value: [1, 2, 3] });
    model.setColumnNames(["time", "value"]);
    model.updateCanvasWidth(1000);
    model.updateTR([0, 100]);
    model.registerSyncHandlers();
    jest.spyOn(performance, "now").mockImplementation(() => 0);
    model._handlePlay({ time: 95, speed: 100 });
    jest.spyOn(performance, "now").mockImplementation(() => 10000);
    model.playbackLoop();
    expect(model.isPlaying).toBe(false);
    expect(model.cursorTime).toBe(100);
  });

  it("formatTime uses formatTrackerTime when timedisplayformat is date", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        timedisplayformat: "date",
        children: [],
      },
      mockEnv,
    );
    const result = model.formatTime(1700000000000);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("TimeSeries persistentValues, dataSlices, and panView no-op", () => {
  it("persistentValues and persistentFingerprint return expected shape", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 100], value: [1, 2] });
    model.updateTR([10, 90]);
    const persistent = model.persistentValues;
    expect(persistent).toHaveProperty("brushRange");
    expect(persistent).toHaveProperty("initialRange");
    expect(persistent).toHaveProperty("scale");
    const fp = model.persistentFingerprint;
    expect(fp).toHaveProperty("task");
  });

  it("dataSlices returns array of slices", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], value: Array(11).fill(1) });
    const slices = model.dataSlices;
    expect(Array.isArray(slices)).toBe(true);
    expect(slices.length).toBe(10);
  });

  it("panView is no-op when keysRange is missing", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.updateTR([10, 90]);
    model.panView(0.1);
    expect(model.brushRange).toEqual([10, 90]);
  });
});

describe("TimeSeries dataObj parse failure and updateValue errors", () => {
  it("dataObj throws when timeformat cannot parse first values", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        timeformat: "%Y-%m-%d",
        children: [],
      },
      mockEnv,
    );
    model.setData({
      time: ["not-a-date", "also-invalid", "2020-01-03"],
      value: [1, 2, 3],
    });
    expect(() => model.dataObj).toThrow(/timeColumn.*cannot be parsed|timeFormat/);
  });

  it("updateValue calls addErrors when keyColumn not in data", async () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "missingColumn",
        children: [],
      },
      mockEnv,
    );
    const store = MockStore.create({ timeseries: model }, mockEnv);
    model.setData({ otherColumn: [1, 2, 3] });
    await model.updateValue(store);
    expect(store.annotationStore.addErrors).toHaveBeenCalled();
    const callArg = store.annotationStore.addErrors.mock.calls[0][0][0];
    expect(callArg.value || callArg.message || "").toMatch(/missingColumn|undefined/);
  });

  it("updateValue calls addErrors when dataObj getter throws", async () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        timeformat: "",
        children: [],
      },
      mockEnv,
    );
    const store = MockStore.create({ timeseries: model }, mockEnv);
    model.setData({ time: ["a", "b"], value: [1, 2] });
    await model.updateValue(store);
    expect(store.annotationStore.addErrors).toHaveBeenCalled();
  });
});

describe("TimeSeries preloadValue", () => {
  it("preloadValue with valuetype json uses parseValue and setData", async () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$data",
        valuetype: "json",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    const store = MockStore.create({ timeseries: model }, mockEnv);
    store.task.dataObj = { data: { time: [0, 10, 20], value: [1, 2, 3] } };
    await model.preloadValue(store);
    expect(model.valueLoaded).toBe(true);
    expect(model.data).toEqual({ time: [0, 10, 20], value: [1, 2, 3] });
  });

  it("preloadValue with valuetype url and no value calls addErrors", async () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "",
        valuetype: "url",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    const store = MockStore.create({ timeseries: model }, mockEnv);
    await model.preloadValue(store);
    expect(store.annotationStore.addErrors).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          value: expect.stringContaining("value"),
        }),
      ]),
    );
  });

  it("preloadValue with valuetype url and url not string calls addErrors", async () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$missing",
        valuetype: "url",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    const store = MockStore.create({ timeseries: model }, mockEnv);
    store.task.dataObj = {};
    await model.preloadValue(store);
    expect(store.annotationStore.addErrors).toHaveBeenCalled();
  });
});

describe("TimeSeries _handlePause isDate and playbackLoop minKey", () => {
  it("_handlePause converts time with isDate (ms to relative)", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        timeformat: "%Y-%m-%d",
        children: [],
      },
      mockEnv,
    );
    model.setData({
      time: ["2020-01-01", "2020-01-02", "2020-01-03"],
      value: [1, 2, 3],
    });
    model.setColumnNames(["time", "value"]);
    model.updateCanvasWidth(1000);
    const baseTime = model.keysRange[0];
    model.updateTR([baseTime, baseTime + 86400000 * 2]);
    model.registerSyncHandlers();
    model._handlePlay({ time: 0, speed: 1 });
    model._handlePause({ time: 86400 });
    expect(model.isPlaying).toBe(false);
    expect(model.seekTo).toBe(baseTime + 86400000);
  });

  it("playbackLoop stops at minKey when target is before start", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 50, 100], value: [1, 2, 3] });
    model.setColumnNames(["time", "value"]);
    model.updateCanvasWidth(1000);
    model.updateTR([0, 100]);
    model.registerSyncHandlers();
    jest.spyOn(performance, "now").mockImplementation(() => 0);
    model._handlePlay({ time: -10, speed: 1 });
    jest.spyOn(performance, "now").mockImplementation(() => 5000);
    model.playbackLoop();
    expect(model.isPlaying).toBe(false);
    expect(model.cursorTime).toBe(0);
  });
});

describe("TimeSeries emitSeekSync and plotClickHandler", () => {
  it("emitSeekSync runs when sync set and not playing", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        sync: "video1",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 50, 100], value: [1, 2, 3] });
    model.setSuppressSync(false);
    model.updateTR([10, 90]);
    expect(model.centerTime).toBe(50);
    expect(model.sync).toBe("video1");
    expect(model.isPlaying).toBe(false);
    expect(() => model.emitSeekSync()).not.toThrow();
  });

  it("plotClickHandler updates cursor when click inside view", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        sync: "video1",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 25, 50, 75, 100], value: [1, 2, 3, 4, 5] });
    model.updateCanvasWidth(1000);
    model.updateTR([0, 100]);
    model.plotClickHandler(50);
    expect(model.cursorTime).toBe(50);
  });

  it("plotClickHandler recenters view when click outside", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        sync: "video1",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 50, 100], value: [1, 2, 3] });
    model.updateCanvasWidth(1000);
    model.updateTR([0, 30]);
    model.plotClickHandler(80);
    expect(model.brushRange[0]).toBeLessThanOrEqual(80);
    expect(model.brushRange[1]).toBeGreaterThanOrEqual(80);
  });
});

describe("TimeSeries _updateViewForTime and regionsTimeRanges", () => {
  it("_updateViewForTime is no-op for null or non-finite time", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 100], value: [1, 2] });
    model.updateCanvasWidth(800);
    model.updateTR([10, 90]);
    model._updateViewForTime(null);
    model._updateViewForTime(Number.NaN);
    expect(model.brushRange).toEqual([10, 90]);
  });

  it("regionsTimeRanges returns empty when no regions", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    expect(model.regionsTimeRanges).toEqual([]);
  });
});

describe("TimeSeries formatDuration with isDate", () => {
  it("formatDuration uses d3.utcFormat when format and isDate", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        timeformat: "%Y-%m-%d",
        durationdisplayformat: "%M:%S",
        children: [],
      },
      mockEnv,
    );
    const result = model.formatDuration(new Date("2020-01-01T00:01:30.000Z").getTime());
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("TimeSeries _handleSeek when isPlaying", () => {
  it("_handleSeek restarts playback loop when already playing", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 50, 100], value: [1, 2, 3] });
    model.setColumnNames(["time", "value"]);
    model.updateCanvasWidth(1000);
    model.updateTR([0, 100]);
    model.registerSyncHandlers();
    model._handlePlay({ time: 25, speed: 1 });
    expect(model.isPlaying).toBe(true);
    model._handleSeek({ time: 60 });
    expect(model.playStartPosition).toBe(60);
    expect(model.isPlaying).toBe(true);
  });
});

describe("TimeSeries panView clamp and plotClickHandler when playing", () => {
  it("panView clamps to minKey when panning left past start", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 25, 50, 75, 100], value: [1, 2, 3, 4, 5] });
    model.updateCanvasWidth(800);
    model.updateTR([10, 30]);
    model.panView(-1);
    expect(model.brushRange[0]).toBe(0);
    expect(model.brushRange[1]).toBe(20);
  });

  it("panView clamps to maxKey when panning right past end", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 25, 50, 75, 100], value: [1, 2, 3, 4, 5] });
    model.updateCanvasWidth(800);
    model.updateTR([70, 90]);
    model.panView(1);
    expect(model.brushRange[1]).toBe(100);
    expect(model.brushRange[0]).toBe(80);
  });

  it("plotClickHandler calls restartPlaybackFromTime when isPlaying", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        sync: "video1",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 50, 100], value: [1, 2, 3] });
    model.updateCanvasWidth(1000);
    model.updateTR([0, 100]);
    model._handlePlay({ time: 25, speed: 1 });
    model.plotClickHandler(60);
    expect(model.playStartPosition).toBe(60);
  });
});

describe("TimeSeries keysRange empty and dataHash null", () => {
  it("keysRange returns empty when key column has no values", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "",
        children: [],
      },
      mockEnv,
    );
    model.setData({ value: [] });
    expect(model.keysRange).toEqual([]);
  });

  it("dataHash returns null when dataObj is null", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    expect(model.dataHash).toBeNull();
  });
});

describe("TimeSeries setZoomedRange setScale updateView and parseTimeFn", () => {
  it("setZoomedRange and setScale update volatiles", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setZoomedRange(100);
    model.setScale(2);
    expect(model.zoomedRange).toBe(100);
    expect(model.scale).toBe(2);
  });

  it("updateView increments _needsUpdate", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    const before = model._needsUpdate;
    model.updateView();
    expect(model._needsUpdate).toBe(before + 1);
  });

  it("parseTimeFn returns Number when no timeformat", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    expect(model.parseTimeFn).toBe(Number);
  });

  it("parseTimeFn returns parser when timeformat and timecolumn set", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        timeformat: "%Y-%m-%d",
        children: [],
      },
      mockEnv,
    );
    expect(typeof model.parseTimeFn).toBe("function");
    expect(model.parseTimeFn("2020-01-01")).toBeInstanceOf(Date);
  });
});

describe("TimeSeries _updateViewForTime edge cases", () => {
  it("_updateViewForTime is no-op when canvasWidth is 0", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 100], value: [1, 2] });
    model.updateCanvasWidth(0);
    model.updateTR([10, 90]);
    model._updateViewForTime(50);
    expect(model.brushRange).toEqual([10, 90]);
  });

  it("_updateViewForTime recenters view when time maps to left edge", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 100], value: Array(101).fill(0) });
    model.updateCanvasWidth(100);
    model.updateTR([0, 100]);
    model._updateViewForTime(5);
    expect(model.seekTo).toBe(5);
    expect(model.cursorTime).toBe(5);
  });
});

describe("TimeSeries defaultOverviewWidth fallback and parseTime number", () => {
  it("defaultOverviewWidth uses default when overviewwidth has no %", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        overviewwidth: "50",
        children: [],
      },
      mockEnv,
    );
    expect(model.defaultOverviewWidth).toEqual([0, 0.25]);
  });

  it("parseTime returns number when parseTimeFn is Number", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    expect(model.parseTime(42)).toBe(42);
  });
});

describe("TimeSeries filteredOverviewChannels infers headers from dataObj", () => {
  it("filteredOverviewChannels uses dataObj keys as headers when headers not set", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        valuetype: "json",
        timecolumn: "0",
        overviewchannels: "1",
        children: [
          { type: "channel", column: "1" },
          { type: "channel", column: "2" },
        ],
      },
      mockEnv,
    );
    model.setData({ 0: [0, 1], 1: [10, 20], 2: [100, 200] });
    const filtered = model.filteredOverviewChannels;
    expect(filtered).toContain("1");
  });
});

describe("TimeSeries isNotReady and _handlePlay cancelAnimationFrame", () => {
  it("isNotReady is true when canvasWidth is 0", () => {
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 100], value: [1, 2] });
    model.updateTR([10, 90]);
    expect(model.isNotReady).toBe(true);
  });

  it("_handlePlay cancels previous animation frame when called again", () => {
    const cancelSpy = jest.spyOn(global, "cancelAnimationFrame").mockImplementation(() => {});
    const model = TimeSeriesModel.create(
      {
        name: "timeseries",
        value: "$timeseries",
        timecolumn: "time",
        children: [],
      },
      mockEnv,
    );
    model.setData({ time: [0, 50, 100], value: [1, 2, 3] });
    model.setColumnNames(["time", "value"]);
    model.updateCanvasWidth(1000);
    model.updateTR([0, 100]);
    model.registerSyncHandlers();
    model._handlePlay({ time: 10, speed: 1 });
    const frameId = model.animationFrameId;
    model._handlePlay({ time: 20, speed: 1 });
    expect(cancelSpy).toHaveBeenCalledWith(frameId);
    cancelSpy.mockRestore();
  });
});

ff.reset();
