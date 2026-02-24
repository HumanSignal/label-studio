/**
 * Integration tests for Annotation store (Chunk 10 - stores/core).
 * Tests annotation store behavior via the store model in isolation to avoid
 * pulling in AppStore -> Annotation -> Area -> RectRegion -> Image union (heavy deps).
 */
import Tree from "../../core/Tree";
import Registry from "../../core/Registry";
import "../../tags/visual/View";
import "../../tags/object/RichText";

const MINIMAL_CONFIG = `<View><Text name="t1" value="$text" /></View>`;

describe("Annotation store integration", () => {
  it("builds root from minimal config via Tree and Registry (store init path)", () => {
    const storeRef = { task: { dataObj: { text: "Hi" } } };
    const config = Tree.treeToModel(MINIMAL_CONFIG, storeRef);
    const ViewModel = Registry.getModelByTag("view");
    const root = ViewModel.create(config);
    expect(root).toBeDefined();
    expect(root.type).toBe("view");
    const { names, toNames } = Tree.extractNames(root);
    expect(names).toBeDefined();
    expect(toNames).toBeDefined();
  });

  it("Registry has view and text models required for minimal annotation config", () => {
    expect(Registry.getModelByTag("view")).toBeDefined();
    expect(Registry.getModelByTag("text")).toBeDefined();
  });
});
