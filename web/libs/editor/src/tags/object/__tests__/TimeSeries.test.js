// Set up performance.now mock before any imports
import * as d3 from "d3";
import { types } from "mobx-state-tree";
import { mockFF } from "../../../../__mocks__/global";
import { TimeSeriesModel } from "../TimeSeries";

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

ff.reset();
