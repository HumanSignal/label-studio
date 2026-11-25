import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useState } from "react";
import { ConfirmDialog } from "./confirm-dialog";
import { ModalWindow, type ModalWindowProps } from "./modal-window";

type Level = Partial<ModalWindowProps> & { id: string };

/** One modal per level; each has a button that opens the next and one that closes itself. */
function Stack({ levels, initiallyOpen = 0 }: { levels: Level[]; initiallyOpen?: number }) {
  const [open, setOpen] = useState(() => levels.map((_, index) => index < initiallyOpen));
  const set = (index: number, value: boolean) => setOpen((current) => current.map((o, i) => (i === index ? value : o)));

  return (
    <>
      <button type="button" data-testid="open-0" onClick={() => set(0, true)}>
        open
      </button>
      {levels.map(({ id, ...props }, index) => (
        <ModalWindow
          key={id}
          animate={false}
          title={id}
          dataTestId={id}
          // The levels are siblings here, so focus moving up a level would close the one below
          closeOnFocusOutside={false}
          {...props}
          open={open[index]}
          onOpenChange={(next) => set(index, next)}
        >
          <input data-testid={`${id}-input`} />
          <button type="button" data-testid={`${id}-next`} onClick={() => set(index + 1, true)}>
            next
          </button>
          <button type="button" data-testid={`${id}-close`} onClick={() => set(index, false)}>
            close
          </button>
        </ModalWindow>
      ))}
    </>
  );
}

const visibleScrims = () =>
  screen.queryAllByTestId("modal-window-scrim").filter((scrim) => scrim.style.visibility !== "hidden");

describe("ModalWindow stack", () => {
  it("shows a single modal as usual", () => {
    render(<Stack levels={[{ id: "editor" }]} initiallyOpen={1} />);

    expect(screen.getByTestId("editor")).toBeVisible();
    expect(screen.getByTestId("editor")).not.toHaveAttribute("data-covered");
    expect(visibleScrims()).toHaveLength(1);
  });

  it("hides the modal underneath while another is open on top", async () => {
    render(<Stack levels={[{ id: "editor" }, { id: "confirm" }]} initiallyOpen={1} />);

    fireEvent.click(screen.getByTestId("editor-next"));

    expect(await screen.findByTestId("confirm")).toBeVisible();
    expect(screen.getByTestId("editor")).not.toBeVisible();
    expect(screen.getByTestId("editor")).toHaveAttribute("data-covered", "true");
    expect(screen.getByTestId("confirm")).not.toHaveAttribute("data-covered");
  });

  it("brings the modal underneath back with its state when the top one closes", async () => {
    render(<Stack levels={[{ id: "editor" }, { id: "confirm" }]} initiallyOpen={1} />);
    const input = screen.getByTestId("editor-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "half written title" } });

    fireEvent.click(screen.getByTestId("editor-next"));
    await screen.findByTestId("confirm");
    fireEvent.click(screen.getByTestId("confirm-close"));

    await waitFor(() => expect(screen.queryByTestId("confirm")).toBeNull());
    expect(screen.getByTestId("editor")).toBeVisible();
    expect(screen.getByTestId("editor")).not.toHaveAttribute("data-covered");
    expect(screen.getByTestId("editor-input")).toBe(input);
    expect(input.value).toBe("half written title");
  });

  it("keeps one scrim for the whole stack", async () => {
    render(<Stack levels={[{ id: "editor" }, { id: "confirm" }]} initiallyOpen={1} />);
    const scrim = visibleScrims()[0];

    fireEvent.click(screen.getByTestId("editor-next"));
    await screen.findByTestId("confirm");

    expect(visibleScrims()).toHaveLength(1);
    expect(visibleScrims()[0] === scrim).toBe(true);

    fireEvent.click(screen.getByTestId("confirm-close"));
    await waitFor(() => expect(screen.queryByTestId("confirm")).toBeNull());

    expect(visibleScrims()).toHaveLength(1);
    expect(visibleScrims()[0] === scrim).toBe(true);
  });

  it("shows only the top of a deeper stack, and unwinds one at a time", async () => {
    render(<Stack levels={[{ id: "editor" }, { id: "confirm" }, { id: "step-up" }]} initiallyOpen={1} />);

    fireEvent.click(screen.getByTestId("editor-next"));
    fireEvent.click(await screen.findByTestId("confirm-next"));

    expect(await screen.findByTestId("step-up")).toBeVisible();
    expect(screen.getByTestId("confirm")).not.toBeVisible();
    expect(screen.getByTestId("editor")).not.toBeVisible();
    expect(visibleScrims()).toHaveLength(1);

    fireEvent.click(screen.getByTestId("step-up-close"));
    await waitFor(() => expect(screen.queryByTestId("step-up")).toBeNull());

    expect(screen.getByTestId("confirm")).toBeVisible();
    expect(screen.getByTestId("editor")).not.toBeVisible();

    fireEvent.click(screen.getByTestId("confirm-close"));
    await waitFor(() => expect(screen.queryByTestId("confirm")).toBeNull());

    expect(screen.getByTestId("editor")).toBeVisible();
  });

  it("closes only the top modal on Escape, and the one underneath returns", async () => {
    render(<Stack levels={[{ id: "editor" }, { id: "details" }]} initiallyOpen={1} />);
    fireEvent.click(screen.getByTestId("editor-next"));
    await screen.findByTestId("details");

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

    await waitFor(() => expect(screen.queryByTestId("details")).toBeNull());
    expect(screen.getByTestId("editor")).toBeVisible();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

    await waitFor(() => expect(screen.queryByTestId("editor")).toBeNull());
  });

  it("does not let Escape reach the hidden modal when the one on top cannot be dismissed", async () => {
    function Editor() {
      const [open, setOpen] = useState(true);
      const [confirming, setConfirming] = useState(true);
      return (
        <ModalWindow open={open} onOpenChange={setOpen} title="Edit section" animate={false} dataTestId="editor">
          <ConfirmDialog open={confirming} onOpenChange={setConfirming} title="Discard changes?">
            Your edits have not been saved.
          </ConfirmDialog>
        </ModalWindow>
      );
    }
    render(<Editor />);
    await screen.findByText("Discard changes?");

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.getByText("Discard changes?")).toBeVisible();
    expect(screen.getByTestId("editor")).toBeInTheDocument();
    expect(screen.getByTestId("editor")).not.toBeVisible();
  });

  it("does not close the covered modal when a sibling dialog opens over it and takes focus", async () => {
    // Root-rendered dialogs (step-up, API errors, pause) are not inside the modal they cover
    function App() {
      const [editing, setEditing] = useState(true);
      const [failed, setFailed] = useState(false);
      return (
        <>
          <ModalWindow open={editing} onOpenChange={setEditing} title="API token settings" dataTestId="settings">
            <input data-testid="settings-input" />
            <button type="button" data-testid="fail" onClick={() => setFailed(true)}>
              save
            </button>
          </ModalWindow>
          <ModalWindow open={failed} onOpenChange={setFailed} title="Runtime error" dataTestId="error">
            <button type="button" data-testid="error-body">
              details
            </button>
          </ModalWindow>
        </>
      );
    }
    render(<App />);
    fireEvent.change(screen.getByTestId("settings-input"), { target: { value: "draft" } });

    fireEvent.click(screen.getByTestId("fail"));
    const error = await screen.findByTestId("error");
    // What the browser does next: focus moves into the dialog on top, then the user clicks in it
    fireEvent.focusIn(screen.getByTestId("error-body"));
    fireEvent.pointerDown(screen.getByTestId("error-body"));
    fireEvent.click(screen.getByTestId("error-body"));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(error).toBeVisible();
    expect(screen.getByTestId("settings")).toBeInTheDocument();
    expect((screen.getByTestId("settings-input") as HTMLInputElement).value).toBe("draft");
  });

  it("keeps the top modal visible when the one underneath closes first", async () => {
    render(<Stack levels={[{ id: "editor" }, { id: "confirm" }]} initiallyOpen={1} />);
    fireEvent.click(screen.getByTestId("editor-next"));
    await screen.findByTestId("confirm");

    fireEvent.click(screen.getByTestId("editor-close"));

    await waitFor(() => expect(screen.queryByTestId("editor")).toBeNull());
    expect(screen.getByTestId("confirm")).toBeVisible();
    expect(screen.getByTestId("confirm")).not.toHaveAttribute("data-covered");
    expect(visibleScrims()).toHaveLength(1);
  });

  it("leaves a fullscreen workspace visible behind the dialog on top of it", async () => {
    render(<Stack levels={[{ id: "workspace", size: "fullscreen" }, { id: "confirm" }]} initiallyOpen={1} />);

    fireEvent.click(screen.getByTestId("workspace-next"));

    expect(await screen.findByTestId("confirm")).toBeVisible();
    expect(screen.getByTestId("workspace")).toBeVisible();
  });

  it("shows the page scrim when only the modal on top asks for one", async () => {
    render(<Stack levels={[{ id: "panel", showScrim: false }, { id: "confirm" }]} initiallyOpen={1} />);
    expect(visibleScrims()).toHaveLength(0);

    fireEvent.click(screen.getByTestId("panel-next"));
    await screen.findByTestId("confirm");

    expect(visibleScrims()).toHaveLength(1);
  });

  it("forgets a modal that unmounts while open", async () => {
    const first = render(<Stack levels={[{ id: "abandoned" }]} initiallyOpen={1} />);
    first.unmount();

    render(<Stack levels={[{ id: "editor" }]} initiallyOpen={1} />);

    expect(screen.getByTestId("editor")).toBeVisible();
    expect(screen.getByTestId("editor")).not.toHaveAttribute("data-covered");
    expect(visibleScrims()).toHaveLength(1);
  });

  it("covers the editor with a ConfirmDialog and returns to it on cancel", async () => {
    function Editor() {
      const [confirming, setConfirming] = useState(false);
      return (
        <ModalWindow open title="Edit section" animate={false} dataTestId="editor">
          <input data-testid="editor-input" />
          <button type="button" data-testid="ask" onClick={() => setConfirming(true)}>
            close
          </button>
          <ConfirmDialog open={confirming} onOpenChange={setConfirming} title="Discard changes?" okText="Discard">
            Your edits have not been saved.
          </ConfirmDialog>
        </ModalWindow>
      );
    }
    render(<Editor />);
    fireEvent.change(screen.getByTestId("editor-input"), { target: { value: "draft" } });

    fireEvent.click(screen.getByTestId("ask"));

    expect(await screen.findByText("Discard changes?")).toBeVisible();
    expect(screen.getByTestId("editor")).not.toBeVisible();

    fireEvent.click(screen.getByTestId("dialog-cancel-button"));

    await waitFor(() => expect(screen.getByTestId("editor")).toBeVisible());
    expect((screen.getByTestId("editor-input") as HTMLInputElement).value).toBe("draft");
  });
});
