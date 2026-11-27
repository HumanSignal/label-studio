import { destroy, getSnapshot, types } from "mobx-state-tree";
import { TabColumn } from "./tab_column";
import { TabHiddenColumns } from "./tab_hidden_columns";

const TestRoot = types.model("TestHiddenColumnsRoot", {
  isLabeling: false,
  columns: types.array(TabColumn),
  hiddenColumns: TabHiddenColumns,
});

describe("TabHiddenColumns", () => {
  let root;

  afterEach(() => {
    if (root) {
      destroy(root);
      root = null;
    }
  });

  it("ignores stale hidden column IDs that are no longer available", () => {
    root = TestRoot.create({
      columns: [
        {
          id: "tasks:text",
          title: "Text",
          alias: "text",
          target: "tasks",
        },
      ],
      hiddenColumns: {
        explore: ["tasks:inner_id", "tasks:text"],
        labeling: [],
      },
    });

    expect(root.hiddenColumns.hasColumn(root.columns[0])).toBe(true);
    expect(getSnapshot(root.hiddenColumns)).toEqual({
      explore: ["tasks:inner_id", "tasks:text"],
      labeling: [],
    });
  });

  it("stores hidden columns as stable IDs when toggled", () => {
    root = TestRoot.create({
      columns: [
        {
          id: "tasks:text",
          title: "Text",
          alias: "text",
          target: "tasks",
        },
        {
          id: "tasks:image",
          title: "Image",
          alias: "image",
          target: "tasks",
        },
      ],
      hiddenColumns: {
        explore: ["tasks:text"],
        labeling: [],
      },
    });

    root.hiddenColumns.remove(root.columns[0]);
    root.hiddenColumns.add(root.columns[1]);

    expect(getSnapshot(root.hiddenColumns)).toEqual({
      explore: ["tasks:image"],
      labeling: [],
    });
  });
});
