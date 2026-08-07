import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";
import { Provider } from "mobx-react";
import { types, unprotect } from "mobx-state-tree";
import { TabStore } from "../../stores/Tabs/store";
import { FieldsButton } from "./FieldsButton";

// cmdk scrolls the active item into view on mount; jsdom has no layout.
Element.prototype.scrollIntoView = mock();

const columnsRaw = [
  { id: "id", title: "ID", type: "Number", target: "tasks", visibility_defaults: { explore: true } },
  {
    id: "dimension_agreement_7",
    title: "Sentiment",
    type: "Number",
    target: "tasks",
    visibility_defaults: { explore: true },
  },
];

const DIMENSION_COLUMN_ID = "tasks:dimension_agreement_7";
const DIMENSION_OPTION = `select-option-col:${DIMENSION_COLUMN_ID}`;

const RootStore = types
  .model({
    viewsStore: types.optional(TabStore, {}),
    apiVersion: 2,
    isLabeling: false,
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
  .views((self) => ({
    get currentView() {
      return self.viewsStore.selected;
    },
  }))
  .actions(() => ({
    unsetSelection() {},
  }));

/** Fake backend echoing `data` back, mirroring data_manager.serializers.ViewSerializer. */
const createFakeServer = () => {
  const wire = (value) => JSON.parse(JSON.stringify(value));
  const state = { is_locked: false, data: { title: "Saved", hiddenColumns: { explore: [], labeling: [] } } };

  return mock(async (method, _params, payload) => {
    const body = wire(payload?.body ?? {});

    if (method === "updateTab") {
      if ("is_locked" in body) state.is_locked = body.is_locked;
      else if (body.data && !state.is_locked) state.data = body.data;
    }

    return wire({
      id: 1,
      title: state.data.title,
      is_locked: state.is_locked,
      locked_by: state.is_locked ? { name: "Ada Manager", email: "ada@example.com" } : null,
      data: state.data,
    });
  });
};

const renderColumnsPicker = () => {
  const root = RootStore.create({ viewsStore: { columnsRaw } });

  root.viewsStore.fetchColumns();
  unprotect(root);
  root.apiCall = createFakeServer();
  root.viewsStore.views.push({ id: 1, title: "Saved", saved: true, key: "saved" });
  root.viewsStore.selected = 1;

  render(
    <Provider store={root}>
      <FieldsButton title="Columns" data-testid="columns-picker" />
    </Provider>,
  );

  return { root, view: root.viewsStore.views[0] };
};

const trigger = () => screen.getByTestId("columns-picker");

const openPicker = async () => {
  fireEvent.click(trigger());
  await waitFor(() => expect(screen.queryByTestId(DIMENSION_OPTION)).not.toBeNull());
};

const closePicker = async () => {
  fireEvent.keyDown(document.body, { key: "Escape" });
  await waitFor(() => expect(screen.queryByTestId(DIMENSION_OPTION)).toBeNull());
};

/** `data-selected` is cmdk's active-item flag, so read the option's checkbox instead. */
const dimensionIsChecked = () =>
  within(screen.getByTestId(DIMENSION_OPTION)).getByRole("checkbox").getAttribute("aria-checked") === "true";

/** Locking disables the picker, which is what forces it to remount. */
const setLocked = async (view, locked) => {
  await act(async () => {
    await view.toggleLock();
  });
  await waitFor(() => expect(trigger().hasAttribute("disabled")).toBe(locked));
};

describe("FieldsButton (Columns picker)", () => {
  it("keeps a hidden column unchecked after the tab is locked and unlocked (FIT-2406)", async () => {
    const { view } = renderColumnsPicker();

    await openPicker();
    expect(dimensionIsChecked()).toBe(true);

    fireEvent.click(screen.getByTestId(DIMENSION_OPTION));
    await waitFor(() => expect(view.hiddenColumns.explore).toEqual([DIMENSION_COLUMN_ID]));
    expect(dimensionIsChecked()).toBe(false);
    await closePicker();

    await setLocked(view, true);
    await setLocked(view, false);

    await openPicker();
    expect(view.hiddenColumns.explore).toEqual([DIMENSION_COLUMN_ID]);
    expect(dimensionIsChecked()).toBe(false);
  });

  it("reflects visibility changes made outside the picker", async () => {
    const { view } = renderColumnsPicker();
    const dimension = view.targetColumns.find((column) => column.id === DIMENSION_COLUMN_ID);

    await act(async () => {
      view.toggleColumn(dimension);
    });
    await waitFor(() => expect(view.hiddenColumns.explore).toEqual([DIMENSION_COLUMN_ID]));

    await openPicker();
    expect(dimensionIsChecked()).toBe(false);
  });
});
