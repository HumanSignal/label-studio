import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useState } from "react";
import { ContextMenu } from "./context-menu";
import { useContextMenu } from "./use-context-menu";

describe("useContextMenu", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  function HookHarness({
    onOpen,
    disabled,
    extraOnContextMenu,
    extraOnKeyDown,
  }: {
    onOpen?: (event: unknown, position: { x: number; y: number }) => void;
    disabled?: boolean;
    extraOnContextMenu?: (event: React.MouseEvent) => void;
    extraOnKeyDown?: (event: React.KeyboardEvent) => void;
  }) {
    const { getTriggerProps, menu, isOpen, position } = useContextMenu({
      disabled,
      onOpen,
      content: <div data-testid="menu-content">Menu Content</div>,
    });

    return (
      <div>
        <button
          type="button"
          data-testid="trigger"
          {...getTriggerProps({ onContextMenu: extraOnContextMenu, onKeyDown: extraOnKeyDown })}
        >
          Trigger
        </button>
        <span data-testid="open-state">{isOpen ? "open" : "closed"}</span>
        <span data-testid="position">{position ? `${position.x},${position.y}` : "none"}</span>
        {menu}
      </div>
    );
  }

  it("opens on contextmenu at cursor coordinates", async () => {
    const onOpen = mock();
    render(<HookHarness onOpen={onOpen} />);

    fireEvent.contextMenu(screen.getByTestId("trigger"), { clientX: 120, clientY: 240 });

    await waitFor(() => {
      expect(screen.getByTestId("open-state")).toHaveTextContent("open");
      expect(screen.getByTestId("position")).toHaveTextContent("120,240");
      expect(screen.getByTestId("menu-content")).toBeInTheDocument();
    });
    expect(onOpen).toHaveBeenCalled();
  });

  it("opens on Shift+F10 near the focused trigger rect", async () => {
    render(<HookHarness />);
    const trigger = screen.getByTestId("trigger");
    trigger.getBoundingClientRect = () =>
      ({
        left: 50,
        top: 80,
        right: 150,
        bottom: 120,
        width: 100,
        height: 40,
        x: 50,
        y: 80,
        toJSON: () => ({}),
      }) as DOMRect;

    trigger.focus();
    fireEvent.keyDown(trigger, { key: "F10", shiftKey: true });

    await waitFor(() => {
      expect(screen.getByTestId("open-state")).toHaveTextContent("open");
      expect(screen.getByTestId("position")).toHaveTextContent("50,120");
      expect(screen.getByTestId("menu-content")).toBeInTheDocument();
    });
  });

  it("opens on ContextMenu key only when trigger handles the event", async () => {
    render(<HookHarness />);
    const trigger = screen.getByTestId("trigger");
    trigger.getBoundingClientRect = () =>
      ({
        left: 10,
        top: 20,
        right: 30,
        bottom: 40,
        width: 20,
        height: 20,
        x: 10,
        y: 20,
        toJSON: () => ({}),
      }) as DOMRect;

    fireEvent.keyDown(trigger, { key: "ContextMenu" });

    await waitFor(() => {
      expect(screen.getByTestId("open-state")).toHaveTextContent("open");
      expect(screen.getByTestId("position")).toHaveTextContent("10,40");
    });
  });

  it("does not open on unrelated keydown (no document-level steal)", () => {
    render(<HookHarness />);
    fireEvent.keyDown(screen.getByTestId("trigger"), { key: "a" });
    fireEvent.keyDown(screen.getByTestId("trigger"), { key: "F10", shiftKey: false });
    fireEvent.keyDown(document, { key: "F10", shiftKey: true });

    expect(screen.getByTestId("open-state")).toHaveTextContent("closed");
    expect(screen.queryByTestId("menu-content")).not.toBeInTheDocument();
  });

  it("does not open when disabled", () => {
    render(<HookHarness disabled />);
    fireEvent.contextMenu(screen.getByTestId("trigger"), { clientX: 1, clientY: 2 });
    expect(screen.getByTestId("open-state")).toHaveTextContent("closed");
  });

  it("composes consumer handlers first and skips open when defaultPrevented", () => {
    const consumer = mock((event: React.MouseEvent) => {
      event.preventDefault();
    });
    render(<HookHarness extraOnContextMenu={consumer} />);

    fireEvent.contextMenu(screen.getByTestId("trigger"), { clientX: 9, clientY: 9 });

    expect(consumer).toHaveBeenCalled();
    expect(screen.getByTestId("open-state")).toHaveTextContent("closed");
  });

  it("closes on Escape while open", async () => {
    render(<HookHarness />);
    fireEvent.contextMenu(screen.getByTestId("trigger"), { clientX: 11, clientY: 22 });

    await waitFor(() => {
      expect(screen.getByTestId("open-state")).toHaveTextContent("open");
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.getByTestId("open-state")).toHaveTextContent("closed");
    });
  });
});

describe("ContextMenu wrapper", () => {
  it("merges trigger props onto a single child and opens the menu", async () => {
    const { container } = render(
      <ContextMenu content={<div data-testid="menu-content">Items</div>}>
        <button type="button" data-testid="child-trigger">
          Child
        </button>
      </ContextMenu>,
    );

    // No wrapper element introduced around the child — only the button
    // (menu portals to document.body when open).
    expect(container.querySelectorAll("[data-testid='child-trigger']")).toHaveLength(1);
    expect(screen.getByTestId("child-trigger").tagName).toBe("BUTTON");

    fireEvent.contextMenu(screen.getByTestId("child-trigger"), { clientX: 44, clientY: 55 });

    await waitFor(() => {
      expect(screen.getByTestId("menu-content")).toBeInTheDocument();
    });
  });

  it("preserves existing child onClick while opening on contextmenu", async () => {
    const onClick = mock();
    render(
      <ContextMenu content={<div data-testid="menu-content">Items</div>}>
        <button type="button" data-testid="child-trigger" onClick={onClick}>
          Child
        </button>
      </ContextMenu>,
    );

    fireEvent.click(screen.getByTestId("child-trigger"));
    expect(onClick).toHaveBeenCalled();
    expect(screen.queryByTestId("menu-content")).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getByTestId("child-trigger"), { clientX: 1, clientY: 2 });
    await waitFor(() => {
      expect(screen.getByTestId("menu-content")).toBeInTheDocument();
    });
  });
});

describe("controlled useContextMenu", () => {
  function ControlledHarness({ onOpenChange }: { onOpenChange?: (open: boolean) => void } = {}) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const { getTriggerProps, menu } = useContextMenu({
      open,
      position,
      onOpenChange: (next) => {
        onOpenChange?.(next);
        if (!next) {
          setOpen(false);
          setPosition(null);
          setActiveId(null);
        }
      },
      onOpen: (event, next) => {
        setOpen(true);
        setPosition(next);
        const id = (event.currentTarget as HTMLElement | null)?.dataset?.testid ?? null;
        setActiveId(id);
      },
      content: (
        <div data-testid="menu-content">
          Controlled {activeId} @ {position ? `${position.x},${position.y}` : "none"}
        </div>
      ),
    });

    return (
      <div>
        <button type="button" data-testid="a" {...getTriggerProps()}>
          A
        </button>
        <button type="button" data-testid="b" {...getTriggerProps()}>
          B
        </button>
        <span data-testid="position">{position ? `${position.x},${position.y}` : "none"}</span>
        <span data-testid="active-id">{activeId ?? "none"}</span>
        {menu}
      </div>
    );
  }

  async function flushOutsideListeners() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  it("supports multiple triggers with shared controlled state", async () => {
    render(<ControlledHarness />);

    fireEvent.contextMenu(screen.getByTestId("b"), { clientX: 77, clientY: 88 });

    await waitFor(() => {
      expect(screen.getByTestId("menu-content")).toBeInTheDocument();
    });
  });

  it("reopens on another trigger while open and prevents the browser default", async () => {
    render(<ControlledHarness />);

    fireEvent.contextMenu(screen.getByTestId("a"), { clientX: 10, clientY: 20 });
    await waitFor(() => {
      expect(screen.getByTestId("menu-content")).toBeInTheDocument();
      expect(screen.getByTestId("active-id")).toHaveTextContent("a");
      expect(screen.getByTestId("position")).toHaveTextContent("10,20");
    });

    await flushOutsideListeners();

    const secondEvent = fireEvent.contextMenu(screen.getByTestId("b"), { clientX: 90, clientY: 100 });

    expect(secondEvent).toBe(false);
    await waitFor(() => {
      expect(screen.getByTestId("menu-content")).toBeInTheDocument();
      expect(screen.getByTestId("active-id")).toHaveTextContent("b");
      expect(screen.getByTestId("position")).toHaveTextContent("90,100");
    });
  });

  it("moves the menu on re-right-click of the same trigger", async () => {
    render(<ControlledHarness />);

    fireEvent.contextMenu(screen.getByTestId("a"), { clientX: 11, clientY: 22 });
    await waitFor(() => {
      expect(screen.getByTestId("position")).toHaveTextContent("11,22");
    });

    await flushOutsideListeners();

    const moved = fireEvent.contextMenu(screen.getByTestId("a"), { clientX: 55, clientY: 66 });
    expect(moved).toBe(false);

    await waitFor(() => {
      expect(screen.getByTestId("menu-content")).toBeInTheDocument();
      expect(screen.getByTestId("active-id")).toHaveTextContent("a");
      expect(screen.getByTestId("position")).toHaveTextContent("55,66");
    });
  });
});

describe("useContextMenu trigger prop stability", () => {
  it("keeps getTriggerProps identity stable across open and close", async () => {
    const identities: Array<(extra?: Partial<{ onContextMenu: unknown; onKeyDown: unknown }>) => unknown> = [];

    function StabilityHarness() {
      const { getTriggerProps, menu, isOpen } = useContextMenu({
        // Intentionally unstable callbacks — must not invalidate getTriggerProps.
        onOpenChange: () => {},
        onOpen: () => {},
        onClose: () => {},
        content: <div data-testid="menu-content">Stable</div>,
      });
      identities.push(getTriggerProps);

      return (
        <div>
          <button type="button" data-testid="trigger" {...getTriggerProps()}>
            Trigger
          </button>
          <span data-testid="open-state">{isOpen ? "open" : "closed"}</span>
          {menu}
        </div>
      );
    }

    render(<StabilityHarness />);
    const initial = identities[identities.length - 1];

    fireEvent.contextMenu(screen.getByTestId("trigger"), { clientX: 1, clientY: 2 });
    await waitFor(() => {
      expect(screen.getByTestId("open-state")).toHaveTextContent("open");
    });
    expect(identities[identities.length - 1]).toBe(initial);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.getByTestId("open-state")).toHaveTextContent("closed");
    });
    expect(identities[identities.length - 1]).toBe(initial);
  });
});

describe("useContextMenu content identity", () => {
  it("keeps the same menu DOM node when content identity is stable across host re-renders", async () => {
    const stableContent = <div data-testid="menu-content">Stable content</div>;

    function Host({ tick }: { tick: number }) {
      const { triggerProps, menu } = useContextMenu({
        open: true,
        position: { x: 10, y: 20 },
        content: stableContent,
      });

      return (
        <div>
          <button type="button" data-testid="trigger" {...triggerProps}>
            tick {tick}
          </button>
          {menu}
        </div>
      );
    }

    const { rerender } = render(<Host tick={0} />);
    const firstNode = await screen.findByTestId("menu-content");

    rerender(<Host tick={1} />);
    expect(screen.getByTestId("menu-content")).toBe(firstNode);
  });
});

describe("useContextMenu animation", () => {
  it("runs Dropdown appear transition when opening", async () => {
    const transitionUtils = await import("@humansignal/core/lib/utils/transition");
    const aroundSpy = spyOn(transitionUtils, "aroundTransition").mockImplementation(
      mock(
        (
          _element: unknown,
          callbacks: {
            beforeTransition?: () => void;
            transition?: () => void;
            afterTransition?: () => void;
          },
        ) => {
          callbacks.beforeTransition?.();
          callbacks.transition?.();
          callbacks.afterTransition?.();
          return Promise.resolve();
        },
      ),
    );

    function Harness() {
      const { triggerProps, menu } = useContextMenu({
        content: <div data-testid="menu-content">Animated</div>,
      });

      return (
        <div>
          <button type="button" data-testid="trigger" {...triggerProps}>
            Trigger
          </button>
          {menu}
        </div>
      );
    }

    render(<Harness />);
    fireEvent.contextMenu(screen.getByTestId("trigger"), { clientX: 5, clientY: 6 });

    await waitFor(() => {
      expect(screen.getByTestId("menu-content")).toBeInTheDocument();
    });
    expect(aroundSpy).toHaveBeenCalled();
    aroundSpy.mockRestore();
  });
});
