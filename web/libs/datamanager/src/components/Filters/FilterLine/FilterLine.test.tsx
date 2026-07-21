import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { destroy, types, unprotect } from "mobx-state-tree";
import { afterEach, describe, expect, it, mock } from "bun:test";
import { observer } from "mobx-react";
import { TabStore } from "../../../stores/Tabs/store";
import { FilterLine, UnavailableFilterNotice, isFilterEditingDisabled } from "./FilterLine";

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

const FilterLineHarness = observer(
  ({ view, sidebar }: { view: ReturnType<typeof createUnavailableFilter>["view"]; sidebar: boolean }) => (
    <>
      {view.filters.map((filter, index) => (
        <FilterLine
          key={filter.id}
          filter={filter}
          availableFilters={[]}
          pickerFilters={view.availableFilters}
          index={index}
          view={view}
          sidebar={sidebar}
        />
      ))}
    </>
  ),
);

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
      render(<FilterLineHarness view={setup.view} sidebar={false} />);

      expect(within(screen.getByTestId("filter-line-operator")).getByRole("button")).toHaveTextContent(label);
    });
  }
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

  for (const sidebar of [false, true]) {
    it(`identifies, disables, preserves, and removes an unavailable filter in the ${
      sidebar ? "sidebar" : "main"
    } layout`, async () => {
      const setup = createUnavailableFilter();
      root = setup.root;
      render(<FilterLineHarness view={setup.view} sidebar={sidebar} />);

      expect(screen.getByText("Sentiment")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("saved value is preserved");
      expect(within(screen.getByTestId("filter-line-operator")).getByRole("button")).toBeDisabled();
      expect(within(screen.getByTestId("filter-line-value")).getByRole("button")).toBeDisabled();
      expect(setup.filter.currentValue).toEqual(["positive"]);
      await waitFor(() => expect(setup.filter.saving).toBe(false));

      fireEvent.click(screen.getByRole("button", { name: "Remove filter" }));

      expect(setup.view.filters).toHaveLength(0);
    });
  }
});
