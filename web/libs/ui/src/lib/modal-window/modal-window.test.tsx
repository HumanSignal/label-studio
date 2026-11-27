import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useState } from "react";
import type { ComponentProps } from "react";
import { ModalWindow } from "./modal-window";
import { Button } from "../button/button";

function ControlledModal(
  props: Omit<ComponentProps<typeof ModalWindow>, "open" | "onOpenChange"> & {
    initiallyOpen?: boolean;
    /** Observes dismiss requests; Radix `DismissableLayer` only handles Escape for the topmost layer. */
    onOpenChangeSpy?: (open: boolean) => void;
  },
) {
  const { initiallyOpen, onOpenChangeSpy, ...rest } = props;
  const [open, setOpen] = useState(initiallyOpen ?? false);
  return (
    <>
      <Button onClick={() => setOpen(true)} data-testid="open-btn">
        Open
      </Button>
      <ModalWindow
        {...rest}
        open={open}
        onOpenChange={(next) => {
          onOpenChangeSpy?.(next);
          setOpen(next);
        }}
      />
    </>
  );
}

describe("ModalWindow", () => {
  it("renders dialog with accessible name when open", async () => {
    render(
      <ControlledModal title="Settings panel">
        <div>Body</div>
      </ControlledModal>,
    );

    fireEvent.click(screen.getByTestId("open-btn"));
    expect(await screen.findByRole("dialog", { name: "Settings panel" })).toBeInTheDocument();
    expect(screen.getByTestId("modal-window-body")).toHaveTextContent("Body");
  });

  it("closes on Escape", async () => {
    const onOpenChangeSpy = mock<(open: boolean) => void>();
    // `animate={false}` avoids Radix Presence waiting on exit keyframes in JSDOM.
    // Escape is only handled for the topmost `DismissableLayer` (shared default context);
    // under coverage / ordering, retry Escape until this modal's `onOpenChange(false)` runs.
    render(
      <ControlledModal title="Dismiss me" animate={false} onOpenChangeSpy={onOpenChangeSpy}>
        <div>Content</div>
      </ControlledModal>,
    );

    fireEvent.click(screen.getByTestId("open-btn"));
    await screen.findByRole("dialog");

    await waitFor(() => {
      const surface = screen.queryByRole("dialog");
      if (surface) {
        fireEvent.keyDown(surface, { key: "Escape", code: "Escape", bubbles: true, cancelable: true });
      }
      expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
    });

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape", code: "Escape", bubbles: true });
    });

    await waitFor(
      () => {
        expect(screen.queryByTestId("modal-window")).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("stays open on Escape when onEscapeKeyDown prevents it", async () => {
    const onOpenChange = mock<(open: boolean) => void>();
    const onEscapeKeyDown = mock((event: KeyboardEvent) => event.preventDefault());
    render(
      <ModalWindow open onOpenChange={onOpenChange} onEscapeKeyDown={onEscapeKeyDown} title="Keep me" animate={false}>
        <div>Content</div>
      </ModalWindow>,
    );

    fireEvent.keyDown(await screen.findByRole("dialog"), { key: "Escape", bubbles: true, cancelable: true });

    expect(onEscapeKeyDown).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole("dialog", { name: "Keep me" })).toBeInTheDocument();
  });

  it("closes when close button is activated", async () => {
    render(
      <ControlledModal title="Closable" animate={false}>
        <div>Inside</div>
      </ControlledModal>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("open-btn"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("modal-window-close-button"));
    });

    await waitFor(
      () => {
        expect(screen.queryByTestId("modal-window")).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("provides a screen-reader title when no visible title is passed", async () => {
    render(
      <ControlledModal showCloseButton={false}>
        <div>Only body</div>
      </ControlledModal>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("open-btn"));
    });

    expect(await screen.findByRole("dialog", { name: "Modal window" })).toBeInTheDocument();
  });

  it("renders without scrim when showScrim is false", async () => {
    render(
      <ControlledModal title="No overlay" showScrim={false}>
        <div>Content</div>
      </ControlledModal>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("open-btn"));
    });

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByTestId("modal-window-scrim")).not.toBeInTheDocument();
  });

  it("renders scrim when showScrim is true (default)", async () => {
    render(
      <ControlledModal title="With scrim">
        <div>Content</div>
      </ControlledModal>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("open-btn"));
    });

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("modal-window-scrim")).toBeInTheDocument();
  });

  it("renders when animate is false", async () => {
    render(
      <ControlledModal title="Static" animate={false}>
        <div>No motion</div>
      </ControlledModal>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("open-btn"));
    });

    expect(await screen.findByRole("dialog", { name: "Static" })).toBeInTheDocument();
  });

  it("applies default px-wide pb-wide padding to the body and merges bodyClassName", () => {
    const { rerender } = render(
      <ControlledModal title="Padded body" initiallyOpen>
        <div>Content</div>
      </ControlledModal>,
    );

    const bodyOpen = screen.getByTestId("modal-window-body");
    expect(bodyOpen).toHaveClass("px-wide");
    expect(bodyOpen).toHaveClass("pb-wide");

    rerender(
      <ControlledModal title="Extra body classes" bodyClassName="overscroll-contain" initiallyOpen>
        <div>Content</div>
      </ControlledModal>,
    );

    const body = screen.getByTestId("modal-window-body");
    expect(body).toHaveClass("overscroll-contain");
    expect(body).toHaveClass("px-wide");
    expect(body).toHaveClass("pb-wide");
  });

  it("applies size-specific max-width class to the panel surface", () => {
    const { rerender } = render(
      <ControlledModal title="Sized" size="small" initiallyOpen>
        <div>Body</div>
      </ControlledModal>,
    );

    expect(screen.getByTestId("modal-window")).toHaveClass("max-w-lg");

    rerender(
      <ControlledModal title="Sized" size="large" initiallyOpen>
        <div>Body</div>
      </ControlledModal>,
    );

    expect(screen.getByTestId("modal-window")).toHaveClass("max-w-4xl");

    rerender(
      <ControlledModal title="Sized" size="larger" initiallyOpen>
        <div>Body</div>
      </ControlledModal>,
    );

    expect(screen.getByTestId("modal-window")).toHaveClass("max-w-6xl");
  });

  it("sets data-placement and centered layout for placement center", async () => {
    render(
      <ControlledModal title="Confirm" placement="center" animate={false} initiallyOpen>
        <div>OK</div>
      </ControlledModal>,
    );

    const panel = screen.getByTestId("modal-window");
    expect(panel).toHaveAttribute("data-placement", "center");
    expect(panel).toHaveClass("top-1/2");
    expect(panel).toHaveClass("left-1/2");
    expect(panel).toHaveClass("-translate-x-1/2");
    expect(panel).toHaveClass("-translate-y-1/2");
  });

  it("defaults to the top placement on the panel", async () => {
    render(
      <ControlledModal title="Workflow" initiallyOpen>
        <div>Body</div>
      </ControlledModal>,
    );

    expect(screen.getByTestId("modal-window")).toHaveAttribute("data-placement", "top");
  });

  it("centers the panel with placement center", () => {
    render(
      <ModalWindow open title="Centered" placement="center">
        <div>Content</div>
      </ModalWindow>,
    );

    const panel = screen.getByTestId("modal-window");
    expect(panel).toHaveAttribute("data-placement", "center");
    expect(panel).toHaveClass("top-1/2");
  });
});

describe("ModalWindowCloseButton", () => {
  it("closes the dialog from a custom header", async () => {
    const { ModalWindowCloseButton } = await import("./modal-window");
    const onOpenChange = mock();
    render(
      <ModalWindow
        open
        onOpenChange={onOpenChange}
        title="Import learners"
        showCloseButton={false}
        header={
          <div>
            Import learners
            <ModalWindowCloseButton />
          </div>
        }
      >
        Body
      </ModalWindow>,
    );

    fireEvent.click(screen.getByTestId("modal-window-close-button"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("ModalWindow trapFocus", () => {
  const renderWithOutside = (props: Partial<ComponentProps<typeof ModalWindow>>) =>
    render(
      <>
        <button type="button" data-testid="behind">
          Behind
        </button>
        <ModalWindow open title="Trap" {...props}>
          <button type="button" data-testid="inside-first">
            First
          </button>
          <button type="button" data-testid="inside-last">
            Last
          </button>
        </ModalWindow>
      </>,
    );

  it("pulls focus that leaves the dialog back inside", async () => {
    renderWithOutside({ trapFocus: true, showCloseButton: false });
    screen.getByTestId("inside-first").focus();

    act(() => {
      screen.getByTestId("behind").focus();
    });

    await waitFor(() => expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true));
  });

  it("still wraps Tab from the last control to the first", () => {
    renderWithOutside({ trapFocus: true, showCloseButton: false });
    const last = screen.getByTestId("inside-last");
    last.focus();

    fireEvent.keyDown(last, { key: "Tab" });

    expect(document.activeElement).toBe(screen.getByTestId("inside-first"));
  });

  it("lets focus leave a dialog without trapFocus (dropdowns portaled outside keep working)", () => {
    renderWithOutside({ showCloseButton: false });
    screen.getByTestId("inside-first").focus();

    act(() => {
      screen.getByTestId("behind").focus();
    });

    expect(document.activeElement).toBe(screen.getByTestId("behind"));
  });
});
