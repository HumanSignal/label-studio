import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useState } from "react";
import type { ComponentProps } from "react";
import { Dialog, ModalWindow } from "./modal-window";
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

  it("sets data-variant and centered layout for variant dialog", async () => {
    render(
      <ControlledModal title="Confirm" variant="dialog" animate={false} initiallyOpen>
        <div>OK</div>
      </ControlledModal>,
    );

    const panel = screen.getByTestId("modal-window");
    expect(panel).toHaveAttribute("data-variant", "dialog");
    expect(panel).toHaveClass("top-1/2");
    expect(panel).toHaveClass("left-1/2");
    expect(panel).toHaveClass("-translate-x-1/2");
    expect(panel).toHaveClass("-translate-y-1/2");
  });

  it("defaults to workflow variant on the panel", async () => {
    render(
      <ControlledModal title="Workflow" initiallyOpen>
        <div>Body</div>
      </ControlledModal>,
    );

    expect(screen.getByTestId("modal-window")).toHaveAttribute("data-variant", "workflow");
  });

  it("renders Dialog export as centered dialog variant", async () => {
    function ControlledDialog(
      props: Omit<ComponentProps<typeof Dialog>, "open" | "onOpenChange"> & { initiallyOpen?: boolean },
    ) {
      const { initiallyOpen, ...rest } = props;
      const [open, setOpen] = useState(initiallyOpen ?? false);
      return (
        <>
          <Button onClick={() => setOpen(true)} data-testid="open-dialog-btn">
            Open
          </Button>
          <Dialog {...rest} open={open} onOpenChange={setOpen} />
        </>
      );
    }

    render(
      <ControlledDialog title="Dialog export" initiallyOpen>
        <div>Content</div>
      </ControlledDialog>,
    );

    const panel = screen.getByTestId("modal-window");
    expect(panel).toHaveAttribute("data-variant", "dialog");
    expect(panel).toHaveClass("top-1/2");
  });
});
