import { mock, describe, it, expect, beforeEach, spyOn } from "bun:test";
import { AppStore } from "./AppStore";
import { types } from "mobx-state-tree";
import { History } from "../utils/history";

describe("AppStore setTask annotation matching (FIT-1949)", () => {
  let store;
  let mockLsf;

  beforeEach(() => {
    mockLsf = {
      setLSFTask: mock(() => {}),
      currentAnnotation: { pk: 123 },
      lsf: {
        annotationStore: {
          annotations: [
            { pk: 97375393, id: 1, type: "annotation" },
            { pk: null, id: "alphanumeric-id-abc", type: "annotation" },
          ],
          predictions: [],
        },
      },
    };

    const DummyTaskStore = types
      .model({
        selected: types.maybeNull(types.frozen()),
      })
      .actions((self) => ({
        setSelected(_id) {},
        loadTask(id) {
          self.selected = {
            id,
            annotations: [
              { id: 97375393, type: "annotation" },
              { id: "alphanumeric-id-abc", type: "annotation" },
            ],
            predictions: [],
          };
          return Promise.resolve(self.selected);
        },
      }));

    const DummyAnnotationStore = types.model({}).actions((_self) => ({
      setSelected(_id) {},
    }));

    const TestStore = types.compose(
      AppStore,
      types.model({
        taskStore: types.optional(DummyTaskStore, {}),
        annotationStore: types.optional(DummyAnnotationStore, {}),
      }),
    );

    store = TestStore.create({
      toolbar: "",
    });

    store._sdk = {
      lsf: mockLsf,
      api: {
        columns: () => Promise.resolve([]),
      },
    };
  });

  it("should match annotation when ID is a number and URL parameter is a string", async () => {
    // Mock History.getParams to return string annotation id
    const getParamsSpy = spyOn(History, "getParams").mockReturnValue({
      annotation: "97375393",
    });

    const navigateSpy = spyOn(History, "navigate").mockImplementation(() => {});

    // Run setTask flow
    await store.setTask({ taskID: 1, annotationID: 97375393, pushState: false });

    // Expect setLSFTask to be called once directly with the target annotation
    expect(mockLsf.setLSFTask).toHaveBeenCalledTimes(1);
    expect(mockLsf.setLSFTask).toHaveBeenLastCalledWith(store.taskStore.selected, 97375393, undefined, false);

    getParamsSpy.mockRestore();
    navigateSpy.mockRestore();
  });

  it("should match annotation when ID is a string and URL parameter is a string", async () => {
    // Mock History.getParams to return string annotation id
    const getParamsSpy = spyOn(History, "getParams").mockReturnValue({
      annotation: "alphanumeric-id-abc",
    });

    const navigateSpy = spyOn(History, "navigate").mockImplementation(() => {});

    // Run setTask flow
    await store.setTask({ taskID: 1, annotationID: "alphanumeric-id-abc", pushState: false });

    // Expect setLSFTask to be called once directly with the target annotation
    expect(mockLsf.setLSFTask).toHaveBeenCalledTimes(1);
    expect(mockLsf.setLSFTask).toHaveBeenLastCalledWith(
      store.taskStore.selected,
      "alphanumeric-id-abc",
      undefined,
      false,
    );

    getParamsSpy.mockRestore();
    navigateSpy.mockRestore();
  });

  it("should select region if region URL parameter is present", async () => {
    const setRegionVisibleMock = mock(() => {});
    const selectRegionByIDMock = mock(() => {});

    mockLsf.currentAnnotation = {
      pk: 97375393,
      id: "abcde",
      regionStore: {
        setRegionVisible: setRegionVisibleMock,
        selectRegionByID: selectRegionByIDMock,
      },
    };

    const getParamsSpy = spyOn(History, "getParams").mockReturnValue({
      annotation: "97375393",
      region: "r1",
    });

    const navigateSpy = spyOn(History, "navigate").mockImplementation(() => {});

    await store.setTask({ taskID: 1, annotationID: 97375393, pushState: false });

    // Wait for the next tick for setTimeout(..., 0) to execute
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(setRegionVisibleMock).toHaveBeenCalledWith("r1");
    expect(selectRegionByIDMock).toHaveBeenCalledWith("r1");

    getParamsSpy.mockRestore();
    navigateSpy.mockRestore();
  });
});

describe("AppStore invokeAction reload handling (UTC-1043)", () => {
  let store;
  let mockView;

  // `currentView` normally resolves through `viewsStore` (a real TabStore); overriding it here keeps
  // the test focused on invokeAction's reload decision without building a full Tab fixture.
  const TestAppStore = AppStore.views(() => ({
    get currentView() {
      return mockView;
    },
  }));

  beforeEach(() => {
    mockView = {
      ordering: null,
      serializedFilters: [],
      conjunction: "and",
      selected: { snapshot: { all: false, included: [] } },
      reload: mock(() => Promise.resolve()),
      clearSelection: mock(() => {}),
      unlock: mock(() => {}),
      lock: mock(() => {}),
    };

    store = TestAppStore.create({ toolbar: "" });

    store._sdk = {
      getAction: () => undefined,
      invoke: mock(() => {}),
      api: {
        invokeAction: mock(() => Promise.resolve({ reload: false })),
        project: mock(() => Promise.resolve({})),
      },
    };
  });

  it("reloads the view for a synchronous action that returns reload: false (e.g. delete_tasks)", async () => {
    await store.invokeAction("delete_task");

    expect(mockView.reload).toHaveBeenCalledTimes(1);
    expect(store._sdk.api.project).toHaveBeenCalledTimes(1);
    expect(mockView.clearSelection).toHaveBeenCalled();
  });

  it("skips the reload for an async action that returns reload: false (e.g. bulk Review)", async () => {
    store._sdk.api.invokeAction = mock(() => Promise.resolve({ async: true, reload: false }));

    await store.invokeAction("bulk_review");

    expect(mockView.reload).not.toHaveBeenCalled();
    expect(store._sdk.api.project).not.toHaveBeenCalled();
    expect(store.backgroundActionPending).toBe(true);
  });

  it("does not flag the Refresh button as stale after a synchronous action changed counts (UTC-1043)", async () => {
    // Pre-action loaded counts.
    store = TestAppStore.create({
      toolbar: "",
      project: { id: 1, task_count: 10, task_number: 10, annotation_count: 5, num_tasks_with_annotations: 5 },
    });
    store._sdk = {
      getAction: () => undefined,
      invoke: mock(() => {}),
      api: {
        invokeAction: mock(() => Promise.resolve({ reload: false })),
        // The fresh project fetch reports fewer tasks because we just deleted some.
        project: mock(() =>
          Promise.resolve({ id: 1, task_count: 8, task_number: 8, annotation_count: 5, num_tasks_with_annotations: 5 }),
        ),
      },
    };

    await store.invokeAction("delete_task");

    // The grid is reloaded (the UTC-1043 fix) ...
    expect(mockView.reload).toHaveBeenCalledTimes(1);
    // ... but the Refresh button must NOT be highlighted just because our own action changed the counts.
    expect(store.needsDataFetch).toBe(false);
    expect(store.backgroundActionPending).toBe(false);
  });

  it("still detects drift for an async action whose background job is not done yet", async () => {
    // delete_tasks_annotations returns async:true without a reload flag: it falls through to the reload
    // path, but its non-forced project fetch must keep the count-drift check so the button can highlight.
    store = TestAppStore.create({
      toolbar: "",
      project: { id: 1, task_count: 10, task_number: 10, annotation_count: 5, num_tasks_with_annotations: 5 },
    });
    store._sdk = {
      getAction: () => undefined,
      invoke: mock(() => {}),
      api: {
        invokeAction: mock(() => Promise.resolve({ async: true })),
        project: mock(() =>
          Promise.resolve({
            id: 1,
            task_count: 10,
            task_number: 10,
            annotation_count: 2,
            num_tasks_with_annotations: 2,
          }),
        ),
      },
    };

    await store.invokeAction("delete_tasks_annotations");

    expect(mockView.reload).toHaveBeenCalledTimes(1);
    expect(store.needsDataFetch).toBe(true);
  });
});
