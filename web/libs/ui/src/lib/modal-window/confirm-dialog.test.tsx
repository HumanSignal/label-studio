import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createContext, useContext, useState } from "react";
import { ConfirmDialog, type ConfirmDialogProps, InfoDialog } from "./confirm-dialog";

const gone = () => waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

function Owner(props: Partial<ConfirmDialogProps>) {
  const [open, setOpen] = useState(true);
  return (
    <ConfirmDialog title="Delete project?" open={open} onOpenChange={setOpen} {...props}>
      This cannot be undone.
    </ConfirmDialog>
  );
}

describe("ConfirmDialog", () => {
  it("renders the title, body and actions, and confirms", async () => {
    const onOk = mock();
    const onCancel = mock();
    render(<Owner okText="Delete" onOk={onOk} onCancel={onCancel} />);

    expect(await screen.findByRole("dialog", { name: "Delete project?" })).toHaveTextContent("This cannot be undone.");
    expect(screen.getByTestId("dialog-ok-button")).toHaveTextContent("Delete");
    fireEvent.click(screen.getByTestId("dialog-ok-button"));
    expect(onOk).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    await gone();
  });

  it("calls onCancel once from the Cancel button", async () => {
    const onCancel = mock();
    const onOk = mock();
    render(<Owner onOk={onOk} onCancel={onCancel} />);
    fireEvent.click(await screen.findByTestId("dialog-cancel-button"));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onOk).not.toHaveBeenCalled();
    await gone();
  });

  it("keeps the X off unless the feature allows dismissal", async () => {
    render(<Owner />);
    await screen.findByRole("dialog");
    expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
  });

  it("treats Escape as Cancel when dismissal is allowed", async () => {
    const onCancel = mock();
    render(<Owner allowClose onCancel={onCancel} />);
    fireEvent.keyDown(await screen.findByRole("dialog"), { key: "Escape" });
    await gone();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("waits for a promise from onOk, then closes", async () => {
    let resolve: () => void = () => {};
    const onOk = mock(() => new Promise<void>((r) => (resolve = r)));
    render(<Owner onOk={onOk} />);

    fireEvent.click(await screen.findByTestId("dialog-ok-button"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-cancel-button")).toBeDisabled();
    fireEvent.click(screen.getByTestId("dialog-ok-button"));
    expect(onOk).toHaveBeenCalledTimes(1);

    await act(async () => resolve());
    await gone();
  });

  it("stays open when the promise from onOk rejects", async () => {
    const onOk = mock(() => Promise.reject(new Error("failed")));
    render(<Owner onOk={onOk} />);

    const ok = await screen.findByTestId("dialog-ok-button");
    await act(async () => {
      fireEvent.click(ok);
      await Promise.resolve();
    });

    expect(onOk).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("dialog-cancel-button")).not.toBeDisabled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("uses the negative button for destructive actions", async () => {
    render(<Owner buttonLook="destructive" />);
    expect((await screen.findByTestId("dialog-ok-button")).className).toMatch(/negative/);
  });

  it("renders inside the owner's tree, so app context reaches the body", async () => {
    const Flavor = createContext("none");
    const Reader = () => <span data-testid="flavor">{useContext(Flavor)}</span>;
    render(
      <Flavor.Provider value="provided">
        <ConfirmDialog open title="Context">
          <Reader />
        </ConfirmDialog>
      </Flavor.Provider>,
    );
    expect(await screen.findByTestId("flavor")).toHaveTextContent("provided");
  });

  it("keeps its content while closing when the owner clears its state", async () => {
    function Clearing() {
      const [target, setTarget] = useState<string | null>("Alpha");
      return (
        <ConfirmDialog open={target !== null} onOpenChange={() => setTarget(null)} title={`Delete ${target}?`}>
          {target}
        </ConfirmDialog>
      );
    }
    render(<Clearing />);
    fireEvent.click(await screen.findByTestId("dialog-ok-button"));
    const dialog = screen.queryByRole("dialog");
    if (dialog) expect(dialog).toHaveTextContent("Delete Alpha?");
    await gone();
  });

  it("keeps its buttons, size and close controls while fading out after the owner clears its state", async () => {
    // jsdom runs no animations; report one so the closing dialog stays mounted as it does in a browser.
    const realStyle = globalThis.getComputedStyle;
    const fakeStyle = ((el: Element) => {
      const style = realStyle(el);
      return new Proxy(style, {
        get: (target, key) =>
          key === "animationName"
            ? el.getAttribute("data-state") === "closed"
              ? "exit"
              : "enter"
            : Reflect.get(target, key),
      });
    }) as typeof globalThis.getComputedStyle;
    globalThis.getComputedStyle = fakeStyle;
    window.getComputedStyle = fakeStyle;
    try {
      function Pending() {
        const [pending, setPending] = useState<Partial<ConfirmDialogProps> | null>({
          title: "Delete member?",
          okText: "Delete Member",
          cancelText: "Keep",
          buttonLook: "negative",
          size: "small",
          dataTestId: "delete-member-dialog",
        });
        return (
          <ConfirmDialog {...pending} open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
            Gone for good.
          </ConfirmDialog>
        );
      }
      render(<Pending />);
      fireEvent.click(await screen.findByTestId("dialog-ok-button"));

      const closing = screen.getByTestId("delete-member-dialog");
      expect(closing).toHaveAttribute("data-state", "closed");
      expect(screen.getByTestId("dialog-ok-button")).toHaveTextContent("Delete Member");
      expect(screen.getByTestId("dialog-ok-button").className).toMatch(/negative/);
      expect(screen.getByTestId("dialog-cancel-button")).toHaveTextContent("Keep");
    } finally {
      globalThis.getComputedStyle = realStyle;
      window.getComputedStyle = realStyle;
    }
  });
});

describe("InfoDialog", () => {
  it("shows a single OK button that closes the dialog", async () => {
    const onOk = mock();
    function InfoOwner() {
      const [open, setOpen] = useState(true);
      return (
        <InfoDialog title="Saved" open={open} onOpenChange={setOpen} onOk={onOk}>
          Your changes are live.
        </InfoDialog>
      );
    }
    render(<InfoOwner />);

    expect(await screen.findByRole("dialog", { name: "Saved" })).toHaveTextContent("Your changes are live.");
    expect(screen.queryByTestId("dialog-cancel-button")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("dialog-ok-button"));
    expect(onOk).toHaveBeenCalledTimes(1);
    await gone();
  });
});

describe("ConfirmDialog and InfoDialog keep keyboard focus", () => {
  for (const [name, Component] of [
    ["ConfirmDialog", ConfirmDialog],
    ["InfoDialog", InfoDialog],
  ] as const) {
    it(`${name} pulls focus that leaves it back inside`, async () => {
      render(
        <>
          <button type="button" data-testid="behind">
            Behind
          </button>
          <Component open onOpenChange={() => {}} title="Heads up">
            Body
          </Component>
        </>,
      );
      screen.getByTestId("dialog-ok-button").focus();

      act(() => {
        screen.getByTestId("behind").focus();
      });

      await waitFor(() => expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true));
    });
  }
});
