/**
 * Unit tests for configureStore (Chunk 10 - stores/core).
 * Mocks env and AppStore so we test configureStore logic only.
 */

const mockGetData = jest.fn((task) => (task?.data ? { ...task, data: JSON.stringify(task.data) } : task));
const mockGetState = jest.fn(() => ({}));
const mockRootElement = jest.fn(() => ({}));
const mockConfigureApplication = jest.fn(() => ({}));
const mockGetExample = jest.fn();

jest.mock("../env/production", () => ({
  __esModule: true,
  default: {
    getData: mockGetData,
    getState: mockGetState,
    rootElement: mockRootElement,
    configureApplication: mockConfigureApplication,
    get getExample() {
      return mockGetExample();
    },
  },
}));

jest.mock("../env/development", () => ({
  __esModule: true,
  default: {
    getData: mockGetData,
    getState: mockGetState,
    rootElement: mockRootElement,
    configureApplication: mockConfigureApplication,
    get getExample() {
      return mockGetExample();
    },
  },
}));

const mockInitializeStore = jest.fn();
const mockCreate = jest.fn((params, opts) => ({
  initializeStore: mockInitializeStore,
}));

jest.mock("../stores/AppStore", () => ({
  __esModule: true,
  default: { create: (...args) => mockCreate(...args) },
}));

describe("configureStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.LS_SECURE_MODE = undefined;
  });

  it("sets LS_SECURE_MODE when options.secureMode is true", async () => {
    const { configureStore } = await import("../configureStore");
    await configureStore({ options: { secureMode: true } });
    expect(window.LS_SECURE_MODE).toBe(true);
  });

  it("does not set LS_SECURE_MODE when options.secureMode is false", async () => {
    const { configureStore } = await import("../configureStore");
    await configureStore({ options: {} });
    expect(window.LS_SECURE_MODE).toBeUndefined();
  });

  it("sets bottomSidePanel and forceBottomPanel when settings.forceBottomPanel is true", async () => {
    const { configureStore } = await import("../configureStore");
    await configureStore({
      settings: { forceBottomPanel: true },
      config: "<View></View>",
      task: { id: 1, data: {} },
    });
    expect(mockCreate).toHaveBeenCalled();
    const [params] = mockCreate.mock.calls[0];
    expect(params.bottomSidePanel).toBe(true);
    expect(params.settings?.forceBottomPanel).toBe(true);
  });

  it("adds taskHistory when task has id", async () => {
    const { configureStore } = await import("../configureStore");
    await configureStore({
      config: "<View></View>",
      task: { id: 42, data: {} },
    });
    expect(mockCreate).toHaveBeenCalled();
    const [params] = mockCreate.mock.calls[0];
    expect(params.taskHistory).toEqual([{ taskId: 42, annotationId: null }]);
  });

  it("calls env.getData when task is provided", async () => {
    const task = { id: 1, data: { text: "hi" } };
    const { configureStore } = await import("../configureStore");
    await configureStore({ config: "<View></View>", task });
    expect(mockGetData).toHaveBeenCalledWith(task);
  });

  it("returns store and getRoot from env", async () => {
    const { configureStore } = await import("../configureStore");
    const result = await configureStore({ config: "<View></View>" });
    expect(result).toHaveProperty("store");
    expect(result).toHaveProperty("getRoot");
    expect(typeof result.getRoot).toBe("function");
    expect(result.getRoot).toBe(mockRootElement);
  });

  it("calls store.initializeStore with task and hydrated", async () => {
    const task = { id: 1, data: {} };
    const { configureStore } = await import("../configureStore");
    await configureStore({ config: "<View></View>", task });
    expect(mockInitializeStore).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        data: "{}",
        hydrated: true,
        users: [],
        annotationHistory: [],
      }),
    );
  });

  it("calls env.getExample when config is missing and getExample is defined", async () => {
    const exampleTask = { id: 99, data: { x: 1 } };
    const exampleConfig = '<View><Text name="t"/></View>';
    mockGetExample.mockReturnValue(() => Promise.resolve({ task: exampleTask, config: exampleConfig }));
    const { configureStore } = await import("../configureStore");
    await configureStore({});
    expect(mockGetExample).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalled();
    const [params] = mockCreate.mock.calls[0];
    expect(params.config).toBe(exampleConfig);
    expect(params.task).toEqual(exampleTask);
    mockGetExample.mockReturnValue(undefined);
  });

  it("passes hydrated, users, and annotationHistory to initializeStore", async () => {
    const users = [{ id: 1, username: "u" }];
    const history = [{ annotationId: 1 }];
    const { configureStore } = await import("../configureStore");
    await configureStore({
      config: "<View></View>",
      task: { id: 1 },
      hydrated: false,
      users,
      history,
    });
    expect(mockInitializeStore).toHaveBeenCalledWith(
      expect.objectContaining({
        hydrated: false,
        users,
        annotationHistory: history,
      }),
    );
  });
});
