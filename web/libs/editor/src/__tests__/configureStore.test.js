/**
 * Unit tests for configureStore (Chunk 10 - stores/core).
 * Mocks env and AppStore so we test configureStore logic only.
 */

const mockGetData = mock((task) => (task?.data ? { ...task, data: JSON.stringify(task.data) } : task));
const mockRootElement = mock(() => ({}));
const mockConfigureApplication = mock(() => ({}));
const mockGetExample = mock();

const mockInitializeStore = mock();
const mockCreate = mock((_params, _opts) => ({
  initializeStore: mockInitializeStore,
}));

import AppStore from "../stores/AppStore";
import productionEnv from "../env/production";
import developmentEnv from "../env/development";

let appStoreCreateSpy;
let productionGetDataSpy;
let productionRootElementSpy;
let productionConfigureApplicationSpy;
let developmentGetDataSpy;
let developmentRootElementSpy;
let developmentConfigureApplicationSpy;

describe("configureStore", () => {
  beforeEach(() => {
    clearAllMocks();
    appStoreCreateSpy = spyOn(AppStore, "create").mockImplementation((...args) => mockCreate(...args));
    productionGetDataSpy = spyOn(productionEnv, "getData").mockImplementation((...args) => mockGetData(...args));
    productionRootElementSpy = spyOn(productionEnv, "rootElement").mockImplementation((...args) =>
      mockRootElement(...args),
    );
    productionConfigureApplicationSpy = spyOn(productionEnv, "configureApplication").mockImplementation((...args) =>
      mockConfigureApplication(...args),
    );
    developmentGetDataSpy = spyOn(developmentEnv, "getData").mockImplementation((...args) => mockGetData(...args));
    developmentRootElementSpy = spyOn(developmentEnv, "rootElement").mockImplementation((...args) =>
      mockRootElement(...args),
    );
    developmentConfigureApplicationSpy = spyOn(developmentEnv, "configureApplication").mockImplementation((...args) =>
      mockConfigureApplication(...args),
    );
    window.LS_SECURE_MODE = undefined;
    window.__LSF_INTEGRATION_TEST__ = undefined;
  });

  afterEach(() => {
    appStoreCreateSpy?.mockRestore?.();
    productionGetDataSpy?.mockRestore?.();
    productionRootElementSpy?.mockRestore?.();
    productionConfigureApplicationSpy?.mockRestore?.();
    developmentGetDataSpy?.mockRestore?.();
    developmentRootElementSpy?.mockRestore?.();
    developmentConfigureApplicationSpy?.mockRestore?.();
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
    result.getRoot("root");
    expect(mockRootElement).toHaveBeenCalledWith("root");
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
    window.__LSF_INTEGRATION_TEST__ = true;
    const exampleTask = { id: 99, data: { x: 1 } };
    const exampleConfig = '<View><Text name="t"/></View>';
    mockGetExample.mockReturnValue(Promise.resolve({ task: exampleTask, config: exampleConfig }));
    spyOn(developmentEnv, "getExample").mockImplementation(() => mockGetExample());
    const { configureStore } = await import("../configureStore");
    await configureStore({});
    expect(mockGetExample).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalled();
    const [params] = mockCreate.mock.calls[0];
    expect(params.config).toBe(exampleConfig);
    expect(params.task).toEqual(exampleTask);
    window.__LSF_INTEGRATION_TEST__ = undefined;
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
