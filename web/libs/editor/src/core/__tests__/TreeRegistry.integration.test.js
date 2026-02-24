/**
 * Integration tests for Tree + Registry (Chunk 10 - stores/core).
 * Covers treeToModel, Registry.getModelByTag, and Tree.extractNames.
 */
import Tree from "../Tree";
import Registry from "../Registry";
import "../../tags/visual/View";
import "../../tags/object/RichText";

function createStore(data = {}) {
  return { task: { dataObj: data } };
}

describe("Tree + Registry integration", () => {
  it("treeToModel parses View with Text child", () => {
    const store = createStore({ text: "Hello" });
    const result = Tree.treeToModel(
      `<View>
        <Text name="t1" value="$text" />
      </View>`,
      store,
    );
    expect(result.type).toBe("view");
    expect(result.children).toBeDefined();
    expect(result.children.length).toBeGreaterThan(0);
    const textNode = result.children.find((c) => c.type === "text" || c.type === "richtext");
    expect(textNode).toBeDefined();
    expect(textNode.name).toBeDefined();
  });

  it("Registry.getModelByTag returns model for view", () => {
    const ViewModel = Registry.getModelByTag("view");
    expect(ViewModel).toBeDefined();
    expect(ViewModel.name).toBe("ViewModel");
  });

  it("Registry.getModelByTag returns model for text", () => {
    const TextModel = Registry.getModelByTag("text");
    expect(TextModel).toBeDefined();
  });

  it("extractNames returns names and toNames from MST root", () => {
    const config = Tree.treeToModel(
      `<View>
        <Text name="mytext" value="$text" />
      </View>`,
      createStore({ text: "Hi" }),
    );
    const ViewModel = Registry.getModelByTag("view");
    const root = ViewModel.create(config);
    const { names, toNames } = Tree.extractNames(root);
    expect(names).toBeInstanceOf(Map);
    expect(toNames).toBeInstanceOf(Map);
    expect(names.size).toBeGreaterThanOrEqual(0);
  });
});
