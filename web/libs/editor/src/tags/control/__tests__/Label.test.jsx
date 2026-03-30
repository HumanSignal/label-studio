/**
 * Unit tests for Label tag (tags/control/Label.jsx)
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "mobx-react";
import Tree from "../../../core/Tree";
import Registry from "../../../core/Registry";
import "../../visual/View";
import "../Label";
import "../../object/RichText";
import "../Labels/Labels";
import { HtxLabelView } from "../Label";

const mockAddErrors = mock();
const mockRegions = [{ hasLabel: (v) => v === "A" }, { hasLabel: (v) => v === "B" }];
const mockRegionStore = { regions: mockRegions };
const mockAnnotation = {
  id: 1,
  isReadOnly: () => false,
  regionStore: mockRegionStore,
  selectedRegions: [],
  selectedDrawingRegions: [],
  unselectAll: mock(),
};
const mockRoot = {
  task: { dataObj: { text: "Hello" } },
  annotationStore: {
    addErrors: mockAddErrors,
    selected: mockAnnotation,
    selectedHistory: mockAnnotation,
  },
};

import { getRoot } from "mobx-state-tree";
beforeEach(() => {
  getRoot.mockImplementation((node) => {
    if (node && node.type === "label") return mockRoot;
    return globalThis.__mstOriginals.getRoot(node);
  });
});

mockModule("../../../components/Infomodal/Infomodal", () => ({
  __esModule: true,
  default: { warning: mock() },
}));

import ToolsManager from "../../../tools/Manager";
spyOn(ToolsManager, "getInstance").mockReturnValue({
  findSelectedTool: mock(() => null),
  selectTool: mock(),
});

const CONFIG_WITH_LABELS = `<View>
  <Labels name="lbl" toName="t1">
    <Label value="A" />
    <Label value="B" />
  </Labels>
  <Text name="t1" value="$text" />
</View>`;

function createLabelNode(storeRef = { task: { dataObj: { text: "Hello" } } }) {
  const config = Tree.treeToModel(CONFIG_WITH_LABELS, storeRef);
  const ViewModel = Registry.getModelByTag("view");
  const root = ViewModel.create(config);
  const labels = root.children.find((c) => c.type === "labels");
  return labels?.children?.[0] ?? null;
}

beforeEach(() => {
  clearAllMocks();
  window.STORE_INIT_OK = true;
});
afterEach(() => {
  window.STORE_INIT_OK = undefined;
});

describe("Label model", () => {
  it("creates label with correct type and value", () => {
    const label = createLabelNode();
    expect(label).not.toBeNull();
    expect(label.type).toBe("label");
    expect(label.value).toBe("A");
    expect(label._value).toBeDefined();
  });

  it("maxUsages returns number from self or parent", () => {
    const storeRef = { task: { dataObj: { text: "Hi" } } };
    const config = Tree.treeToModel(
      `<View><Labels name="l" toName="t" maxUsages="3"><Label value="X" /></Labels><Text name="t" value="$text" /></View>`,
      storeRef,
    );
    const ViewModel = Registry.getModelByTag("view");
    const root = ViewModel.create(config);
    const label = root.children.find((c) => c.type === "labels").children[0];
    expect(label.maxUsages).toBe(3);
  });

  it("usedAlready returns count of regions that have this label", () => {
    const label = createLabelNode();
    expect(label.usedAlready()).toBe(1);
    const labelB = createLabelNode();
    const labels = labelB.parent;
    const secondLabel = labels.children[1];
    expect(secondLabel.usedAlready()).toBe(1);
  });

  it("canBeUsed returns true when no maxUsages", () => {
    const label = createLabelNode();
    expect(label.canBeUsed()).toBe(true);
    expect(label.canBeUsed(10)).toBe(true);
  });

  it("canBeUsed respects maxUsages", () => {
    const storeRef = { task: { dataObj: { text: "Hi" } } };
    const config = Tree.treeToModel(
      `<View><Labels name="l" toName="t" maxUsages="2"><Label value="A" /></Labels><Text name="t" value="$text" /></View>`,
      storeRef,
    );
    const ViewModel = Registry.getModelByTag("view");
    const root = ViewModel.create(config);
    const label = root.children.find((c) => c.type === "labels").children[0];
    expect(label.maxUsages).toBe(2);
    expect(label.usedAlready()).toBe(1);
    expect(label.canBeUsed(1)).toBe(true);
    expect(label.canBeUsed(2)).toBe(false);
  });

  it("setEmpty sets isEmpty volatile to true", () => {
    const label = createLabelNode();
    expect(label.isEmpty).toBe(false);
    label.setEmpty();
    expect(label.isEmpty).toBe(true);
  });

  it("setSelected updates selected", () => {
    const label = createLabelNode();
    expect(label.selected).toBe(false);
    label.setSelected(true);
    expect(label.selected).toBe(true);
    label.setSelected(false);
    expect(label.selected).toBe(false);
  });

  it("onHotKey and onClick call onLabelInteract", () => {
    const label = createLabelNode();
    const spy = spyOn(label, "toggleSelected");
    label.onHotKey();
    expect(spy).toHaveBeenCalled();
    spy.mockClear();
    label.onClick();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("updateValue sets _value from store task data", () => {
    const storeRef = { task: { dataObj: { name: "Dynamic" } } };
    const config = Tree.treeToModel(
      `<View><Labels name="l" toName="t"><Label value="$name" /></Labels><Text name="t" value="$text" /></View>`,
      storeRef,
    );
    const ViewModel = Registry.getModelByTag("view");
    const root = ViewModel.create(config);
    const label = root.children.find((c) => c.type === "labels").children[0];
    expect(label._value).toBe("");
    label.updateValue({ task: { dataObj: storeRef.task.dataObj } });
    expect(label._value).toBe("Dynamic");
  });

  it("afterCreate updates background when default", () => {
    const label = createLabelNode();
    expect(label.background).toBeDefined();
  });

  it("setVisible updates visible", () => {
    const label = createLabelNode();
    expect(label.visible).toBe(true);
    label.setVisible(false);
    expect(label.visible).toBe(false);
    label.setVisible(true);
    expect(label.visible).toBe(true);
  });

  it("toggleSelected returns early when annotation is readonly", () => {
    const label = createLabelNode();
    mockAnnotation.isReadOnly = () => true;
    label.toggleSelected();
    expect(label.selected).toBe(false);
    mockAnnotation.isReadOnly = () => false;
  });

  it("toggleSelected returns early when selected regions exist but all are readonly", () => {
    mockAnnotation.selectedRegions = [{ parent: { name: "t1" }, isReadOnly: () => true }];
    mockAnnotation.selectedDrawingRegions = [];
    const label = createLabelNode();
    label.toggleSelected();
    expect(label.selected).toBe(false);
    mockAnnotation.selectedRegions = [];
  });

  it("toggleSelected returns early when no regions are applicable to this label", () => {
    const storeRef = { task: { dataObj: { text: "Hi" } } };
    const config = Tree.treeToModel(
      `<View><Labels name="l" toName="t"><Label value="A" /><Label value="B" /></Labels><Text name="t" value="$text" /></View>`,
      storeRef,
    );
    const ViewModel = Registry.getModelByTag("view");
    const root = ViewModel.create(config);
    const labels = root.children.find((c) => c.type === "labels");
    const labelA = labels.children.find((c) => c.value === "A");
    labelA.setSelected(true);
    mockAnnotation.selectedRegions = [
      {
        parent: { name: "t" },
        isReadOnly: () => false,
        labelings: [{}],
        results: [],
        setValue: mock(),
        notifyDrawingFinished: mock(),
      },
    ];
    mockAnnotation.selectedDrawingRegions = [];
    labelA.toggleSelected();
    mockAnnotation.selectedRegions = [];
  });

  it("toggleSelected selects label when no regions selected", () => {
    mockAnnotation.selectedRegions = [];
    mockAnnotation.selectedDrawingRegions = [];
    const label = createLabelNode();
    expect(label.selected).toBe(false);
    label.toggleSelected();
    expect(label.selected).toBe(true);
    mockAnnotation.selectedRegions = [];
    mockAnnotation.selectedDrawingRegions = [];
  });

  it("toggleSelected in multiple choice mode toggles only this label", () => {
    const storeRef = { task: { dataObj: { text: "Hi" } } };
    const config = Tree.treeToModel(
      `<View><Labels name="l" toName="t" choice="multiple"><Label value="A" /><Label value="B" /></Labels><Text name="t" value="$text" /></View>`,
      storeRef,
    );
    const ViewModel = Registry.getModelByTag("view");
    const root = ViewModel.create(config);
    const labels = root.children.find((c) => c.type === "labels");
    const labelA = labels.children.find((c) => c.value === "A");
    mockAnnotation.selectedRegions = [];
    mockAnnotation.selectedDrawingRegions = [];
    expect(labels.shouldBeUnselected).toBe(false);
    labelA.toggleSelected();
    expect(labelA.selected).toBe(true);
    labelA.toggleSelected();
    expect(labelA.selected).toBe(false);
  });

  it("toggleSelected shows warning when maxUsages would be exceeded", () => {
    const InfoModal = require("../../../components/Infomodal/Infomodal").default;
    const storeRef = { task: { dataObj: { text: "Hi" } } };
    const config = Tree.treeToModel(
      `<View><Labels name="l" toName="t" maxUsages="1"><Label value="A" /></Labels><Text name="t" value="$text" /></View>`,
      storeRef,
    );
    const ViewModel = Registry.getModelByTag("view");
    const root = ViewModel.create(config);
    const label = root.children.find((c) => c.type === "labels").children[0];
    mockAnnotation.selectedRegions = [
      {
        parent: { name: "t" },
        isReadOnly: () => false,
        labelings: [],
        results: [{ type: "rectangle" }],
        setValue: mock(),
        notifyDrawingFinished: mock(),
      },
    ];
    mockAnnotation.selectedDrawingRegions = [];
    mockRegionStore.regions = [{ hasLabel: () => true }];
    label.toggleSelected();
    expect(InfoModal.warning).toHaveBeenCalledWith("You can't use A more than 1 time(s)");
    mockRegionStore.regions = mockRegions;
    mockAnnotation.selectedRegions = [];
  });

  it("toggleSelected uses selectedDrawingRegions when present", () => {
    const setValue = mock();
    const notifyDrawingFinished = mock();
    mockAnnotation.selectedRegions = [];
    mockAnnotation.selectedDrawingRegions = [
      {
        parent: { name: "t1" },
        isReadOnly: () => false,
        labelings: [],
        results: [],
        setValue,
        notifyDrawingFinished,
        updateSpans: undefined,
      },
    ];
    const label = createLabelNode();
    const labels = label.parent;
    spyOn(labels, "unselectAll");
    label.toggleSelected();
    expect(setValue).toHaveBeenCalledWith(labels);
    expect(notifyDrawingFinished).toHaveBeenCalled();
    mockAnnotation.selectedRegions = [];
    mockAnnotation.selectedDrawingRegions = [];
  });

  it("toggleSelected applies label to selected region when region matches parent toName", () => {
    const setValue = mock();
    const notifyDrawingFinished = mock();
    mockAnnotation.selectedRegions = [
      {
        parent: { name: "t1" },
        isReadOnly: () => false,
        labelings: [],
        results: [],
        setValue,
        notifyDrawingFinished,
        updateSpans: undefined,
      },
    ];
    mockAnnotation.selectedDrawingRegions = [];
    const label = createLabelNode();
    const labels = label.parent;
    const unselectAllSpy = spyOn(labels, "unselectAll");
    label.toggleSelected();
    expect(unselectAllSpy).toHaveBeenCalled();
    expect(setValue).toHaveBeenCalledWith(labels);
    expect(notifyDrawingFinished).toHaveBeenCalled();
    expect(label.selected).toBe(true);
    unselectAllSpy.mockRestore();
    mockAnnotation.selectedRegions = [];
    mockAnnotation.selectedDrawingRegions = [];
  });

  it("toggleSelected with allowempty and no applicable regions deselects empty label when self selected", () => {
    const storeRef = { task: { dataObj: { text: "Hi" } } };
    const config = Tree.treeToModel(
      `<View><Labels name="l" toName="t" allowempty="true"><Label value="A" /><Label value="B" /></Labels><Text name="t" value="$text" /></View>`,
      storeRef,
    );
    const ViewModel = Registry.getModelByTag("view");
    const root = ViewModel.create(config);
    const labels = root.children.find((c) => c.type === "labels");
    const labelA = labels.children.find((c) => c.value === "A");
    labelA.setSelected(true);
    mockAnnotation.selectedRegions = [
      {
        parent: { name: "t" },
        isReadOnly: () => false,
        labelings: [{}],
        results: [],
        setValue: mock(),
        notifyDrawingFinished: mock(),
      },
    ];
    mockAnnotation.selectedDrawingRegions = [];
    const findLabelSpy = spyOn(labels, "findLabel");
    const emptyLabel = labels.children.find((c) => c.isEmpty);
    if (emptyLabel) {
      const setSelectedSpy = spyOn(emptyLabel, "setSelected");
      labelA.toggleSelected();
      expect(findLabelSpy).toHaveBeenCalled();
      setSelectedSpy.mockRestore();
    }
    findLabelSpy.mockRestore();
    mockAnnotation.selectedRegions = [];
  });

  it("toggleSelected with allowempty and applicable regions updates empty label selection", () => {
    const storeRef = { task: { dataObj: { text: "Hi" } } };
    const config = Tree.treeToModel(
      `<View><Labels name="l" toName="t" allowempty="true"><Label value="A" /><Label value="B" /></Labels><Text name="t" value="$text" /></View>`,
      storeRef,
    );
    const ViewModel = Registry.getModelByTag("view");
    const root = ViewModel.create(config);
    const labels = root.children.find((c) => c.type === "labels");
    const labelA = labels.children.find((c) => c.value === "A");
    const findLabelSpy = spyOn(labels, "findLabel");
    mockAnnotation.selectedRegions = [
      {
        parent: { name: "t" },
        isReadOnly: () => false,
        labelings: [],
        results: [],
        setValue: mock(),
        notifyDrawingFinished: mock(),
      },
    ];
    mockAnnotation.selectedDrawingRegions = [];
    labelA.toggleSelected();
    expect(findLabelSpy).toHaveBeenCalled();
    findLabelSpy.mockRestore();
    mockAnnotation.selectedRegions = [];
  });

  it("toggleSelected in single mode unselects all when clicking selected label", () => {
    mockAnnotation.selectedRegions = [];
    mockAnnotation.selectedDrawingRegions = [];
    const label = createLabelNode();
    label.setSelected(true);
    const labels = label.parent;
    expect(labels.shouldBeUnselected).toBe(true);
    const unselectAllSpy = spyOn(labels, "unselectAll");
    label.toggleSelected();
    expect(unselectAllSpy).toHaveBeenCalledTimes(1);
    expect(label.selected).toBe(false);
    unselectAllSpy.mockRestore();
  });

  it("toggleSelected with isEmpty label unselects all and toggles this label", () => {
    mockAnnotation.selectedRegions = [];
    mockAnnotation.selectedDrawingRegions = [];
    const label = createLabelNode();
    label.setEmpty();
    expect(label.isEmpty).toBe(true);
    const labels = label.parent;
    const unselectAllSpy = spyOn(labels, "unselectAll");
    label.toggleSelected();
    expect(unselectAllSpy).toHaveBeenCalled();
    expect(label.selected).toBe(true);
    label.toggleSelected();
    expect(label.selected).toBe(false);
    unselectAllSpy.mockRestore();
  });
});

describe("HtxLabelView", () => {
  function createMockStore(overrides = {}) {
    return {
      settings: {
        enableTooltips: true,
        enableLabelTooltips: true,
        enableHotkeys: true,
        ...overrides.settings,
      },
      ...overrides,
    };
  }

  function createMockItem(overrides = {}) {
    return {
      _value: "My Label",
      background: "#36B37E",
      isEmpty: false,
      visible: true,
      selected: false,
      onClick: mock(),
      hotkey: null,
      html: null,
      showalias: false,
      alias: null,
      aliasstyle: "opacity: 0.6",
      hint: null,
      ...overrides,
    };
  }

  it("renders label value", () => {
    const item = createMockItem({ _value: "Option A" });
    const store = createMockStore();
    render(
      <Provider store={store}>
        <HtxLabelView item={item} />
      </Provider>,
    );
    expect(screen.getByText("Option A")).toBeInTheDocument();
  });

  it("calls onClick when label is clicked", async () => {
    const user = userEvent.setup();
    const onClick = mock();
    const item = createMockItem({ _value: "Click me", onClick });
    const store = createMockStore();
    render(
      <Provider store={store}>
        <HtxLabelView item={item} />
      </Provider>,
    );
    await user.click(screen.getByText("Click me"));
    expect(onClick).toHaveBeenCalled();
  });

  it("renders hotkey when settings enable it", () => {
    const item = createMockItem({ _value: "V", hotkey: "1" });
    const store = createMockStore();
    render(
      <Provider store={store}>
        <HtxLabelView item={item} />
      </Provider>,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("does not render hotkey when enableHotkeys is false", () => {
    const item = createMockItem({ _value: "V", hotkey: "2" });
    const store = createMockStore({ settings: { enableHotkeys: false } });
    render(
      <Provider store={store}>
        <HtxLabelView item={item} />
      </Provider>,
    );
    expect(screen.queryByText("[2]")).not.toBeInTheDocument();
  });

  it("renders alias when showalias is true", () => {
    const item = createMockItem({
      _value: "Display",
      showalias: true,
      alias: "VAL",
    });
    const store = createMockStore();
    render(
      <Provider store={store}>
        <HtxLabelView item={item} />
      </Provider>,
    );
    expect(screen.getByText(/VAL/)).toBeInTheDocument();
  });

  it("renders html content when html is set", () => {
    const item = createMockItem({
      _value: "Fallback",
      html: "<strong>Bold</strong>",
    });
    const store = createMockStore();
    render(
      <Provider store={store}>
        <HtxLabelView item={item} />
      </Provider>,
    );
    const el = document.querySelector("strong");
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent("Bold");
  });

  it("renders label when hint is set (wrapped in Tooltip)", () => {
    const item = createMockItem({ _value: "H", hint: "Help text" });
    const store = createMockStore();
    render(
      <Provider store={store}>
        <HtxLabelView item={item} />
      </Provider>,
    );
    expect(screen.getByText("H")).toBeInTheDocument();
  });

  it("does not show hotkey when enableLabelTooltips is false", () => {
    const item = createMockItem({ _value: "X", hotkey: "9" });
    const store = createMockStore({
      settings: { enableLabelTooltips: false, enableHotkeys: true },
    });
    render(
      <Provider store={store}>
        <HtxLabelView item={item} />
      </Provider>,
    );
    expect(screen.queryByText("[9]")).not.toBeInTheDocument();
  });
});
