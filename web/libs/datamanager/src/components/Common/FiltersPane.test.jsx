import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";
import { Provider } from "mobx-react";
import { types, unprotect } from "mobx-state-tree";
import { TabStore } from "../../stores/Tabs/store";
import { FiltersPane } from "./FiltersPane";

Element.prototype.scrollIntoView = mock();

const columnsRaw = [
  {
    id: "id",
    title: "ID",
    type: "Number",
    target: "tasks",
    visibility_defaults: { explore: true, filter: true },
  },
];

const RootStore = types
  .model({
    viewsStore: types.optional(TabStore, {}),
    apiVersion: 2,
    isLabeling: false,
    project: types.optional(types.model({ id: types.number }), { id: 1 }),
    SDK: types.optional(types.frozen(), {
      hasInterface: () => false,
      invoke: () => {},
      projectId: 1,
      tabControls: { lock: true },
    }),
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

const createFakeServer = () => {
  const wire = (value) => JSON.parse(JSON.stringify(value));
  const state = { is_locked: false, data: { title: "Saved" } };

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

const renderFiltersPane = () => {
  const toastInvoke = mock();
  const root = RootStore.create({
    viewsStore: { columnsRaw },
    SDK: {
      hasInterface: () => false,
      invoke: toastInvoke,
      projectId: 1,
      tabControls: { lock: true },
    },
  });

  root.viewsStore.fetchColumns();
  unprotect(root);
  root.apiCall = createFakeServer();
  root.viewsStore.views.push({ id: 1, title: "Saved", saved: true, key: "saved" });
  root.viewsStore.selected = 1;

  render(
    <Provider store={root}>
      <FiltersPane />
    </Provider>,
  );

  return { root, view: root.viewsStore.views[0], toastInvoke };
};

describe("FiltersPane locked tab (FIT-2396)", () => {
  it("keeps Filters openable and shows a warning banner when locked", async () => {
    const { view, toastInvoke } = renderFiltersPane();

    await act(async () => {
      view.createFilter();
      await view.toggleLock();
    });
    await waitFor(() => expect(view.isLockedByManager).toBe(true));
    toastInvoke.mockClear();

    const trigger = screen.getByTestId("dm-filters-button");
    expect(trigger).not.toBeDisabled();

    fireEvent.click(trigger);
    expect(await screen.findByTestId("filters-locked-message")).toHaveTextContent(
      "This tab is locked. Unlock it to change filters.",
    );
    expect(screen.getByRole("button", { name: /Add Another Filter/i })).toBeDisabled();
    expect(toastInvoke).not.toHaveBeenCalled();
  });
});
