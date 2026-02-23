/**
 * Unit tests for Taxonomy tag (tags/control/Taxonomy/Taxonomy.jsx)
 */
import { render, screen } from "@testing-library/react";
import { Provider } from "mobx-react";
import Tree from "../../../core/Tree";
import Registry from "../../../core/Registry";
import "../../visual/View";
import "../Choice";
import "../Taxonomy/Taxonomy";
import "../../object/RichText";
import { HtxTaxonomy, TaxonomyModel, traverse } from "../Taxonomy/Taxonomy";

const mockUnlock = jest.fn();
const mockAddErrors = jest.fn();
const mockSetChildren = jest.fn();
const mockAnnotation = {
  id: 1,
  results: [],
  names: new Map([["t1", {}]]),
  store: null,
  highlightedNode: null,
};
const mockStore = {
  unlock: mockUnlock,
  lock: jest.fn(),
  setChildren: mockSetChildren,
  children: [],
  task: { dataObj: {} },
  presignUrlForProject: jest.fn(() => Promise.resolve(null)),
  userLabels: null,
};
mockAnnotation.store = mockStore;

jest.mock("../../../utils/feature-flags", () => ({
  FF_LSDV_4583: "FF_LSDV_4583",
  FF_TAXONOMY_LABELING: "FF_TAXONOMY_LABELING",
  isFF: jest.fn(() => false),
}));

jest.mock("../../../components/Infomodal/Infomodal", () => ({
  __esModule: true,
  default: { warning: jest.fn() },
}));

jest.mock("../../../components/NewTaxonomy/NewTaxonomy", () => ({
  NewTaxonomy: () => <div data-testid="new-taxonomy">NewTaxonomy</div>,
}));

jest.mock("../../../components/Taxonomy/Taxonomy", () => ({
  Taxonomy: () => <div data-testid="legacy-taxonomy">Legacy Taxonomy</div>,
}));

jest.mock("../../../core/Tree", () => {
  const actual = jest.requireActual("../../../core/Tree").default;
  return {
    ...actual,
    filterChildrenOfType: jest.fn((node, type) => (node?.tiedChildren ?? []) || []),
  };
});

const CONFIG_TAXONOMY = `<View>
  <Taxonomy name="tax" toName="t1">
    <Choice value="A" />
    <Choice value="B" />
    <Choice value="C" alias="c-alias" />
  </Taxonomy>
  <Text name="t1" value="$text" />
</View>`;

/**
 * Build a root so the taxonomy's SharedStoreMixin store reference resolves in the same tree.
 * Root has model name "AnnotationStore", wraps the View, and has StoreExtender so addSharedStore
 * puts the shared store in this tree and taxonomy.store resolves.
 * @param {object} [storeRef] - task data ref for treeToModel
 * @param {object} [storeOverride] - use this store instead of mockStore (e.g. for userLabels tests)
 * @param {object} [annotationOverrides] - merge into annotation snapshot (e.g. { results: [mockResult] })
 * @param {object} [configOverride] - use this instead of CONFIG_TAXONOMY (e.g. from Tree.treeToModel(xml, storeRef))
 */
function createTaxonomyNode(
  storeRef = { task: { dataObj: { text: "Hello" } } },
  storeOverride = null,
  annotationOverrides = {},
  configOverride = null,
) {
  const { types } = require("mobx-state-tree");
  const { StoreExtender } = require("../../../mixins/SharedChoiceStore/extender");
  const ViewModel = Registry.getModelByTag("view");
  const WrapperModel = types.model("Wrapper", { view: ViewModel });
  const TaxonomyModelRef = types.safeReference(Registry.getModelByTag("taxonomy"));
  const ResultItemModel = types.model("ResultItem", {
    mainValue: types.frozen(),
    from_name: types.maybeNull(TaxonomyModelRef),
  });
  const SelectedAnnotationModel = types
    .model("SelectedAnnotation", {
      id: types.number,
      results: types.optional(types.array(ResultItemModel), []),
      names: types.frozen(),
      store: types.frozen(),
      highlightedNode: types.maybeNull(types.frozen()),
    })
    .actions((self) => ({
      addResult(result) {
        self.results.push(result);
      },
    }));
  const RootModel = types.compose(
    "AnnotationStore",
    StoreExtender,
    types.model({
      store: types.frozen(),
      annotationStore: types.optional(
        types.model({
          selected: types.maybeNull(SelectedAnnotationModel),
          selectedHistory: types.maybeNull(types.frozen()),
        }),
        {},
      ),
      wrapper: WrapperModel,
    }),
  );
  const config = configOverride ?? Tree.treeToModel(CONFIG_TAXONOMY, storeRef);
  const storeToUse = storeOverride ?? mockStore;
  const annotationSnapshot = {
    id: mockAnnotation.id,
    results: [],
    names: mockAnnotation.names,
    store: storeToUse,
    highlightedNode: mockAnnotation.highlightedNode,
    ...annotationOverrides,
  };
  const root = RootModel.create({
    store: storeToUse,
    sharedStores: {},
    annotationStore: {
      selected: annotationSnapshot,
      selectedHistory: annotationSnapshot,
    },
    wrapper: { view: config },
  });
  root.annotationStore.addErrors = mockAddErrors;
  const taxonomy = root.wrapper.view.children.find((c) => c.type === "taxonomy");
  return taxonomy ?? null;
}

function createTaxonomyNodeWithConfig(configXml, storeRef = { task: { dataObj: { text: "Hello" } } }) {
  const config = Tree.treeToModel(configXml, storeRef);
  return createTaxonomyNode(storeRef, null, {}, config);
}

beforeEach(() => {
  jest.clearAllMocks();
  window.STORE_INIT_OK = true;
  const { destroy } = require("../../../mixins/SharedChoiceStore/mixin");
  destroy();
  Tree.filterChildrenOfType.mockImplementation((node, type) => {
    if (type === "ChoiceModel" && node?.children) {
      return node.children.filter((c) => c.type === "choice");
    }
    return [];
  });
});
afterEach(() => {
  window.STORE_INIT_OK = undefined;
});

describe("traverse", () => {
  it("returns empty array for null root", () => {
    expect(traverse(null)).toEqual([]);
  });

  it("returns empty array for undefined root", () => {
    expect(traverse(undefined)).toEqual([]);
  });

  it("traverses single node with value and path", () => {
    const root = { value: "A" };
    const result = traverse(root);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ label: "A", path: ["A"], depth: 0 });
  });

  it("traverses node with hint and color", () => {
    const root = { value: "X", hint: "Hint text", color: "#ff0000" };
    const result = traverse(root);
    expect(result[0]).toMatchObject({ label: "X", hint: "Hint text", color: "#ff0000" });
  });

  it("traverses node with alias", () => {
    const root = { value: "Label", alias: "alias-val" };
    const result = traverse(root);
    expect(result[0].path).toEqual(["alias-val"]);
  });

  it("traverses nested children", () => {
    const root = { value: "Parent", children: [{ value: "Child" }] };
    const result = traverse(root);
    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0]).toMatchObject({ label: "Child", depth: 1 });
  });

  it("traverses array of roots", () => {
    const roots = [{ value: "A" }, { value: "B" }];
    const result = traverse(roots);
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe("A");
    expect(result[1].label).toBe("B");
  });

  it("deduplicates by value", () => {
    const roots = [{ value: "A" }, { value: "A" }];
    const result = traverse(roots);
    expect(result).toHaveLength(1);
  });
});

describe("Taxonomy model", () => {
  it("creates taxonomy with correct type and name", () => {
    const taxonomy = createTaxonomyNode();
    expect(taxonomy).not.toBeNull();
    expect(taxonomy.type).toBe("taxonomy");
    expect(taxonomy.name).toBe("tax");
    expect(taxonomy.toname).toBe("t1");
  });

  it("items returns traversed tree from children", () => {
    const taxonomy = createTaxonomyNode();
    const items = taxonomy.items;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(1);
    const first = items[0];
    expect(first).toHaveProperty("label");
    expect(first).toHaveProperty("path");
    expect(first).toHaveProperty("depth");
  });

  it("holdsState and isSelected reflect selected length", () => {
    const taxonomy = createTaxonomyNode();
    taxonomy.updateResult = jest.fn();
    expect(taxonomy.holdsState).toBe(false);
    expect(taxonomy.isSelected).toBe(false);
    expect(taxonomy.hasValue).toBe(false);
    taxonomy.onChange(null, [{ path: ["A"] }]);
    expect(taxonomy.holdsState).toBe(true);
    expect(taxonomy.isSelected).toBe(true);
  });

  it("isLoadedByApi is false when no apiurl", () => {
    const taxonomy = createTaxonomyNode();
    expect(taxonomy.isLoadedByApi).toBe(false);
  });

  it("selectedItems maps selected paths to levels", () => {
    const taxonomy = createTaxonomyNode();
    taxonomy.updateResult = jest.fn();
    taxonomy.onChange(null, [{ path: ["A"] }, { path: ["B"] }]);
    const selectedItems = taxonomy.selectedItems;
    expect(Array.isArray(selectedItems)).toBe(true);
    expect(selectedItems.length).toBe(2);
  });

  it("selectedValues returns selected array", () => {
    const taxonomy = createTaxonomyNode();
    taxonomy.updateResult = jest.fn();
    taxonomy.onChange(null, [{ path: ["A"] }]);
    expect(taxonomy.selectedValues()).toEqual([["A"]]);
  });

  it("findItemByValueOrAlias finds item by label", () => {
    const taxonomy = createTaxonomyNode();
    const item = taxonomy.findItemByValueOrAlias("A");
    expect(item).not.toBeNull();
    expect(item.label).toBe("A");
  });

  it("findItemByValueOrAlias finds item by alias", () => {
    const taxonomy = createTaxonomyNode();
    const item = taxonomy.findItemByValueOrAlias("c-alias");
    expect(item).not.toBeNull();
  });

  it.skip("findLabel returns label for single-level path (requires FF_TAXONOMY_LABELING)", () => {
    const taxonomy = createTaxonomyNode();
    const label = taxonomy.findLabel(["A"]);
    expect(label).not.toBeNull();
    expect(label.value).toBe("A");
    expect(label.id).toBe("A");
  });

  it.skip("needsUpdate sets selected from result mainValue", () => {
    const taxonomy = createTaxonomyNode();
    const root = require("mobx-state-tree").getRoot(taxonomy);
    root.annotationStore.selected.addResult({ mainValue: [["A"]], from_name: taxonomy });
    taxonomy.needsUpdate();
    expect(taxonomy.selected).toEqual([["A"]]);
  });

  it("needsUpdate clears selected when no result", () => {
    const taxonomy = createTaxonomyNode();
    taxonomy.updateResult = jest.fn();
    taxonomy.onChange(null, [{ path: ["A"] }]);
    mockAnnotation.results = [];
    taxonomy.needsUpdate();
    expect(taxonomy.selected).toEqual([]);
  });

  it("onChange does not clear when canRemoveItems is false and checked is empty", () => {
    const { isFF } = require("../../../utils/feature-flags");
    isFF.mockImplementation((ff) => ff === "FF_TAXONOMY_LABELING");
    const storeRef = { task: { dataObj: { text: "Hi" } } };
    const config = Tree.treeToModel(
      `<View><Taxonomy name="tax" toName="t1" labeling="true"><Choice value="A" /></Taxonomy><Text name="t1" value="$text" /></View>`,
      storeRef,
    );
    const taxonomy = createTaxonomyNode(storeRef);
    taxonomy.updateResult = jest.fn();
    taxonomy.onChange(null, [{ path: ["A"] }]);
    expect(taxonomy.selected).toEqual([["A"]]);
    Object.defineProperty(taxonomy, "canRemoveItems", { get: () => false, configurable: true });
    taxonomy.onChange(null, []);
    expect(taxonomy.selected).toEqual([["A"]]);
    isFF.mockImplementation(() => false);
  });

  it("onChange updates selected and maxUsagesReached", () => {
    const storeRef = { task: { dataObj: { text: "Hi" } } };
    const config = Tree.treeToModel(
      `<View><Taxonomy name="tax" toName="t1" maxUsages="2"><Choice value="A" /><Choice value="B" /></Taxonomy><Text name="t1" value="$text" /></View>`,
      storeRef,
    );
    const ViewModel = Registry.getModelByTag("view");
    const root = ViewModel.create(config);
    const taxonomy = root.children.find((c) => c.type === "taxonomy");
    taxonomy.updateResult = jest.fn();
    taxonomy.onChange(null, [{ path: ["A"] }, { path: ["B"] }]);
    expect(taxonomy.selected).toEqual([["A"], ["B"]]);
    expect(taxonomy.maxUsagesReached).toBe(true);
    expect(taxonomy.updateResult).toHaveBeenCalled();
  });

  it("unselectAll clears selected when labeling ff on", () => {
    const { isFF } = require("../../../utils/feature-flags");
    isFF.mockImplementation((ff) => ff === "FF_TAXONOMY_LABELING");
    const storeRef = { task: { dataObj: { text: "Hi" } } };
    const config = Tree.treeToModel(
      `<View><Taxonomy name="tax" toName="t1" labeling="true"><Choice value="A" /></Taxonomy><Text name="t1" value="$text" /></View>`,
      storeRef,
    );
    const ViewModel = Registry.getModelByTag("view");
    const root = ViewModel.create(config);
    const taxonomy = root.children.find((c) => c.type === "taxonomy");
    taxonomy.updateResult = jest.fn();
    taxonomy.onChange(null, [{ path: ["A"] }]);
    taxonomy.unselectAll();
    expect(taxonomy.selected).toEqual([]);
    isFF.mockImplementation(() => false);
  });

  it("onAddLabel calls userLabels.addLabel when userLabels exists", () => {
    const addLabel = jest.fn();
    const storeWithLabels = { ...mockStore, userLabels: { addLabel } };
    const taxonomy = createTaxonomyNode(undefined, storeWithLabels);
    taxonomy.onAddLabel(["Custom"]);
    expect(addLabel).toHaveBeenCalledWith("tax", ["Custom"]);
  });

  it("onDeleteLabel calls userLabels.deleteLabel when userLabels exists", () => {
    const deleteLabel = jest.fn();
    const storeWithLabels = { ...mockStore, userLabels: { deleteLabel } };
    const taxonomy = createTaxonomyNode(undefined, storeWithLabels);
    taxonomy.onDeleteLabel(["Custom"]);
    expect(deleteLabel).toHaveBeenCalledWith("tax", ["Custom"]);
  });

  it("requiredModal calls Infomodal.warning", () => {
    const taxonomy = createTaxonomyNode();
    const Infomodal = require("../../../components/Infomodal/Infomodal").default;
    taxonomy.requiredModal();
    expect(Infomodal.warning).toHaveBeenCalled();
  });

  it("validate returns false when selected exceeds maxusages", () => {
    const storeRef = { task: { dataObj: { text: "Hi" } } };
    const config = Tree.treeToModel(
      `<View><Taxonomy name="tax" toName="t1" maxUsages="1"><Choice value="A" /><Choice value="B" /></Taxonomy><Text name="t1" value="$text" /></View>`,
      storeRef,
    );
    const ViewModel = Registry.getModelByTag("view");
    const root = ViewModel.create(config);
    const taxonomy = root.children.find((c) => c.type === "taxonomy");
    taxonomy.updateResult = jest.fn();
    taxonomy.onChange(null, [{ path: ["A"] }, { path: ["B"] }]);
    expect(taxonomy.validate()).toBe(false);
  });

  it("beforeSend warns when selected exceeds maxusages", () => {
    const storeRef = { task: { dataObj: { text: "Hi" } } };
    const config = Tree.treeToModel(
      `<View><Taxonomy name="tax" toName="t1" maxUsages="1"><Choice value="A" /><Choice value="B" /></Taxonomy><Text name="t1" value="$text" /></View>`,
      storeRef,
    );
    const ViewModel = Registry.getModelByTag("view");
    const root = ViewModel.create(config);
    const taxonomy = root.children.find((c) => c.type === "taxonomy");
    taxonomy.updateResult = jest.fn();
    taxonomy.onChange(null, [{ path: ["A"] }, { path: ["B"] }]);
    const Infomodal = require("../../../components/Infomodal/Infomodal").default;
    taxonomy.beforeSend();
    expect(Infomodal.warning).toHaveBeenCalled();
  });

  it("afterClone copies selected from node", () => {
    const taxonomy = createTaxonomyNode();
    taxonomy.updateResult = jest.fn();
    taxonomy.onChange(null, [{ path: ["A"] }]);
    const node = { selected: [["B"]] };
    taxonomy.afterClone(node);
    expect(taxonomy.selected).toEqual([["B"]]);
  });

  it("items merges userLabels when present", () => {
    const addLabel = jest.fn();
    const storeWithLabels = {
      ...mockStore,
      userLabels: {
        addLabel,
        controls: { tax: [{ path: ["Custom"], origin: "user" }] },
      },
    };
    const taxonomy = createTaxonomyNode(undefined, storeWithLabels);
    const items = taxonomy.items;
    expect(Array.isArray(items)).toBe(true);
    const customItem = items.find((i) => i.label === "Custom" || i.children?.some((c) => c.label === "Custom"));
    expect(customItem || items.some((i) => i.children?.length > 0)).toBeTruthy();
  });

  it("loadItems on apiUrl taxonomy calls addErrors when fetch fails", async () => {
    const apiUrl = "https://example.com/taxonomy.json";
    const storeRef = { task: { dataObj: { api: apiUrl } } };
    const storeWithTask = { ...mockStore, task: { dataObj: { api: apiUrl } } };
    const config = Tree.treeToModel(
      `<View><Taxonomy name="tax" toName="t1" apiUrl="$api"><Choice value="A" /></Taxonomy><Text name="t1" value="$text" /></View>`,
      storeRef,
    );
    const { types } = require("mobx-state-tree");
    const { StoreExtender } = require("../../../mixins/SharedChoiceStore/extender");
    const ViewModel = Registry.getModelByTag("view");
    const WrapperModel = types.model("Wrapper", { view: ViewModel });
    const RootModel = types.compose(
      "AnnotationStore",
      StoreExtender,
      types.model({
        store: types.frozen(),
        annotationStore: types.optional(
          types.model({
            selected: types.maybeNull(types.frozen()),
            selectedHistory: types.maybeNull(types.frozen()),
          }),
          {},
        ),
        wrapper: WrapperModel,
      }),
    );
    const annotationSnapshot = {
      id: mockAnnotation.id,
      results: [],
      names: mockAnnotation.names,
      store: mockStore,
      highlightedNode: mockAnnotation.highlightedNode,
    };
    const root = RootModel.create({
      store: storeWithTask,
      sharedStores: {},
      annotationStore: {
        selected: { ...annotationSnapshot, store: storeWithTask },
        selectedHistory: annotationSnapshot,
      },
      wrapper: { view: config },
    });
    root.annotationStore.addErrors = mockAddErrors;
    const taxonomy = root.wrapper.view.children.find((c) => c.type === "taxonomy");
    await taxonomy.updateValue(storeWithTask);
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, statusText: "Server Error" });
    await taxonomy.loadItems();
    expect(mockAddErrors).toHaveBeenCalled();
    if (global.fetch.mockRestore) global.fetch.mockRestore();
  });

  it("loadItems on apiUrl taxonomy sets _items on success", async () => {
    const apiUrl = "https://example.com/taxonomy.json";
    const storeWithTask = { ...mockStore, task: { dataObj: { api: apiUrl } } };
    const config = Tree.treeToModel(
      `<View><Taxonomy name="tax" toName="t1" apiUrl="$api"><Choice value="A" /></Taxonomy><Text name="t1" value="$text" /></View>`,
      { task: { dataObj: { api: apiUrl } } },
    );
    const taxonomy = createTaxonomyNode({ task: { dataObj: { api: apiUrl } } }, storeWithTask, {}, config);
    const mockData = { items: [{ value: "X", alias: "x" }, { value: "Y" }] };
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    );
    await taxonomy.updateValue(storeWithTask);
    expect(taxonomy._items).toHaveLength(2);
    expect(taxonomy._items[0].label).toBe("X");
    expect(taxonomy._items[0].path).toEqual(["x"]);
    expect(taxonomy.loading).toBe(false);
    if (global.fetch.mockRestore) global.fetch.mockRestore();
  });

  it("loadItems uses Basic auth when apiUrl has username and password", async () => {
    const apiUrl = "https://user:pass@example.com/taxonomy.json";
    const storeWithTask = { ...mockStore, task: { dataObj: { api: apiUrl } } };
    const config = Tree.treeToModel(
      `<View><Taxonomy name="tax" toName="t1" apiUrl="$api"><Choice value="A" /></Taxonomy><Text name="t1" value="$text" /></View>`,
      { task: { dataObj: { api: apiUrl } } },
    );
    const taxonomy = createTaxonomyNode({ task: { dataObj: { api: apiUrl } } }, storeWithTask, {}, config);
    let capturedOptions = {};
    global.fetch = jest.fn((url, options) => {
      capturedOptions = options ?? {};
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [{ value: "Z" }] }),
      });
    });
    await taxonomy.updateValue(storeWithTask);
    expect(capturedOptions.headers).toBeDefined();
    expect(capturedOptions.headers.get?.("Authorization")).toContain("Basic ");
    if (global.fetch.mockRestore) global.fetch.mockRestore();
  });

  it("updateFromResult calls needsUpdate", () => {
    const taxonomy = createTaxonomyNode();
    taxonomy.updateResult = jest.fn();
    taxonomy.onChange(null, [{ path: ["A"] }]);
    expect(taxonomy.selected).toEqual([["A"]]);
    taxonomy.updateFromResult();
    expect(taxonomy.selected).toEqual([]);
  });
});

describe("HtxTaxonomy view", () => {
  it("renders loading spinner when loading and firstLoad", () => {
    const mockItem = {
      loading: true,
      items: [],
      isLoadedByApi: true,
      legacy: false,
      perRegionVisible: () => true,
      isVisible: true,
      elementRef: { current: null },
    };
    const store = { settings: {} };
    render(
      <Provider store={store}>
        <HtxTaxonomy item={mockItem} />
      </Provider>,
    );
    expect(document.querySelector(".ant-spin")).toBeInTheDocument();
  });

  it("renders NewTaxonomy when not legacy and not loading", () => {
    const taxonomy = createTaxonomyNode();
    jest.spyOn(taxonomy, "isReadOnly").mockReturnValue(false);
    const store = { settings: {} };
    render(
      <Provider store={store}>
        <HtxTaxonomy item={taxonomy} />
      </Provider>,
    );
    expect(screen.getByTestId("new-taxonomy")).toBeInTheDocument();
  });

  it("renders legacy Taxonomy when legacy is true", () => {
    const storeRef = { task: { dataObj: { text: "Hi" } } };
    const config = Tree.treeToModel(
      `<View><Taxonomy name="tax" toName="t1" legacy="true"><Choice value="A" /></Taxonomy><Text name="t1" value="$text" /></View>`,
      storeRef,
    );
    const { types } = require("mobx-state-tree");
    const { StoreExtender } = require("../../../mixins/SharedChoiceStore/extender");
    const ViewModel = Registry.getModelByTag("view");
    const WrapperModel = types.model("Wrapper", { view: ViewModel });
    const RootModel = types.compose(
      "AnnotationStore",
      StoreExtender,
      types.model({
        store: types.frozen(),
        annotationStore: types.optional(
          types.model({
            selected: types.maybeNull(types.frozen()),
            selectedHistory: types.maybeNull(types.frozen()),
          }),
          {},
        ),
        wrapper: WrapperModel,
      }),
    );
    const root = RootModel.create({
      store: mockStore,
      sharedStores: {},
      annotationStore: { selected: mockAnnotation, selectedHistory: mockAnnotation },
      wrapper: { view: config },
    });
    const taxonomy = root.wrapper.view.children.find((c) => c.type === "taxonomy");
    jest.spyOn(taxonomy, "isReadOnly").mockReturnValue(false);
    const store = { settings: {} };
    render(
      <Provider store={store}>
        <HtxTaxonomy item={taxonomy} />
      </Provider>,
    );
    expect(screen.getByTestId("legacy-taxonomy")).toBeInTheDocument();
  });

  it("hides when perRegionVisible is false", () => {
    const taxonomy = createTaxonomyNode();
    jest.spyOn(taxonomy, "perRegionVisible").mockReturnValue(false);
    jest.spyOn(taxonomy, "isReadOnly").mockReturnValue(false);
    const store = { settings: {} };
    const { container } = render(
      <Provider store={store}>
        <HtxTaxonomy item={taxonomy} />
      </Provider>,
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveStyle({ display: "none" });
  });
});
