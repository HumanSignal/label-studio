import { destroy, types } from "mobx-state-tree";

// Mock the dependencies used in tasks module that might error out in test environment
mockModule("../../../sdk/lsf-utils", () => ({
  getAnnotationSnapshot: jest.fn((a) => a),
}));

mockModule("../Assignee", () => {
  const { types } = require("mobx-state-tree");
  return {
    Assignee: types.model("Assignee", { id: types.identifierNumber }),
  };
});

mockModule("../DynamicModel", () => {
  const { types } = require("mobx-state-tree");
  return {
    DynamicModel: (name, columns, attrs) => types.model(name, attrs),
    registerModel: jest.fn(),
  };
});

mockModule("../types", () => {
  const { types } = require("mobx-state-tree");
  return {
    CustomJSON: types.frozen(),
  };
});

// Avoid importing LSF utils/feature flags directly to prevent heavy dependencies
mockModule("../../../utils/feature-flags", () => ({
  FF_DEV_2536: "ff_dev_2536",
  FF_DISABLE_GLOBAL_USER_FETCHING: "ff_disable_global_user_fetching",
  FF_LOPS_E_3: "ff_lops_e_3",
  isFF: () => false,
}));

import * as coreFf from "@humansignal/core/lib/utils/feature-flags";

beforeAll(() => {
  spyOn(coreFf, "isActive").mockReturnValue(false);
});

mockModule("../../mixins/DataStore", () => {
  const { types } = require("mobx-state-tree");
  return {
    DataStoreItem: types.model("DataStoreItem", {
      id: types.maybeNull(types.union(types.number, types.string)),
    }),
    DataStore: (modelName, config) => {
      return types
        .model(modelName, {
          list: types.optional(types.array(config.listItemType), []),
          loading: false,
          totalAnnotations: types.optional(types.number, 0),
          totalPredictions: types.optional(types.number, 0),
          similarityUpperLimit: types.optional(types.number, 0),
        })
        .actions((self) => ({
          updateItem(id, item) {
            self.list.push(item);
            return self.list[self.list.length - 1];
          },
          setLoading(id) {},
          finishLoading(id) {},
        }));
    },
  };
});

describe("tasks DataStore", () => {
  let tasksMod;
  let TasksStoreMock;

  beforeAll(() => {
    // Need to require the actual module under test after mocking dependencies
    tasksMod = require("../tasks");
    TasksStoreMock = tasksMod.create([]);
  });

  it("loadTask gracefully exits and doesn't crash when node is destroyed", async () => {
    // A mock root API that we can control resolution
    let resolveApiCall;
    const apiCallPromise = new Promise((resolve) => {
      resolveApiCall = resolve;
    });

    const RootModel = types
      .model("Root", {
        taskStore: types.optional(TasksStoreMock, {}),
        annotationStore: types.optional(types.model({ selected: types.frozen() }), {}),
        SDK: types.frozen({
          mode: "labelstream",
          invoke: jest.fn(),
        }),
      })
      .actions(() => ({
        apiCall: jest.fn(() => apiCallPromise),
        invokeAction: jest.fn(() => apiCallPromise), // Reuse for next_task if needed
      }));

    const root = RootModel.create({
      taskStore: {
        list: [],
      },
    });

    const taskStore = root.taskStore;

    // Start loadTask
    const taskPromise = taskStore.loadTask(1);

    // Destroy the root to ensure all children are dead!
    destroy(root);

    // Resolve the promise causing the `yield root.apiCall` to resume
    resolveApiCall({
      id: 1,
      annotations: [],
    });

    const result = await taskPromise;

    // If it didn't crash because of our isAlive(self) checks it will just return null/undefined
    expect(result).toBeNull();
  });

  it("loadNextTask gracefully exits and doesn't crash when node is destroyed", async () => {
    // A mock root API that we can control resolution
    let resolveInvokeAction;
    const invokeActionPromise = new Promise((resolve) => {
      resolveInvokeAction = resolve;
    });

    const RootModel = types
      .model("Root", {
        taskStore: types.optional(TasksStoreMock, {}),
        annotationStore: types.optional(types.model({ selected: types.frozen() }), {}),
        SDK: types.frozen({
          mode: "labelstream",
          invoke: jest.fn(),
        }),
      })
      .actions(() => ({
        invokeAction: jest.fn(() => invokeActionPromise),
      }));

    const root = RootModel.create({
      taskStore: {
        list: [],
      },
    });

    const taskStore = root.taskStore;

    // Start loadNextTask
    const taskPromise = taskStore.loadNextTask();

    // Destroy the root to ensure all children are dead!
    destroy(root);

    // Resolve the promise causing the `yield root.invokeAction` to resume
    resolveInvokeAction({
      id: 2,
      annotations: [],
    });

    const result = await taskPromise;

    // If it didn't crash because of our isAlive(self) checks it will just return null/undefined
    expect(result).toBeNull();
  });
});
