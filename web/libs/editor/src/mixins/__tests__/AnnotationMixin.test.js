/**
 * Unit tests for AnnotationMixin (FIT-1494 / Compare All init).
 *
 * When FF_SIMPLE_INIT and FF_DEV_3391 are on, the annotation getter must NOT log
 * "annotation accessed before store is initialized" when called during init (STORE_INIT_OK false),
 * because the getter resolves the annotation from the tree via getParentOfTypeString.
 * These tests fail before the AnnotationMixin fix and pass after it.
 */
import { types } from "mobx-state-tree";
import { AnnotationMixin } from "../AnnotationMixin";
import * as featureFlags from "../../utils/feature-flags";

const { FF_DEV_3391, FF_SIMPLE_INIT } = featureFlags;

jest.mock("../../utils/feature-flags", () => {
  const actual = jest.requireActual("../../utils/feature-flags");
  return { ...actual, isFF: jest.fn((id) => actual.isFF(id)) };
});

const ChildWithMixin = types.compose(
  types.model("ChildNode", { name: types.optional(types.string, "n1") }),
  AnnotationMixin,
);

const Annotation = types.model("Annotation", {
  id: types.identifier,
  child: types.optional(ChildWithMixin, { name: "n1" }),
});

const AnnotationStore = types.model("AnnotationStore", {
  annotations: types.array(Annotation),
});

const Store = types.model("Store", {
  annotationStore: types.optional(AnnotationStore, { annotations: [] }),
});

describe("AnnotationMixin – Compare All init (FIT-1494)", () => {
  let actualFeatureFlags;

  beforeEach(() => {
    jest.clearAllMocks();
    actualFeatureFlags = jest.requireActual("../../utils/feature-flags");
    featureFlags.isFF.mockImplementation((id) => actualFeatureFlags.isFF(id));
    window.STORE_INIT_OK = undefined;
  });

  afterEach(() => {
    window.STORE_INIT_OK = undefined;
  });

  it("does not log when STORE_INIT_OK is false and FF_SIMPLE_INIT and FF_DEV_3391 are on", () => {
    featureFlags.isFF.mockImplementation(
      (id) => id === FF_SIMPLE_INIT || id === FF_DEV_3391 || actualFeatureFlags.isFF(id),
    );
    window.STORE_INIT_OK = false;

    const store = Store.create({
      annotationStore: {
        annotations: [{ id: "a1", child: { name: "n1" } }],
      },
    });
    const child = store.annotationStore.annotations[0].child;
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = child.annotation;

    const badCalls = consoleErrorSpy.mock.calls.filter(
      (call) => call[0] && String(call[0]).includes("annotation accessed before store is initialized"),
    );
    expect(badCalls).toHaveLength(0);
    expect(result).not.toBeNull();

    consoleErrorSpy.mockRestore();
  });

  it("still logs when STORE_INIT_OK is false and FF_DEV_3391 is off", () => {
    featureFlags.isFF.mockImplementation((id) =>
      id === FF_SIMPLE_INIT ? true : id === FF_DEV_3391 ? false : actualFeatureFlags.isFF(id),
    );
    window.STORE_INIT_OK = false;

    const store = Store.create({
      annotationStore: {
        annotations: [{ id: "a1", child: { name: "n1" } }],
      },
    });
    const child = store.annotationStore.annotations[0].child;
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    child.annotation;

    const badCalls = consoleErrorSpy.mock.calls.filter(
      (call) => call[0] && String(call[0]).includes("annotation accessed before store is initialized"),
    );
    expect(badCalls.length).toBeGreaterThan(0);

    consoleErrorSpy.mockRestore();
  });
});
