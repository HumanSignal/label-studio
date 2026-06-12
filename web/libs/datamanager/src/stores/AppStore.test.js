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
});
