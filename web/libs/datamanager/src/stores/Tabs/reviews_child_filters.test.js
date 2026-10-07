import { afterEach, describe, expect, it } from "bun:test";
import { destroy, getSnapshot, types, unprotect } from "mobx-state-tree";
import { TabStore, dataCleanup } from "./store";
import { fieldAliasFromFilterId, normalizeIntegerUserFilter } from "./filter_snapshot_utils";
import { findChildFilterType } from "./child_filter_types";
import { cellViewFor } from "./cell_view";

const RootStore = types
  .model({
    viewsStore: types.optional(TabStore, {}),
    apiVersion: 2,
    project: types.optional(types.model({ id: types.number }), { id: 1 }),
    SDK: types.optional(types.frozen(), { hasInterface: () => false, invoke: () => {} }),
    dataStore: types.optional(
      types.model({}).actions(() => ({
        clear() {},
        reload() {
          return Promise.resolve();
        },
      })),
      {},
    ),
  })
  .actions(() => ({
    apiCall() {
      return Promise.resolve({ id: 100, title: "Saved" });
    },
    unsetSelection() {},
  }));

const filterable = { visibility_defaults: { filter: true }, target: "tasks" };
const REVIEW_CHILDREN = ["reviewed_by", "reviewed_at", "review_result", "is_current_verdict"];
const allowedFor = (id) => [...REVIEW_CHILDREN.filter((child) => child !== id), "annotators"];

const dataColumnsNamedLikeReviews = [
  {
    id: "data",
    title: "data",
    type: "List",
    children: ["annotators", "is_current_verdict", "review_result"],
    hidden: true,
    ...filterable,
  },
  { id: "annotators", title: "annotators", type: "String", parent: "data", ...filterable },
  { id: "is_current_verdict", title: "is_current_verdict", type: "String", parent: "data", ...filterable },
  { id: "review_result", title: "review_result", type: "String", parent: "data", ...filterable },
];

const rootColumns = [
  { id: "id", title: "ID", type: "Number", ...filterable },
  { id: "reviewed_at", title: "Reviewed at", type: "Datetime", ...filterable },
  { id: "annotators", title: "Annotators", type: "List", schema: { multiple: true }, ...filterable },
];

const reviewColumns = [
  { id: "reviews", title: "reviews", type: "List", children: REVIEW_CHILDREN, hidden: true, ...filterable },
  {
    id: "reviewed_by",
    title: "Reviewed by",
    type: "List",
    parent: "reviews",
    schema: { multiple: true },
    allowed_child_filters: allowedFor("reviewed_by"),
    ...filterable,
  },
  {
    id: "reviewed_at",
    title: "Reviewed at",
    type: "Datetime",
    parent: "reviews",
    allowed_child_filters: allowedFor("reviewed_at"),
    ...filterable,
  },
  {
    id: "review_result",
    title: "Review result",
    type: "List",
    parent: "reviews",
    schema: {
      items: [
        { value: "accepted", title: "Accepted" },
        { value: "fixed_and_accepted", title: "Fix + Accepted" },
        { value: "rejected", title: "Rejected" },
      ],
      multiple: true,
    },
    allowed_child_filters: allowedFor("review_result"),
    ...filterable,
  },
  {
    id: "is_current_verdict",
    title: "Is latest",
    type: "Boolean",
    parent: "reviews",
    child_only: true,
    allowed_child_filters: [],
    filter_default_value: true,
    ...filterable,
  },
];

describe("Reviews child filters", () => {
  let root;

  afterEach(() => {
    if (root) destroy(root);
    root = null;
  });

  // The backend appends the review columns after the root ones; the other order must work too.
  const orders = {
    "review columns after root columns": [...rootColumns, ...reviewColumns],
    "review columns before root columns": [...reviewColumns, ...rootColumns],
    // The API can list a nested column before its parent (it does for task data).
    "review children before their parent": [...rootColumns, ...reviewColumns.slice(1), reviewColumns[0]],
    // A task data column with a review alias is listed before the root and review columns.
    "task data columns named like review columns first": [
      ...dataColumnsNamedLikeReviews,
      ...rootColumns,
      ...reviewColumns,
    ],
  };

  const createView = (columnsRaw, parentFilter = "filter:tasks:reviews.reviewed_by", children = []) => {
    root = RootStore.create({ viewsStore: { columnsRaw } });
    root.viewsStore.fetchColumns();
    unprotect(root);
    root.viewsStore.views.push({
      id: 1,
      title: "Saved",
      saved: true,
      key: "saved",
      filters: [{ filter: parentFilter, operator: "contains", value: [3], child_filters: children }],
    });
    root.viewsStore.selected = 1;

    return { view: root.viewsStore.views[0], parent: root.viewsStore.views[0].filters[0] };
  };

  for (const [label, columnsRaw] of Object.entries(orders)) {
    describe(label, () => {
      it("adds a sibling review column for a shared alias, not the root column", () => {
        const { view, parent } = createView(columnsRaw);

        const child = view.addChildFilter(parent, "reviewed_at");

        expect(child.filter.id).toBe("filter:tasks:reviews.reviewed_at");
      });

      it("keeps resolving root columns such as annotators", () => {
        const { view, parent } = createView(columnsRaw);

        const child = view.addChildFilter(parent, "annotators");

        expect(child.filter.id).toBe("filter:tasks:annotators");
      });

      it("picks the first allowed sibling when no alias is given", () => {
        const { view, parent } = createView(columnsRaw);

        const child = view.addChildFilter(parent);

        expect(child.filter.id).toBe("filter:tasks:reviews.reviewed_at");
      });

      it("resolves a child type per allowed alias from the parent's siblings", () => {
        const { view, parent } = createView(columnsRaw);

        const resolved = parent.field.allowed_child_filters.map(
          (alias) => findChildFilterType(view.parent.availableFilters, parent.field, alias, parent.target)?.id,
        );

        expect(resolved).toEqual([
          "filter:tasks:reviews.reviewed_at",
          "filter:tasks:reviews.review_result",
          "filter:tasks:reviews.is_current_verdict",
          "filter:tasks:annotators",
        ]);
      });

      it("offers Is latest as a child but not as a filter of its own", () => {
        const { view, parent } = createView(columnsRaw);

        const child = view.addChildFilter(parent, "is_current_verdict");

        expect(child.filter.id).toBe("filter:tasks:reviews.is_current_verdict");
        expect(child.value).toBe(true);
        expect(view.availableFilters.map((filterType) => filterType.id)).not.toContain(
          "filter:tasks:reviews.is_current_verdict",
        );
      });

      it("offers no is empty on Reviews columns, only on the root Reviewed at", () => {
        const operatorKeys = (filter) => filter.cellView?.customOperators?.map((operator) => operator.key) ?? [];
        const { view, parent } = createView(columnsRaw);
        const reviewedAt = view.addChildFilter(parent, "reviewed_at");
        const { parent: rootReviewedAt } = createView(columnsRaw, "filter:tasks:reviewed_at");

        expect(operatorKeys(parent)).not.toContain("empty");
        expect(operatorKeys(reviewedAt)).not.toContain("empty");
        expect(rootReviewedAt.cellView?.customOperators).toBeUndefined();
      });

      it("leaves the root Reviewed at filter on its own column", () => {
        const { parent } = createView(columnsRaw, "filter:tasks:reviewed_at");

        expect(parent.field.parent).toBeFalsy();
        expect(parent.filter.id).toBe("filter:tasks:reviewed_at");
      });

      it("keeps child filters of a Reviews parent when the view is serialized and loaded again", () => {
        const children = [
          { filter: "filter:tasks:reviews.reviewed_at", operator: "greater", value: "2025-08-29T00:00:00.000Z" },
          { filter: "filter:tasks:reviews.review_result", operator: "contains", value: ["rejected", "accepted"] },
          { filter: "filter:tasks:annotators", operator: "contains", value: [7] },
        ];
        const { view } = createView(columnsRaw, "filter:tasks:reviews.reviewed_by", children);

        const [saved] = view.serialize().data.filters.items;
        expect(saved.filter).toBe("filter:tasks:reviews.reviewed_by");
        expect(saved.child_filters.map((child) => child.filter)).toEqual(children.map((child) => child.filter));
        expect(saved.child_filters.map((child) => child.value)).toEqual(children.map((child) => child.value));

        destroy(root);
        const reloaded = createView(columnsRaw, saved.filter, saved.child_filters);
        expect(getSnapshot(reloaded.parent).child_filters.map((child) => child.filter)).toEqual(
          children.map((child) => child.filter),
        );
        expect(reloaded.parent.child_filters.map((child) => child.field.parent?.alias ?? null)).toEqual([
          "reviews",
          "reviews",
          null,
        ]);
      });
    });
  }
});

describe("reviewed_by user ids", () => {
  it("keeps the reviews parent in the filter alias", () => {
    expect(fieldAliasFromFilterId("filter:tasks:reviews.reviewed_by")).toBe("reviews.reviewed_by");
  });

  it("normalizes reviewed_by values to integer user ids", () => {
    const filter = (alias) => ({
      fieldAlias: fieldAliasFromFilterId(alias),
      operator: "contains",
      value: ["3", "4"],
    });

    expect(normalizeIntegerUserFilter(filter("filter:tasks:reviews.reviewed_by"))).toEqual({
      operator: "contains",
      value: [3, 4],
    });
  });

  it("does not treat a result tag named like a user column as a user list", () => {
    const filter = {
      fieldAlias: fieldAliasFromFilterId("filter:tasks:annotations_results_json.annotators"),
      operator: "contains",
      value: ["positive"],
    };

    expect(normalizeIntegerUserFilter(filter)).toEqual({ operator: "contains", value: ["positive"] });
  });

  it("does not treat a result tag named reviewed_by as a user list", () => {
    const filter = {
      fieldAlias: fieldAliasFromFilterId("filter:tasks:annotations_results_json.reviewed_by"),
      operator: "contains",
      value: ["positive"],
    };

    expect(normalizeIntegerUserFilter(filter)).toEqual({ operator: "contains", value: ["positive"] });
  });
});

describe("Reviews columns are filter-only", () => {
  let root;

  afterEach(() => {
    if (root) destroy(root);
    root = null;
  });

  const setup = () => {
    root = RootStore.create({
      viewsStore: {
        columnsRaw: [
          ...rootColumns,
          { id: "data", title: "data", type: "List", children: ["reviews"], hidden: true, ...filterable },
          { id: "reviews", title: "reviews", type: "String", parent: "data", ...filterable },
          ...reviewColumns,
        ],
      },
    });
    root.viewsStore.fetchColumns();
    return root.viewsStore;
  };

  const byId = (store, id) => store.columns.find((column) => column.id === id);

  it("keeps the Reviews parent and children out of the column selector and the table", () => {
    const store = setup();

    for (const id of REVIEW_CHILDREN) {
      expect(byId(store, `tasks:reviews.${id}`).isFilterOnlyColumn).toBe(true);
    }
    expect(byId(store, "tasks:reviews").isFilterOnlyColumn).toBe(true);
  });

  it("does not hide a task data column that happens to be called reviews", () => {
    const store = setup();

    expect(byId(store, "tasks:data.reviews").isFilterOnlyColumn).toBe(false);
    expect(byId(store, "tasks:reviewed_at").isFilterOnlyColumn).toBe(false);
  });

  it("gives task data columns named like Reviews columns their own cell view", () => {
    root = RootStore.create({ viewsStore: { columnsRaw: [...dataColumnsNamedLikeReviews, ...reviewColumns] } });
    root.viewsStore.fetchColumns();
    const store = root.viewsStore;

    for (const alias of ["is_current_verdict", "review_result"]) {
      expect(cellViewFor(byId(store, `tasks:data.${alias}`))?.customOperators).toBeUndefined();
      expect(cellViewFor(byId(store, `tasks:reviews.${alias}`))?.customOperators).toBeDefined();
    }
  });

  it("keeps the operators of Reviews columns unrestricted by the annotation-results rules", () => {
    const store = setup();

    expect(byId(store, "tasks:reviews.reviewed_at").isAnnotationResultsFilterColumn).toBe(false);
  });

  it("drops Reviews columns from saved column state but keeps their filters", () => {
    const store = setup();
    const tab = {
      id: 1,
      data: {
        filters: {
          conjunction: "and",
          items: [{ filter: "filter:tasks:reviews.reviewed_by", operator: "contains", value: [1] }],
        },
        columnOrder: { "tasks:id": 1, "tasks:reviews.reviewed_by": 2 },
        columnsDisplayType: { "tasks:reviews.reviewed_at": "Datetime" },
        hiddenColumns: { explore: ["tasks:reviews.reviewed_by", "tasks:id"] },
      },
    };

    const { data } = dataCleanup(tab, store.columns);

    expect(data.filters.items).toHaveLength(1);
    expect(data.columnOrder).toEqual({ "tasks:id": 1 });
    expect(data.columnsDisplayType).toEqual({});
    expect(data.hiddenColumns.explore).toEqual(["tasks:id"]);
  });
});

describe("Read-only Reviews columns", () => {
  let root;

  afterEach(() => {
    if (root) destroy(root);
    root = null;
  });

  const unavailable = {
    available_for_new_filters: false,
    filter_available: false,
    unavailable_reason: "Not available",
  };

  it("keep a saved Reviews line but offer no Reviews filter", () => {
    root = RootStore.create({
      viewsStore: { columnsRaw: [...rootColumns, ...reviewColumns.map((column) => ({ ...column, ...unavailable }))] },
    });
    root.viewsStore.fetchColumns();
    const tab = {
      id: 1,
      data: {
        filters: {
          conjunction: "and",
          items: [{ filter: "filter:tasks:reviews.reviewed_by", operator: "contains", value: [1] }],
        },
      },
    };

    const { data } = dataCleanup(tab, root.viewsStore.columns);

    expect(data.filters.items).toHaveLength(1);
    unprotect(root);
    root.viewsStore.views.push({ id: 1, title: "Saved", key: "saved", filters: [] });
    const offered = root.viewsStore.views[0].availableFilters.map((filterType) => filterType.id);
    expect(offered.some((id) => id.startsWith("filter:tasks:reviews."))).toBe(false);
  });

  it("keep a pasted Reviews line", () => {
    root = RootStore.create({
      viewsStore: { columnsRaw: [...rootColumns, ...reviewColumns.map((column) => ({ ...column, ...unavailable }))] },
    });
    root.viewsStore.fetchColumns();
    unprotect(root);
    root.viewsStore.views.push({ id: 1, title: "Saved", key: "saved", filters: [] });
    root.viewsStore.selected = 1;
    const view = root.viewsStore.views[0];

    view.importFilters({
      conjunction: "and",
      items: [
        { filter: "filter:tasks:reviews.reviewed_by", operator: "contains", value: [1] },
        { filter: "filter:tasks:id", operator: "equal", value: 3 },
      ],
    });

    expect(view.filters.map((filter) => filter.filter.id)).toEqual([
      "filter:tasks:reviews.reviewed_by",
      "filter:tasks:id",
    ]);
  });

  it("drop a pasted top-level Is latest line but keep it as a child", () => {
    root = RootStore.create({ viewsStore: { columnsRaw: [...rootColumns, ...reviewColumns] } });
    root.viewsStore.fetchColumns();
    unprotect(root);
    root.viewsStore.views.push({ id: 1, title: "Saved", key: "saved", filters: [] });
    root.viewsStore.selected = 1;
    const view = root.viewsStore.views[0];

    view.importFilters({
      conjunction: "and",
      items: [
        { filter: "filter:tasks:reviews.is_current_verdict", operator: "equal", value: true },
        {
          filter: "filter:tasks:reviews.reviewed_by",
          operator: "contains",
          value: [1],
          child_filters: [{ filter: "filter:tasks:reviews.is_current_verdict", operator: "equal", value: true }],
        },
      ],
    });

    expect(view.filters.map((filter) => filter.filter.id)).toEqual(["filter:tasks:reviews.reviewed_by"]);
    expect(view.filters[0].child_filters.map((child) => child.filter.id)).toEqual([
      "filter:tasks:reviews.is_current_verdict",
    ]);
  });
});
