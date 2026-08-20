import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { destroy, types, unprotect } from "mobx-state-tree";
import { afterEach, describe, expect, it, mock } from "bun:test";
import { observer } from "mobx-react";
import { TabStore } from "../../../stores/Tabs/store";
import { FilterLine, UnavailableFilterNotice, formatConjunctionLabel, isFilterEditingDisabled } from "./FilterLine";
import { useRecentFilters } from "../../../hooks/useRecentFilters";
import { filtersToPickerGroups } from "../../Common/ColumnPicker";

const RootStore = types
  .model({
    viewsStore: types.optional(TabStore, {}),
    apiVersion: 2,
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
    apiCall: mock(async () => ({ id: 1, title: "Saved" })),
    unsetSelection() {},
  }));

afterEach(() => {
  delete (window as any).DM;
});

const columnsRaw = [
  {
    id: "id",
    title: "ID",
    type: "Number",
    target: "tasks",
    visibility_defaults: { filter: true },
  },
  {
    id: "annotations_dimension_results",
    title: "Annotations",
    type: "List",
    target: "tasks",
    children: ["dimension_42"],
    hidden: true,
  },
  {
    id: "dimension_42",
    title: "Sentiment",
    type: "List",
    target: "tasks",
    parent: "annotations_dimension_results",
    hidden: true,
    available_for_new_filters: false,
    filter_available: false,
    unavailable_reason: "This Dimension filter is temporarily unavailable. Its saved value is preserved.",
    visibility_defaults: { filter: true },
    schema: { items: [{ value: "positive", title: "positive" }], multiple: true },
  },
];

const createFilter = ({ available = false, multiple = true }: { available?: boolean; multiple?: boolean } = {}) => {
  const configuredColumns = columnsRaw.map((column) =>
    column.id === "dimension_42"
      ? {
          ...column,
          available_for_new_filters: available,
          filter_available: available,
          unavailable_reason: available ? undefined : column.unavailable_reason,
          schema: { items: [{ value: "positive", title: "positive" }], multiple },
        }
      : column,
  );
  const root = RootStore.create({ viewsStore: { columnsRaw: configuredColumns } });
  root.viewsStore.fetchColumns();
  unprotect(root);
  root.viewsStore.views.push({
    id: 1,
    title: "Saved",
    saved: true,
    key: "saved",
    filters: [
      {
        filter: "filter:tasks:annotations_dimension_results.dimension_42",
        operator: "contains",
        value: ["positive"],
      },
    ],
  });
  root.viewsStore.selected = 1;
  return { root, view: root.viewsStore.views[0], filter: root.viewsStore.views[0].filters[0] };
};

const createUnavailableFilter = () => createFilter();

const childFilterColumnsRaw = [
  {
    id: "id",
    title: "ID",
    type: "Number",
    target: "tasks",
    visibility_defaults: { filter: true },
  },
  {
    id: "annotations_results",
    title: "Annotations",
    type: "List",
    target: "tasks",
    children: ["sentiment"],
    hidden: true,
  },
  {
    id: "sentiment",
    title: "Sentiment",
    type: "List",
    target: "tasks",
    parent: "annotations_results",
    allowed_child_filters: ["annotators", "ground_truth", "reviews_accepted", "reviews_rejected"],
    schema: { items: [{ value: "positive", title: "Positive" }], multiple: true },
    visibility_defaults: { filter: true },
  },
  {
    id: "annotators",
    title: "Annotators",
    type: "List",
    target: "tasks",
    schema: { multiple: true },
    visibility_defaults: { filter: true },
  },
  {
    id: "ground_truth",
    title: "Ground Truth",
    type: "Boolean",
    target: "tasks",
    visibility_defaults: { filter: true },
  },
  {
    id: "reviews_accepted",
    title: "Reviews accepted",
    type: "Number",
    target: "tasks",
    visibility_defaults: { filter: true },
  },
  {
    id: "reviews_rejected",
    title: "Reviews rejected",
    type: "Number",
    target: "tasks",
    visibility_defaults: { filter: true },
  },
];

const createMultiChildFilter = ({ childCount = 2 }: { childCount?: number } = {}) => {
  const children = [
    {
      filter: "filter:tasks:annotators",
      operator: "contains",
      value: [1],
    },
    {
      filter: "filter:tasks:ground_truth",
      operator: "equal",
      value: true,
    },
  ].slice(0, childCount);
  const root = RootStore.create({ viewsStore: { columnsRaw: childFilterColumnsRaw } });
  root.viewsStore.fetchColumns();
  unprotect(root);
  root.viewsStore.views.push({
    id: 1,
    title: "Saved",
    saved: true,
    key: "saved",
    filters: [
      {
        filter: "filter:tasks:annotations_results.sentiment",
        operator: "contains",
        value: ["positive"],
        child_filters: children,
      },
    ],
  });
  root.viewsStore.selected = 1;

  return { root, view: root.viewsStore.views[0], filter: root.viewsStore.views[0].filters[0] };
};

const createReviewIndicatorChildFilter = (
  childAlias: "reviews_accepted" | "reviews_rejected",
  { operator = "equal", value = 1 }: { operator?: string; value?: unknown } = {},
) => {
  const root = RootStore.create({ viewsStore: { columnsRaw: childFilterColumnsRaw } });
  root.viewsStore.fetchColumns();
  unprotect(root);
  root.viewsStore.views.push({
    id: 1,
    title: "Saved",
    saved: true,
    key: "saved",
    filters: [
      {
        filter: "filter:tasks:annotations_results.sentiment",
        operator: "contains",
        value: ["positive"],
        child_filters: [
          {
            filter: `filter:tasks:${childAlias}`,
            operator,
            value,
          },
        ],
      },
    ],
  });
  root.viewsStore.selected = 1;

  return { root, view: root.viewsStore.views[0], filter: root.viewsStore.views[0].filters[0] };
};

const createTopLevelReviewCountFilter = (alias: "reviews_accepted" | "reviews_rejected") => {
  const root = RootStore.create({ viewsStore: { columnsRaw: childFilterColumnsRaw } });
  root.viewsStore.fetchColumns();
  unprotect(root);
  root.viewsStore.views.push({
    id: 1,
    title: "Saved",
    saved: true,
    key: "saved",
    filters: [
      {
        filter: `filter:tasks:${alias}`,
        operator: "equal",
        value: 1,
      },
    ],
  });
  root.viewsStore.selected = 1;

  return { root, view: root.viewsStore.views[0], filter: root.viewsStore.views[0].filters[0] };
};

const FilterLineHarness = observer(
  ({ view, disabled = false }: { view: ReturnType<typeof createUnavailableFilter>["view"]; disabled?: boolean }) => (
    <>
      {view.filters.map((filter, index) => (
        <FilterLine
          key={filter.id}
          filter={filter}
          pickerFilters={view.availableFilters}
          index={index}
          view={view}
          disabled={disabled}
          disabledTooltip="This tab is locked. Unlock it to change filters."
        />
      ))}
    </>
  ),
);

const renderFilterLine = (
  view: ReturnType<typeof createUnavailableFilter>["view"],
  { disabled = false }: { disabled?: boolean } = {},
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  (window as any).DM = {
    apiCall: mock(async () => ({
      count: 1,
      results: [{ id: 1, email: "annotator@example.com", first_name: "Test", last_name: "Annotator" }],
    })),
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <FilterLineHarness view={view} disabled={disabled} />
    </QueryClientProvider>,
  );
};

const createNumberFilter = () => {
  const root = RootStore.create({ viewsStore: { columnsRaw } });
  root.viewsStore.fetchColumns();
  unprotect(root);
  root.viewsStore.views.push({
    id: 1,
    title: "Saved",
    saved: true,
    key: "saved",
    filters: [
      {
        filter: "filter:tasks:id",
        operator: "equal",
        value: 42,
      },
    ],
  });
  root.viewsStore.selected = 1;
  return { root, view: root.viewsStore.views[0], filter: root.viewsStore.views[0].filters[0] };
};

describe("Dimension result filter cardinality (FIT-2241)", () => {
  let root: ReturnType<typeof RootStore.create> | null = null;

  afterEach(() => {
    if (root) destroy(root);
    root = null;
  });

  for (const { multiple, label } of [
    { multiple: false, label: "is" },
    { multiple: true, label: "includes all" },
  ]) {
    it(`shows ${label} for ${multiple ? "set-valued" : "scalar"} Dimensions`, () => {
      const setup = createFilter({ available: true, multiple });
      root = setup.root;
      renderFilterLine(setup.view);

      expect(within(screen.getByTestId("filter-line-operator")).getByRole("button")).toHaveTextContent(label);
    });
  }
});

describe("multiple child filter controls (FIT-2273)", () => {
  let root: ReturnType<typeof RootStore.create> | null = null;

  afterEach(() => {
    if (root) destroy(root);
    root = null;
  });

  it("renders an enabled allowed-child dropdown and add-child control", () => {
    const setup = createMultiChildFilter({ childCount: 1 });
    root = setup.root;
    renderFilterLine(setup.view);

    const childColumnDropdown = screen.getByRole("button", { name: "Annotators" });
    expect(childColumnDropdown).toBeEnabled();
    expect(screen.getByRole("button", { name: "Add Child Filter" })).toBeEnabled();
    expect(screen.getByTestId("filter-line-add-child")).toBeEnabled();

    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = mock();
    try {
      fireEvent.click(childColumnDropdown);

      expect(screen.getByText("Ground Truth")).toBeInTheDocument();
      expect(screen.queryByText("ID")).not.toBeInTheDocument();
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it("renders multiple child rows and removes only the selected row", () => {
    const setup = createMultiChildFilter();
    root = setup.root;
    renderFilterLine(setup.view);

    expect(screen.getByRole("button", { name: "Annotators" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Ground Truth" })).toBeEnabled();
    const removeButtons = screen.getAllByRole("button", { name: "Remove child filter" });
    expect(removeButtons).toHaveLength(2);

    fireEvent.click(removeButtons[0]);

    expect(setup.view.filters).toHaveLength(1);
    expect(setup.filter.child_filters).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Annotators" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ground Truth" })).toBeEnabled();
  });
});

describe("review indicator child operators (FIT-2480)", () => {
  let root: ReturnType<typeof RootStore.create> | null = null;

  afterEach(() => {
    if (root) destroy(root);
    root = null;
  });

  it("uses Boolean operators and yes/no values for review indicator children", () => {
    const setup = createReviewIndicatorChildFilter("reviews_accepted");
    root = setup.root;
    renderFilterLine(setup.view);

    const childOperator = screen.getAllByTestId("filter-line-operator")[1];
    const childValue = screen.getAllByTestId("filter-line-value")[1];
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = mock();
    try {
      fireEvent.click(within(childOperator).getByRole("button"));
      expect(screen.getByRole("option", { name: "is" })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "is not" })).not.toBeInTheDocument();
      expect(screen.getByRole("option", { name: "is empty" })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "=" })).not.toBeInTheDocument();
      expect(screen.queryByRole("option", { name: ">" })).not.toBeInTheDocument();

      // Close operator menu before opening the value control.
      fireEvent.click(within(childOperator).getByRole("button"));
      fireEvent.click(within(childValue).getByRole("button"));
      expect(screen.getByRole("option", { name: "yes" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "no" })).toBeInTheDocument();
      expect(within(childValue).queryByRole("spinbutton")).not.toBeInTheDocument();
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it("does not rewrite saved numeric child operators to equal", () => {
    const setup = createReviewIndicatorChildFilter("reviews_accepted", { operator: "greater", value: 1 });
    root = setup.root;
    renderFilterLine(setup.view);

    expect(setup.filter.child_filters[0].operator).toBe("greater");
    expect(screen.getAllByTestId("filter-line-operator")).toHaveLength(2);
    expect(screen.queryAllByTestId("filter-line-value")).toHaveLength(1);
  });

  it("defaults a new reviews_accepted child to is no so the child is applied", () => {
    const setup = createMultiChildFilter({ childCount: 0 });
    root = setup.root;
    const reviewsAccepted = setup.view.availableFilters.find(
      (filterType) => filterType.field.alias === "reviews_accepted",
    );
    setup.view.addChildFilter(setup.filter, reviewsAccepted);
    renderFilterLine(setup.view);

    const child = setup.filter.child_filters[0];
    expect(child.operator).toBe("equal");
    expect(child.value).toBe(false);
    expect(child.isValidFilter).toBe(true);

    const serializedChild = setup.view.serializedFilters[0].child_filters[0];
    expect(serializedChild).toBeDefined();
    // Column type stays Number, so the wire value is 0/1 (backend strict indicators).
    expect(serializedChild.value).toBe(0);
    expect(serializedChild.operator).toBe("equal");

    const childValue = screen.getAllByTestId("filter-line-value")[1];
    expect(within(childValue).getByRole("button")).toHaveTextContent("no");
  });

  it("preserves all numeric operators for top-level reviews_accepted", () => {
    const setup = createTopLevelReviewCountFilter("reviews_accepted");
    root = setup.root;
    renderFilterLine(setup.view);

    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = mock();
    try {
      fireEvent.click(within(screen.getByTestId("filter-line-operator")).getByRole("button"));

      for (const operator of ["=", "≠", "<", ">", "≤", "≥", "is between", "not between", "is empty"]) {
        expect(screen.getByRole("option", { name: operator })).toBeInTheDocument();
      }
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
  });
});

describe("locked filter value controls (FIT-2447)", () => {
  let root: ReturnType<typeof RootStore.create> | null = null;

  afterEach(() => {
    if (root) destroy(root);
    root = null;
  });

  it("disables single-select list value control when the tab is locked", () => {
    const setup = createFilter({ available: true, multiple: false });
    root = setup.root;
    renderFilterLine(setup.view, { disabled: true });

    expect(within(screen.getByTestId("filter-line-value")).getByRole("button")).toBeDisabled();
  });

  it("marks multi-select list value control as read-only when the tab is locked", () => {
    const setup = createFilter({ available: true, multiple: true });
    root = setup.root;
    renderFilterLine(setup.view, { disabled: true });

    const trigger = within(screen.getByTestId("filter-line-value")).getByRole("button");
    expect(trigger).not.toBeDisabled();
    expect(trigger).toHaveAttribute("aria-readonly", "true");
  });

  it("disables number value input when the tab is locked", () => {
    const setup = createNumberFilter();
    root = setup.root;
    renderFilterLine(setup.view, { disabled: true });

    expect(within(screen.getByTestId("filter-line-value")).getByRole("spinbutton")).toBeDisabled();
  });

  it("keeps multi-select values inspectable but unchanged when locked (FIT-2396 pattern)", async () => {
    const setup = createFilter({ available: true, multiple: true });
    root = setup.root;
    renderFilterLine(setup.view, { disabled: true });

    const trigger = within(screen.getByTestId("filter-line-value")).getByRole("button");
    expect(trigger).toHaveAttribute("aria-readonly", "true");
    fireEvent.click(trigger);

    const option = await screen.findByRole("option", { name: /positive/i });
    fireEvent.click(option);

    expect(setup.filter.currentValue).toEqual(["positive"]);
    expect(screen.queryByRole("button", { name: "All" })).toBeNull();
    expect(screen.queryByRole("button", { name: "None" })).toBeNull();
  });
});

describe("Filters pane chrome UX (FIT-2448)", () => {
  let root: ReturnType<typeof RootStore.create> | null = null;

  afterEach(() => {
    if (root) destroy(root);
    root = null;
  });

  it("keeps remove controls labeled and consistent conjunction typography for child rows", () => {
    const setup = createMultiChildFilter({ childCount: 1 });
    root = setup.root;
    renderFilterLine(setup.view, false);

    expect(screen.getByTestId("filter-line-remove")).toHaveAccessibleName("Remove filter");
    expect(screen.getByTestId("filter-line-remove-child")).toHaveAccessibleName("Remove child filter");
    expect(screen.getByTestId("filter-line-add-child")).toHaveTextContent("Add Child Filter");
    expect(screen.getByText("Where")).toBeInTheDocument();
    expect(screen.getByText("And")).toBeInTheDocument();
  });

  it("renders remove controls as negative string buttons at the field height", () => {
    const setup = createMultiChildFilter({ childCount: 1 });
    root = setup.root;
    renderFilterLine(setup.view, false);

    for (const testId of ["filter-line-remove", "filter-line-remove-child"]) {
      const button = screen.getByTestId(testId);
      expect(button).toHaveAttribute("data-variant", "negative");
      expect(button).toHaveAttribute("data-look", "string");
      expect(button.className).toContain("size-smaller");
    }
  });

  it("uses static conjunction text on rows after the first And/Or control", () => {
    const setup = createMultiChildFilter({ childCount: 0 });
    root = setup.root;
    unprotect(root);
    setup.view.createFilter();
    setup.view.createFilter();
    setup.view.setConjunction("or");
    renderFilterLine(setup.view, false);

    expect(formatConjunctionLabel("or")).toBe("Or");
    expect(formatConjunctionLabel("and")).toBe("And");
    // Row 0: Where; row 1: editable Or select; row 2+: static "Or" (not a disabled select)
    expect(screen.getByText("Where")).toBeInTheDocument();
    const orLabels = screen.getAllByText("Or");
    expect(orLabels.length).toBeGreaterThanOrEqual(2);
    // Only one conjunction dropdown (row 1); later rows are plain text
    const conjunctionButtons = screen
      .getAllByRole("button")
      .filter((el) => el.textContent === "Or" || el.textContent === "And");
    expect(conjunctionButtons).toHaveLength(1);
  });

  it("nests child filters under the parent field column", () => {
    const setup = createMultiChildFilter({ childCount: 1 });
    root = setup.root;
    renderFilterLine(setup.view, false);

    const nest = screen.getByTestId("filter-line-nest");
    expect(nest).toBeInTheDocument();
    expect(nest).toContainElement(screen.getByRole("button", { name: "Annotators" }));
    expect(nest).toContainElement(screen.getByTestId("filter-line-add-child"));
  });
});

describe("unavailable saved filters (FIT-2173)", () => {
  let root: ReturnType<typeof RootStore.create> | null = null;

  afterEach(() => {
    if (root) destroy(root);
    root = null;
  });

  it("shows a non-blocking explanation for an unavailable saved filter", () => {
    render(
      <UnavailableFilterNotice reason="This Dimension filter is temporarily unavailable. Its saved value is preserved." />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("temporarily unavailable");
    expect(screen.getByRole("status")).toHaveTextContent("saved value is preserved");
  });

  it("disables operator and value editing when the saved field is unavailable", () => {
    expect(isFilterEditingDisabled({ disabled: false, filter_available: false })).toBe(true);
    expect(isFilterEditingDisabled({ disabled: true, filter_available: true })).toBe(true);
    expect(isFilterEditingDisabled({ disabled: false, filter_available: true })).toBe(false);
  });

  it("identifies, disables, preserves, and removes an unavailable filter", async () => {
    const setup = createUnavailableFilter();
    root = setup.root;
    renderFilterLine(setup.view);

    expect(screen.getByText("Sentiment")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("saved value is preserved");
    expect(within(screen.getByTestId("filter-line-operator")).getByRole("button")).toBeDisabled();
    // Multi-select value controls use readOnly (inspectable) when editing is blocked (FIT-2447).
    const valueTrigger = within(screen.getByTestId("filter-line-value")).getByRole("button");
    expect(valueTrigger).not.toBeDisabled();
    expect(valueTrigger).toHaveAttribute("aria-readonly", "true");
    expect(setup.filter.currentValue).toEqual(["positive"]);
    await waitFor(() => expect(setup.filter.saving).toBe(false));

    fireEvent.click(screen.getByRole("button", { name: "Remove filter" }));

    expect(setup.view.filters).toHaveLength(0);
  });
});

const dataParentColumnsRaw = [
  {
    id: "id",
    title: "ID",
    type: "Number",
    target: "tasks",
    visibility_defaults: { filter: true },
  },
  {
    id: "data",
    title: "Data",
    type: "List",
    target: "tasks",
    children: ["image"],
    hidden: true,
  },
  {
    id: "image",
    title: "image",
    type: "Image",
    target: "tasks",
    parent: "data",
    visibility_defaults: { filter: true },
  },
  {
    id: "total_annotations",
    title: "Annotations",
    type: "Number",
    target: "tasks",
    visibility_defaults: { filter: true },
  },
];

const createDataParentFilter = () => {
  const root = RootStore.create({ viewsStore: { columnsRaw: dataParentColumnsRaw } });
  root.viewsStore.fetchColumns();
  unprotect(root);
  root.viewsStore.views.push({
    id: 1,
    title: "Saved",
    saved: true,
    key: "saved",
    filters: [
      {
        filter: "filter:tasks:id",
        operator: "equal",
        value: 1,
      },
    ],
  });
  root.viewsStore.selected = 1;
  return { root, view: root.viewsStore.views[0], filter: root.viewsStore.views[0].filters[0] };
};

/**
 * Filter rows always use ColumnPicker with parent-hierarchy groups (FIT-2433).
 */
const UnifiedFilterLineHarness = observer(({ view }: { view: ReturnType<typeof createDataParentFilter>["view"] }) => {
  const { recentEntries } = useRecentFilters(1);
  return (
    <>
      {view.filters.map((filter, index) => (
        <FilterLine
          key={filter.id}
          filter={filter}
          pickerFilters={view.availableFilters}
          recentEntries={recentEntries}
          index={index}
          view={view}
        />
      ))}
    </>
  );
});

describe("filter column dropdown (FIT-2433)", () => {
  let root: ReturnType<typeof RootStore.create> | null = null;

  afterEach(() => {
    if (root) destroy(root);
    root = null;
  });

  it("uses ColumnPicker parent-hierarchy section headers (e.g. Data, not target-based Tasks)", () => {
    const setup = createDataParentFilter();
    root = setup.root;

    const expectedGroups = filtersToPickerGroups(setup.view.availableFilters as any)
      .map((group) => group.title)
      .filter(Boolean);

    expect(expectedGroups).toContain("Data");
    expect(expectedGroups).toContain("Task");

    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = mock();

    try {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      (window as any).DM = { apiCall: mock(async () => ({ count: 0, results: [] })) };

      render(
        <QueryClientProvider client={queryClient}>
          <UnifiedFilterLineHarness view={setup.view} />
        </QueryClientProvider>,
      );

      fireEvent.click(screen.getByTestId("select-trigger-col:filter:tasks:id"));

      expect(screen.getAllByText("Data").length).toBeGreaterThan(0);
      expect(screen.queryByText("Tasks")).not.toBeInTheDocument();
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
  });
});
