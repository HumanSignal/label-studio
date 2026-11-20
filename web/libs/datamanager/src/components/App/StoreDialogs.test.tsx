import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { action, observable } from "mobx";
import * as ReactDomClient from "react-dom/client";
import { AppStore } from "../../stores/AppStore";
import { StoreDialogs, type StoreDialogsProps } from "./StoreDialogs";

/** The store's dialog state and actions, as AppStore has them, without the rest of the Data Manager. */
const createStore = () => {
  const store = observable(
    {
      pendingDialog: null as StoreDialogsProps["store"]["pendingDialog"],
      showConfirm(content: object) {
        store.pendingDialog = { kind: "confirm", content };
      },
      showNotice(content: object) {
        store.pendingDialog = { kind: "notice", content };
      },
      dismissDialog(dialog: unknown) {
        if (store.pendingDialog === dialog) store.pendingDialog = null;
      },
    },
    { showConfirm: action, showNotice: action, dismissDialog: action },
    { deep: false },
  );
  return store;
};

describe("StoreDialogs", () => {
  it("renders nothing until the store asks", () => {
    render(<StoreDialogs store={createStore()} />);

    expect(screen.queryByTestId("dialog-ok-button")).toBeNull();
  });

  it("shows the store's confirmation with its texts", async () => {
    const store = createStore();
    render(<StoreDialogs store={store} />);

    store.showConfirm({ title: "You're almost there!", children: "Set up labeling first", okText: "Go to setup" });

    expect(await screen.findByText("You're almost there!")).toBeInTheDocument();
    expect(screen.getByText("Set up labeling first")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-ok-button")).toHaveTextContent("Go to setup");
    expect(screen.getByTestId("dialog-cancel-button")).toHaveTextContent("Cancel");
  });

  it("runs the action and clears the dialog on confirm", async () => {
    const store = createStore();
    const onOk = mock();
    render(<StoreDialogs store={store} />);
    store.showConfirm({ title: "You have unsaved changes", onOk });

    fireEvent.click(await screen.findByTestId("dialog-ok-button"));

    expect(onOk).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(store.pendingDialog).toBeNull());
    await waitFor(() => expect(screen.queryByText("You have unsaved changes")).toBeNull());
  });

  it("clears the dialog without running the action on Cancel", async () => {
    const store = createStore();
    const onOk = mock();
    const onCancel = mock();
    render(<StoreDialogs store={store} />);
    store.showConfirm({ title: "You have unsaved changes", onOk, onCancel });

    fireEvent.click(await screen.findByTestId("dialog-cancel-button"));

    expect(onOk).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(store.pendingDialog).toBeNull());
  });

  it("does not let Escape dismiss a confirmation, as before", async () => {
    const store = createStore();
    const onOk = mock();
    render(<StoreDialogs store={store} />);
    store.showConfirm({ title: "You have unsaved changes", onOk });
    await screen.findByText("You have unsaved changes");

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(store.pendingDialog).not.toBeNull();
    expect(screen.getByText("You have unsaved changes")).toBeInTheDocument();
    expect(screen.queryByTestId("modal-window-close-button")).toBeNull();
    expect(onOk).not.toHaveBeenCalled();
  });

  it("keeps a confirmation that the confirm button queued", async () => {
    const store = createStore();
    render(<StoreDialogs store={store} />);
    store.showConfirm({ title: "First", onOk: () => store.showConfirm({ title: "Second" }) });

    fireEvent.click(await screen.findByTestId("dialog-ok-button"));

    expect(await screen.findByText("Second")).toBeInTheDocument();
    expect(store.pendingDialog?.content.title).toBe("Second");
  });

  it("shows a notice with one OK button, and clears it on OK", async () => {
    const store = createStore();
    render(<StoreDialogs store={store} />);

    store.showNotice({ title: "Can't find task", children: "Task #5 was not found!" });

    expect(await screen.findByText("Can't find task")).toBeInTheDocument();
    expect(screen.getByText("Task #5 was not found!")).toBeInTheDocument();
    expect(screen.queryByTestId("dialog-cancel-button")).toBeNull();
    fireEvent.click(screen.getByTestId("dialog-ok-button"));
    await waitFor(() => expect(store.pendingDialog).toBeNull());
  });

  for (const [name, dismiss] of [
    ["Escape", () => fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })],
    ["the close button", () => fireEvent.click(screen.getByTestId("modal-window-close-button"))],
  ] as const) {
    it(`lets ${name} dismiss a notice`, async () => {
      const store = createStore();
      render(<StoreDialogs store={store} />);
      store.showNotice({ title: "Can't find task", children: "Task #5 was not found!" });
      await screen.findByText("Can't find task");

      dismiss();

      await waitFor(() => expect(store.pendingDialog).toBeNull());
    });
  }

  it("opens no React root of its own", async () => {
    const createRoot = spyOn(ReactDomClient, "createRoot");
    try {
      const store = createStore();
      render(<StoreDialogs store={store} />);
      const before = createRoot.mock.calls.length;

      store.showConfirm({ title: "You have unsaved changes" });
      await screen.findByText("You have unsaved changes");
      store.showNotice({ title: "Can't find task" });
      await screen.findByText("Can't find task");

      expect(createRoot.mock.calls.length).toBe(before);
    } finally {
      createRoot.mockRestore();
    }
  });

  it("works against the real AppStore", async () => {
    const TestAppStore = AppStore.views(() => ({
      get labelingIsConfigured() {
        return false;
      },
    }));
    const store = TestAppStore.create({ toolbar: "" });
    const invoke = mock();
    (store as unknown as { _sdk: unknown })._sdk = { invoke, setMode: mock() };
    render(<StoreDialogs store={store as never} />);

    store.startLabelStream({ pushState: false });

    expect(await screen.findByText("You're almost there!")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("dialog-ok-button"));
    expect(invoke).toHaveBeenCalledWith("settingsClicked");
    await waitFor(() => expect(store.pendingDialog).toBeNull());
    await waitFor(() => expect(screen.queryByText("You're almost there!")).toBeNull());
  });
});
