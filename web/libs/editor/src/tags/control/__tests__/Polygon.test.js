mockModule("../../../core/Hotkey", () => {
  const addNamed = mock();
  const removeNamed = mock();
  const instance = { addNamed, removeNamed };
  const Hotkey = () => instance;
  Hotkey.setScope = mock();
  Hotkey.DEFAULT_SCOPE = "all";
  Hotkey.keymap = {};
  Hotkey._testInstance = instance;
  return {
    __esModule: true,
    __skipMerge: true,
    Hotkey,
    default: {
      DEFAULT_SCOPE: Hotkey.DEFAULT_SCOPE,
      Hotkey,
    },
  };
});

import ToolsManager from "../../../tools/Manager";
spyOn(ToolsManager, "getInstance").mockReturnValue({
  addToolsFromControl: mock(),
});

let PolygonModel;
let Store;
let HotkeyMock;

beforeAll(async () => {
  const { types } = require("mobx-state-tree");
  const Polygon = await import(`../Polygon?bun_reload=${Date.now()}`);
  PolygonModel = Polygon.PolygonModel;
  HotkeyMock = require("../../../core/Hotkey").Hotkey;

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
      undo: mock(),
      redo: mock(),
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

  it("registers polygon undo/redo hotkeys on create", () => {
    Store.create({
      annotationStore: {
        selected: {
          names: {
            "img-1": { name: "img-1" },
            poly: { name: "poly", toname: "img-1" },
          },
        },
      },
    });
    expect(HotkeyMock._testInstance.addNamed).toHaveBeenCalledWith("polygon:undo", expect.any(Function));
    expect(HotkeyMock._testInstance.addNamed).toHaveBeenCalledWith("polygon:redo", expect.any(Function));
  });

  it("disposeHotkeys unregisters polygon undo and redo hotkeys", () => {
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
    HotkeyMock._testInstance.removeNamed.mockClear();
    polygon.disposeHotkeys();
    expect(HotkeyMock._testInstance.removeNamed).toHaveBeenCalledWith("polygon:undo");
    expect(HotkeyMock._testInstance.removeNamed).toHaveBeenCalledWith("polygon:redo");
  });
});
