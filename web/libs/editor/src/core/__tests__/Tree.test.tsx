/**
 * Unit tests for core/Tree.tsx (parity-92).
 * Covers cssConverter, cleanUpId, findParentOfType, filterChildrenOfType,
 * traverseTree (TRAVERSE_SKIP, TRAVERSE_STOP), treeToModel parse error.
 */
import { types } from "mobx-state-tree";
import Tree, { TRAVERSE_SKIP, TRAVERSE_STOP, findParentOfType } from "../Tree";

describe("Tree", () => {
  describe("cssConverter", () => {
    it("returns null for empty or falsy style", () => {
      expect(Tree.cssConverter("")).toBeNull();
      expect(Tree.cssConverter(undefined as any)).toBeNull();
    });

    it("parses CSS string into object with camelCase keys", () => {
      const result = Tree.cssConverter("color: red; font-size: 14px;");
      expect(result).toEqual({ color: "red", fontSize: "14px" });
    });

    it("strips spaces from keys and trims value leading/trailing spaces", () => {
      const result = Tree.cssConverter("  margin-top : 10px ; padding-left: 5px ");
      expect(result).toBeDefined();
      expect(result?.marginTop).toBe("10px");
      expect(result?.paddingLeft).toBe("5px");
    });

    it("skips empty key segments", () => {
      const result = Tree.cssConverter(": value; foo: bar");
      expect(result).toBeDefined();
      expect(Object.keys(result!).length).toBeLessThanOrEqual(2);
    });
  });

  describe("cleanUpId", () => {
    it("strips @ and everything after", () => {
      expect(Tree.cleanUpId("id@something")).toBe("id");
      expect(Tree.cleanUpId("name@region-1")).toBe("name");
    });

    it("returns id unchanged when no @", () => {
      expect(Tree.cleanUpId("plain")).toBe("plain");
    });
  });

  describe("findParentOfType", () => {
    const NodeA = types.model("NodeA", { id: types.identifier });
    const NodeB = types.model("NodeB", { id: types.identifier, children: types.optional(types.array(NodeA), []) });
    const Root = types.model("Root", { child: NodeB });

    it("returns parent when getParentOfType finds one", () => {
      const root = Root.create({ child: { id: "b", children: [{ id: "a1" }] } });
      const nodeA = root.child.children[0];
      const parent = findParentOfType(nodeA, [NodeB]);
      expect(parent).toBe(root.child);
    });

    it("returns null when no matching parent", () => {
      const root = Root.create({ child: { id: "b" } });
      const parent = findParentOfType(root.child, [NodeA]);
      expect(parent).toBeNull();
    });

    it("catches getParentOfType errors and continues to next class", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const badObj = {} as any;
      const parent = findParentOfType(badObj, [NodeA, NodeB]);
      expect(parent).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("traverseTree", () => {
    it("visits every node when callback returns void", () => {
      const visited: string[] = [];
      const root = {
        id: "root",
        children: [
          { id: "a", children: [] },
          { id: "b", children: [] },
        ],
      };
      Tree.traverseTree(root as any, (node: any) => {
        visited.push(node.id);
      });
      expect(visited).toEqual(["root", "a", "b"]);
    });

    it("skips children when callback returns TRAVERSE_SKIP", () => {
      const visited: string[] = [];
      const root = {
        id: "root",
        children: [
          { id: "a", children: [{ id: "a1", children: [] }] },
          { id: "b", children: [] },
        ],
      };
      Tree.traverseTree(root as any, (node: any) => {
        visited.push(node.id);
        return node.id === "a" ? TRAVERSE_SKIP : undefined;
      });
      expect(visited).toEqual(["root", "a", "b"]);
    });

    it("stops traversal when callback returns TRAVERSE_STOP", () => {
      const visited: string[] = [];
      const root = {
        id: "root",
        children: [
          { id: "a", children: [] },
          { id: "b", children: [] },
        ],
      };
      Tree.traverseTree(root as any, (node: any) => {
        visited.push(node.id);
        return node.id === "a" ? TRAVERSE_STOP : undefined;
      });
      expect(visited).toEqual(["root", "a"]);
    });
  });

  describe("filterChildrenOfType", () => {
    const TextModel = types.model("Text", { name: types.optional(types.string, "") });
    const ViewModel = types.model("View", {
      children: types.optional(
        types.array(
          types.union(
            TextModel,
            types.late(() => ViewModel),
          ),
        ),
        [],
      ),
    });

    it("returns nodes matching single type name", () => {
      const root = ViewModel.create({
        children: [{ name: "t1" }, { name: "t2" }],
      });
      const result = Tree.filterChildrenOfType(root as any, "Text");
      expect(result).toHaveLength(2);
      expect(result.map((n: any) => n.name)).toEqual(["t1", "t2"]);
    });

    it("accepts array of type names", () => {
      const root = ViewModel.create({
        children: [{ name: "a" }, { children: [] }],
      });
      const result = Tree.filterChildrenOfType(root as any, ["Text", "View"]);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("treeToModel", () => {
    it("throws on XML parse error", () => {
      const store = { task: { dataObj: {} } };
      expect(() => {
        Tree.treeToModel("<View><unclosed>", store as any);
      }).toThrow();
    });

    it("repeater with mode=pagination yields pagedview type", () => {
      const store = { task: { dataObj: { items: ["a", "b"] } } };
      const result = Tree.treeToModel(
        `<View><Repeater on="$items" mode="pagination"><Text name="t_{{idx}}" value="$items[{{idx}}]" /></Repeater></View>`,
        store as any,
      );
      expect(result.children).toBeDefined();
      expect(result.children![0].type).toBe("pagedview");
    });

    it("parses nested element children", () => {
      const store = { task: { dataObj: {} } };
      const result = Tree.treeToModel(`<View><View><Text name="inner" value="x" /></View></View>`, store as any);
      expect(result.children).toHaveLength(1);
      expect(result.children![0].children).toBeDefined();
      expect(result.children![0].children!.length).toBeGreaterThan(0);
    });

    it("converts boolean attributes true/false", () => {
      const store = { task: { dataObj: {} } };
      const result = Tree.treeToModel(
        `<View><Text name="t" value="v" readonly="true" disabled="false" /></View>`,
        store as any,
      );
      const textNode = result.children!.find((c: any) => c.type === "text" || c.type === "richtext");
      expect(textNode).toBeDefined();
      expect(textNode.readonly).toBe(true);
      expect(textNode.disabled).toBe(false);
    });

    it("parses node with innerHTML as value (hypertext/text-only branch)", () => {
      const store = { task: { dataObj: {} } };
      const result = Tree.treeToModel(`<View><HyperText name="ht"><p>hello</p></HyperText></View>`, store as any);
      const hyperNode = result.children!.find((c: any) => c.type === "hypertext");
      expect(hyperNode).toBeDefined();
      expect(hyperNode?.value).toBeDefined();
    });
  });

  describe("extractNames", () => {
    it("returns names and toNames from root with name/toname", () => {
      const Registry = require("../Registry").default;
      require("../../tags/visual/View");
      require("../../tags/object/RichText");
      const config = Tree.treeToModel(`<View><Text name="mytext" value="$t" /></View>`, {
        task: { dataObj: { t: "hi" } },
      });
      const ViewModel = Registry.getModelByTag("view");
      const root = ViewModel.create(config);
      const { names, toNames } = Tree.extractNames(root);
      expect(names).toBeInstanceOf(Map);
      expect(toNames).toBeInstanceOf(Map);
      expect(names.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe("renderItem and renderChildren", () => {
    it("renderItem returns a React element for a registered View model", () => {
      const Registry = require("../Registry").default;
      require("../../tags/visual/View");
      require("../../tags/object/RichText");
      const config = Tree.treeToModel(`<View><Text name="mytext" value="$t" /></View>`, {
        task: { dataObj: { t: "hi" } },
      });
      const ViewModel = Registry.getModelByTag("view");
      const root = ViewModel.create(config);
      const result = Tree.renderItem(root, null as any);
      expect(result).toBeTruthy();
      expect(result?.type).toBeDefined();
    });

    it("renderChildren returns array of elements when item has children", () => {
      const Registry = require("../Registry").default;
      require("../../tags/visual/View");
      require("../../tags/object/RichText");
      const config = Tree.treeToModel(`<View><Text name="a" value="$x" /><Text name="b" value="$y" /></View>`, {
        task: { dataObj: { x: "1", y: "2" } },
      });
      const ViewModel = Registry.getModelByTag("view");
      const root = ViewModel.create(config);
      const result = Tree.renderChildren(root, null as any);
      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result!.length).toBeGreaterThan(0);
    });

    it("renderChildren returns null when item has no children", () => {
      const Registry = require("../Registry").default;
      require("../../tags/visual/View");
      require("../../tags/object/RichText");
      const config = Tree.treeToModel(`<View><Text name="only" value="$x" /></View>`, {
        task: { dataObj: { x: "1" } },
      });
      const ViewModel = Registry.getModelByTag("view");
      const root = ViewModel.create(config);
      const textNode = root.children[0];
      const result = Tree.renderChildren(textNode, null as any);
      expect(result).toBeNull();
    });
  });
});
