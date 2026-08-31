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
    DynamicModel: (name, _columns, attrs) => types.model(name, attrs),
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
            const index = self.list.findIndex((existing) => existing.id === id);
            if (index >= 0) {
              Object.assign(self.list[index], item);
              return self.list[index];
            }
            self.list.push(item);
            return self.list[self.list.length - 1];
          },
          setLoading(_id) {},
          finishLoading(_id) {},
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

  it("preserves Data Manager user chips when quick view task details have empty chip arrays", () => {
    const rootModel = types
      .model("Root", {
        taskStore: types.optional(TasksStoreMock, {}),
        annotationStore: types.optional(types.model({ selected: types.frozen() }), {}),
        SDK: types.frozen({ mode: "explorer", invoke: jest.fn() }),
      })
      .actions(() => ({
        apiCall: jest.fn(),
        invokeAction: jest.fn(),
      }));

    const root = rootModel.create({ taskStore: { list: [] } });

    root.taskStore.applyTaskSnapshot({
      id: 10,
      data: { text: "DM row" },
      annotators: [{ user_id: 101, email: "annotator@example.test", firstName: "Ada", lastName: "Annotator" }],
      reviewers: [{ user_id: 202, email: "reviewer@example.test", firstName: "Rae", lastName: "Reviewer" }],
      updated_by: [{ user_id: 303, email: "updater@example.test", firstName: "Uma", lastName: "Updater" }],
      annotators_count: 1,
      reviewers_count: 1,
      annotations: [],
    });

    const task = root.taskStore.applyTaskSnapshot({
      id: 10,
      data: { text: "Quick view detail" },
      annotators: [],
      reviewers: [],
      updated_by: [],
      annotators_count: 0,
      reviewers_count: 0,
      annotations: [{ id: 1, result: [{ value: "loaded" }] }],
    });

    expect(task.annotations).toEqual([{ id: 1, result: [{ value: "loaded" }] }]);
    expect(task.annotators.map((chip) => chip.id)).toEqual([101]);
    expect(task.reviewers.map((chip) => chip.id)).toEqual([202]);
    expect(task.updated_by.map((chip) => chip.id)).toEqual([303]);
    expect(task.annotators_count).toBe(1);
    expect(task.reviewers_count).toBe(1);
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

  describe("mergeAnnotations", () => {
    const createRootWithTask = (annotations) => {
      const RootModel = types
        .model("Root", {
          taskStore: types.optional(TasksStoreMock, {}),
          annotationStore: types.optional(types.model({ selected: types.frozen() }), {}),
          SDK: types.frozen({ mode: "explorer", invoke: jest.fn() }),
        })
        .actions(() => ({
          apiCall: jest.fn(),
          invokeAction: jest.fn(),
        }));

      const root = RootModel.create({ taskStore: { list: [] } });
      const task = root.taskStore.applyTaskSnapshot({
        id: 100,
        annotations,
      });
      return { root, task };
    };

    it("preserves server userGenerate/sentUserGenerate when replacing a stub (FIT-1680)", () => {
      // Server response for a saved annotation: userGenerate/sentUserGenerate are falsy.
      const { task } = createRootWithTask([
        {
          id: 42,
          pk: 42,
          result: [],
          is_stub: true,
          userGenerate: false,
          sentUserGenerate: false,
        },
      ]);

      // In-memory LSF annotation immediately after a Submit from Quick View:
      // sendUserGenerate() flipped sentUserGenerate to true and userGenerate stayed true
      // because LSF never resets that local creation-lifecycle flag.
      const lsfAnnotation = {
        id: 42,
        pk: "42",
        draftId: null,
        leadTime: 5,
        serializeAnnotation: () => [{ id: "region-1", type: "labels", value: {} }],
        userGenerate: true,
        sentUserGenerate: true,
      };

      task.mergeAnnotations([lsfAnnotation]);

      expect(task.annotations).toHaveLength(1);
      const merged = task.annotations[0];
      expect(merged.userGenerate).toBe(false);
      expect(merged.sentUserGenerate).toBe(false);
      expect(merged.is_stub).toBe(false);
      expect(merged.result).toEqual([{ id: "region-1", type: "labels", value: {} }]);
    });

    it("replaces stub result with live serialized regions (FIT-1660 guard)", () => {
      const { task } = createRootWithTask([
        {
          id: 43,
          pk: 43,
          result: [],
          is_stub: true,
          userGenerate: false,
          sentUserGenerate: false,
        },
      ]);

      const lsfAnnotation = {
        id: 43,
        pk: "43",
        draftId: null,
        leadTime: 12,
        serializeAnnotation: () => [{ id: "live-region", type: "labels", value: {} }],
        userGenerate: false,
        sentUserGenerate: false,
      };

      task.mergeAnnotations([lsfAnnotation]);

      const merged = task.annotations[0];
      expect(merged.is_stub).toBe(false);
      expect(merged.result).toEqual([{ id: "live-region", type: "labels", value: {} }]);
      expect(merged.leadTime).toBe(12);
      expect(merged.pk).toBe("43");
    });

    it("returns existing entry unchanged when it is not a stub", () => {
      const { task } = createRootWithTask([
        {
          id: 44,
          pk: 44,
          result: [{ id: "saved-region", type: "labels", value: {} }],
          is_stub: false,
          userGenerate: false,
          sentUserGenerate: false,
          leadTime: 99,
        },
      ]);

      const lsfAnnotation = {
        id: 44,
        pk: "44",
        draftId: null,
        leadTime: 5,
        serializeAnnotation: () => [{ id: "lsf-region", type: "labels", value: {} }],
        userGenerate: true,
        sentUserGenerate: true,
      };

      task.mergeAnnotations([lsfAnnotation]);

      const merged = task.annotations[0];
      expect(merged.result).toEqual([{ id: "saved-region", type: "labels", value: {} }]);
      expect(merged.userGenerate).toBe(false);
      expect(merged.sentUserGenerate).toBe(false);
      expect(merged.leadTime).toBe(99);
      expect(merged.is_stub).toBe(false);
    });
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

  it("loadNextTask logs label stream queue metadata without a selected annotation", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const RootModel = types
      .model("Root", {
        taskStore: types.optional(TasksStoreMock, {}),
        annotationStore: types.optional(types.model({ selected: types.frozen() }), {}),
        SDK: types.frozen({
          mode: "labelstream",
          project: { id: 34 },
          invoke: jest.fn(),
        }),
        LSF: types.frozen({
          lsf: { user: { id: 7 } },
        }),
      })
      .actions(() => ({
        invokeAction: jest.fn(() =>
          Promise.resolve({
            id: 271,
            queue: "Sequence queue",
            annotations: [],
          }),
        ),
      }));

    const root = RootModel.create({
      taskStore: { list: [] },
      annotationStore: { selected: null },
    });

    await root.taskStore.loadNextTask();

    expect(logSpy).toHaveBeenCalledWith("[LABEL STREAM] Sequence queue, task 271, project 34, user 7");
    logSpy.mockRestore();
  });
});
