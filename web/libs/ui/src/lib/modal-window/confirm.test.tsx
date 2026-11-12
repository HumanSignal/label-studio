import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createContext, type ReactNode, useContext } from "react";
import { confirm as legacyConfirm, info as legacyInfo } from "../modal/Modal";
import { confirm, info } from "./confirm";

const Flavor = createContext("none");
const FlavorProvider = ({ children }: { children?: ReactNode }) => (
  <Flavor.Provider value="provided">{children}</Flavor.Provider>
);
const FlavorReader = () => <span data-testid="flavor">{useContext(Flavor)}</span>;

const gone = () => waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

describe("confirm", () => {
  it("renders the title, body and actions, and confirms", async () => {
    const onOk = mock();
    const onHidden = mock();
    act(() => {
      confirm({ title: "Delete project?", body: "This cannot be undone.", okText: "Delete", onOk, onHidden });
    });

    expect(await screen.findByRole("dialog", { name: "Delete project?" })).toHaveTextContent("This cannot be undone.");
    fireEvent.click(screen.getByTestId("dialog-ok-button"));
    expect(onOk).toHaveBeenCalledTimes(1);
    await gone();
    await waitFor(() => expect(onHidden).toHaveBeenCalledTimes(1));
  });

  it("calls onCancel from the Cancel button", async () => {
    const onCancel = mock();
    act(() => {
      confirm({ title: "Leave?", onCancel });
    });
    fireEvent.click(await screen.findByTestId("dialog-cancel-button"));
    expect(onCancel).toHaveBeenCalledTimes(1);
    await gone();
  });

  it("treats the X button as Cancel when the feature allows dismissal", async () => {
    const onCancel = mock();
    const onOk = mock();
    act(() => {
      confirm({ title: "Leave?", onCancel, onOk, allowClose: true });
    });
    fireEvent.click(await screen.findByTestId("modal-window-close-button"));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onOk).not.toHaveBeenCalled();
    await gone();
  });

  it("is not dismissible unless the feature allows it", async () => {
    const onCancel = mock();
    const handle = confirm({ title: "Required", onCancel });
    const dialog = await screen.findByRole("dialog");
    expect(screen.queryByTestId("modal-window-close-button")).not.toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
    await act(() => handle.close());
  });

  it("maps the legacy destructive look to the negative variant", async () => {
    const handle = confirm({ title: "Delete?", buttonLook: "destructive" });
    expect(await screen.findByTestId("dialog-ok-button")).toHaveAttribute("data-variant", "negative");
    await act(() => handle.close());
  });

  it("reuses the open dialog for the same unique key", async () => {
    const first = confirm({ title: "Once", unique: "once" });
    const second = confirm({ title: "Twice", unique: "once" });
    expect(second).toBe(first);
    await screen.findByRole("dialog", { name: "Once" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    await act(() => first.close());
  });

  it("updates an open dialog and reports visibility", async () => {
    const handle = confirm({ title: "Before" });
    await screen.findByRole("dialog", { name: "Before" });
    act(() => handle.update({ title: "After" }));
    expect(await screen.findByRole("dialog", { name: "After" })).toBeInTheDocument();
    expect(handle.visible).toBe(true);
    const closing = handle.close();
    expect(handle.visible).toBe(false);
    await act(() => closing);
    await gone();
  });

  it("wraps the dialog in the providers it is given", async () => {
    const handle = confirm({
      title: "With providers",
      body: <FlavorReader />,
      providers: [<FlavorProvider key="f" />],
    });
    expect(await screen.findByTestId("flavor")).toHaveTextContent("provided");
    await act(() => handle.close());
  });

  it("shows footer status text left of the actions", async () => {
    const handle = confirm({ title: "Bulk delete", footerMeta: "12 tasks selected" });
    expect(await screen.findByTestId("modal-window-footer-meta")).toHaveTextContent("12 tasks selected");
    await act(() => handle.close());
  });
});

describe("info", () => {
  it("acknowledges with a single OK button", async () => {
    const onOkPress = mock();
    act(() => {
      info({ title: "Seats added", okText: "Got it", onOkPress });
    });
    await screen.findByRole("dialog", { name: "Seats added" });
    expect(screen.queryByTestId("dialog-cancel-button")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("dialog-ok-button"));
    expect(onOkPress).toHaveBeenCalledTimes(1);
    await gone();
  });
});

describe("legacy confirm", () => {
  it("opens the public dialog, keeps the test ids and injects providers only for non-simple calls", async () => {
    const onOk = mock();
    act(() => {
      legacyConfirm({
        title: "Legacy",
        body: () => <FlavorReader />,
        onOk,
        simple: false,
        providers: [<FlavorProvider key="f" />],
        style: { width: 480 },
      });
    });

    const dialog = await screen.findByRole("dialog", { name: "Legacy" });
    expect(dialog).toHaveAttribute("data-testid", "modal-window");
    expect(dialog.className).toContain("max-w-lg");
    expect(screen.getByTestId("flavor")).toHaveTextContent("provided");
    fireEvent.click(screen.getByTestId("dialog-ok-button"));
    expect(onOk).toHaveBeenCalledTimes(1);
    await gone();
  });

  it("keeps legacy confirmations blocking and legacy notices dismissible unless the call says otherwise", async () => {
    const blocking = legacyConfirm({ title: "Blocking" });
    await screen.findByRole("dialog", { name: "Blocking" });
    expect(screen.queryByTestId("modal-window-close-button")).not.toBeInTheDocument();
    await act(() => blocking.close());
    await gone();

    const chosen = legacyConfirm({ title: "Chosen", allowClose: true });
    await screen.findByRole("dialog", { name: "Chosen" });
    expect(screen.getByTestId("modal-window-close-button")).toBeInTheDocument();
    await act(() => chosen.close());
    await gone();

    const notice = legacyInfo({ title: "Notice" });
    await screen.findByRole("dialog", { name: "Notice" });
    expect(screen.getByTestId("modal-window-close-button")).toBeInTheDocument();
    await act(() => notice.close());
  });

  it("opens 600 px legacy confirmations at the medium width", async () => {
    const handle = legacyConfirm({ title: "Default width" });
    expect((await screen.findByRole("dialog")).className).toContain("max-w-2xl");
    await act(() => handle.close());
  });
});

describe("focus leaving a confirmation", () => {
  it("does not cancel it", async () => {
    const outside = document.createElement("button");
    outside.textContent = "Behind";
    document.body.prepend(outside);
    const onCancel = mock();
    const handle = confirm({ title: "Stay open", onCancel, allowClose: true });
    await screen.findByRole("dialog", { name: "Stay open" });

    act(() => outside.focus());
    fireEvent.focusIn(outside);

    expect(screen.getByRole("dialog", { name: "Stay open" })).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
    await act(() => handle.close());
    outside.remove();
  });
});
