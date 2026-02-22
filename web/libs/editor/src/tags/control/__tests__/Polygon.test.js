jest.mock("../../../core/Hotkey", () => {
  const addNamed = jest.fn();
  const removeNamed = jest.fn();
  const instance = { addNamed, removeNamed };
  const Hotkey = () => instance;
  Hotkey._testInstance = instance;
  return { Hotkey };
});

jest.mock("../../../tools/Manager", () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      addToolsFromControl: jest.fn(),
    }),
  },
}));

let PolygonModel;
let Store;

beforeAll(() => {
  jest.resetModules();
  const { types } = require("mobx-state-tree");
  const Polygon = require("../Polygon");
  PolygonModel = Polygon.PolygonModel;

  const MockImage = types.model("MockImage", {
    name: types.string,
  });

  const Annotation = types
    .model("Annotation", {
      names: types.map(types.union(PolygonModel, MockImage)),
      results: types.optional(types.array(types.frozen()), []),
    })
    .volatile(() => ({
      selected: true,
      isDrawing: true,
      undo: jest.fn(),
      redo: jest.fn(),
    }));

  Store = types.model("Store", {
    annotationStore: types.model({
      selected: Annotation,
    }),
  });
});

beforeEach(() => {
  window.STORE_INIT_OK = true;
});
afterEach(() => {
  window.STORE_INIT_OK = undefined;
});

describe("Polygon tag", () => {
  it("has type polygon and toolNames", () => {
    const polygon = PolygonModel.create({
      name: "poly",
      toname: "img-1",
    });
    expect(polygon.type).toBe("polygon");
    expect(polygon.toolNames).toEqual(["Polygon"]);
  });

  it("polygon in store has type and toolNames", () => {
    const store = Store.create({
      annotationStore: {
        selected: {
          names: {
            "img-1": { name: "img-1" },
            poly: { name: "poly", toname: "img-1" },
          },
        },
      },
    });
    const polygon = store.annotationStore.selected.names.get("poly");
    expect(polygon.type).toBe("polygon");
    expect(polygon.toolNames).toEqual(["Polygon"]);
  });

  it("uses default TagAttrs", () => {
    const polygon = PolygonModel.create({
      name: "poly",
      toname: "img-1",
    });
    expect(polygon.toname).toBe("img-1");
    expect(polygon.opacity).toBe("0.2");
    expect(polygon.fillcolor).toBe("#f48a42");
    expect(polygon.strokewidth).toBe("2");
    expect(polygon.snap).toBe("none");
    expect(polygon.pointsize).toBe("small");
    expect(polygon.pointstyle).toBe("circle");
  });
});
