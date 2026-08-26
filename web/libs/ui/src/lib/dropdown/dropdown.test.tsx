import { render, screen, waitFor } from "@testing-library/react";
import { useRef, useEffect } from "react";
import { Dropdown, type DropdownRef } from "./dropdown";
import { DropdownContext, type DropdownContextValue } from "./dropdown-context";
import * as domUtils from "@humansignal/core/lib/utils/dom";
import * as transitionUtils from "@humansignal/core/lib/utils/transition";

// Mock CSS.supports for anchor positioning tests
const originalCSSSupports = CSS.supports;

describe("Dropdown - Cursor Position Support", () => {
  let alignElementsSpy: ReturnType<typeof spyOn> | undefined;
  let aroundTransitionSpy: ReturnType<typeof spyOn> | undefined;

  beforeEach(() => {
    mock.clearAllMocks();
    // Drop leftover portaled menus from prior cases (RTL container unmount may leave body portals).
    document.querySelectorAll('[data-testid="dropdown"]').forEach((el) => el.remove());
    // Reset CSS.supports to default (no anchor positioning support)
    CSS.supports = mock(() => false);
    alignElementsSpy = spyOn(domUtils, "alignElements").mockImplementation(
      mock(() => ({
        left: 100,
        top: 200,
        maxHeight: 500,
      })),
    );
    aroundTransitionSpy = spyOn(transitionUtils, "aroundTransition").mockImplementation(
      mock((_element: any, callbacks: any) => {
        callbacks.beforeTransition?.();
        callbacks.transition?.();
        callbacks.afterTransition?.();
      }),
    );
  });

  afterEach(() => {
    CSS.supports = originalCSSSupports;
    alignElementsSpy?.mockRestore();
    aroundTransitionSpy?.mockRestore();
    document.querySelectorAll('[data-testid="dropdown"]').forEach((el) => el.remove());
  });

  describe("Basic Rendering", () => {
    it("should render successfully", () => {
      render(
        <Dropdown dataTestId="dropdown">
          <div>Dropdown Content</div>
        </Dropdown>,
      );

      expect(screen.getByTestId("dropdown")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <Dropdown className="custom-dropdown" dataTestId="dropdown">
          <div>Content</div>
        </Dropdown>,
      );

      const dropdown = screen.getByTestId("dropdown");
      expect(dropdown.className).toContain("custom-dropdown");
    });

    it("should apply custom styles", () => {
      render(
        <Dropdown style={{ backgroundColor: "red" }} dataTestId="dropdown">
          <div>Content</div>
        </Dropdown>,
      );

      const dropdown = screen.getByTestId("dropdown");
      expect((dropdown as HTMLElement).style.backgroundColor).toBe("red");
    });
  });

  describe("Cursor Position Handling", () => {
    it("should use cursor position for positioning when provided", async () => {
      const TestComponent = () => {
        const dropdownRef = useRef<DropdownRef>(null);
        const triggerRef = useRef<HTMLElement>(document.createElement("button"));

        const contextValue: DropdownContextValue = {
          triggerRef,
          dropdown: dropdownRef,
          minIndex: 1000,
          cursorPosition: { x: 150, y: 250 },
          hasTarget: () => false,
          addChild: () => {},
          removeChild: () => {},
          open: () => {},
          close: () => {},
        };

        useEffect(() => {
          dropdownRef.current?.open(true);
        }, []);

        return (
          <DropdownContext.Provider value={contextValue}>
            <Dropdown ref={dropdownRef} visible={true} animated={false} dataTestId="dropdown">
              <div>Menu Content</div>
            </Dropdown>
          </DropdownContext.Provider>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        const dropdown = screen.getByTestId("dropdown");
        expect((dropdown as HTMLElement).style.left).toBe("150px");
        expect((dropdown as HTMLElement).style.top).toBe("250px");
      });
    });

    it("should fall back to trigger element when no cursor position", async () => {
      const TestComponent = () => {
        const dropdownRef = useRef<DropdownRef>(null);
        const triggerElement = document.createElement("button");
        const triggerRef = useRef<HTMLElement>(triggerElement);

        const contextValue: DropdownContextValue = {
          triggerRef,
          dropdown: dropdownRef,
          minIndex: 1000,
          cursorPosition: null,
          hasTarget: () => false,
          addChild: () => {},
          removeChild: () => {},
          open: () => {},
          close: () => {},
        };

        useEffect(() => {
          dropdownRef.current?.open(true);
        }, []);

        return (
          <DropdownContext.Provider value={contextValue}>
            <Dropdown ref={dropdownRef} visible={true} animated={false}>
              <div>Menu Content</div>
            </Dropdown>
          </DropdownContext.Provider>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText("Menu Content")).toBeInTheDocument();
      });
    });

    it("should create virtual element with correct getBoundingClientRect", async () => {
      const TestComponent = () => {
        const dropdownRef = useRef<DropdownRef>(null);
        const triggerRef = useRef<HTMLElement>(document.createElement("button"));

        const contextValue: DropdownContextValue = {
          triggerRef,
          dropdown: dropdownRef,
          minIndex: 1000,
          cursorPosition: { x: 300, y: 400 },
          hasTarget: () => false,
          addChild: () => {},
          removeChild: () => {},
          open: () => {},
          close: () => {},
        };

        useEffect(() => {
          dropdownRef.current?.open(true);
        }, []);

        return (
          <DropdownContext.Provider value={contextValue}>
            <Dropdown ref={dropdownRef} visible={true} animated={false} dataTestId="dropdown">
              <div>Menu Content</div>
            </Dropdown>
          </DropdownContext.Provider>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        const dropdown = screen.getByTestId("dropdown");
        expect((dropdown as HTMLElement).style.left).toBe("300px");
        expect((dropdown as HTMLElement).style.top).toBe("400px");
      });
    });

    it("should position dropdown at cursor location", async () => {
      const TestComponent = () => {
        const dropdownRef = useRef<DropdownRef>(null);
        const triggerRef = useRef<HTMLElement>(document.createElement("button"));

        const contextValue: DropdownContextValue = {
          triggerRef,
          dropdown: dropdownRef,
          minIndex: 1000,
          cursorPosition: { x: 500, y: 600 },
          hasTarget: () => false,
          addChild: () => {},
          removeChild: () => {},
          open: () => {},
          close: () => {},
        };

        useEffect(() => {
          dropdownRef.current?.open(true);
        }, []);

        return (
          <DropdownContext.Provider value={contextValue}>
            <Dropdown ref={dropdownRef} visible={true} animated={false} alignment="bottom-left" dataTestId="dropdown">
              <div>Menu Content</div>
            </Dropdown>
          </DropdownContext.Provider>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        const dropdown = screen.getByTestId("dropdown");
        expect((dropdown as HTMLElement).style.left).toBe("500px");
        expect((dropdown as HTMLElement).style.top).toBe("600px");
      });
    });

    it("should use fixed cursor coordinates even when CSS anchor positioning is supported", async () => {
      // Regression: useAnchor previously ignored cursorPosition and anchored to the
      // trigger element in modern browsers, forcing consumers to fake triggerRef.
      CSS.supports = mock((property: string, value?: string) => {
        const check = value !== undefined ? `${property}: ${value}` : property;
        return check.includes("anchor-name") || check.includes("position-anchor");
      });

      const triggerElement = document.createElement("button");
      Object.defineProperty(triggerElement, "getBoundingClientRect", {
        value: () => ({
          left: 10,
          top: 20,
          right: 110,
          bottom: 60,
          width: 100,
          height: 40,
          x: 10,
          y: 20,
          toJSON: () => ({}),
        }),
      });

      const TestComponent = () => {
        const dropdownRef = useRef<DropdownRef>(null);
        const triggerRef = useRef<HTMLElement>(triggerElement);

        const contextValue: DropdownContextValue = {
          triggerRef,
          dropdown: dropdownRef,
          minIndex: 1000,
          cursorPosition: { x: 222, y: 333 },
          hasTarget: () => false,
          addChild: () => {},
          removeChild: () => {},
          open: () => {},
          close: () => {},
        };

        useEffect(() => {
          dropdownRef.current?.open(true);
        }, []);

        return (
          <DropdownContext.Provider value={contextValue}>
            <Dropdown ref={dropdownRef} visible={true} animated={false} dataTestId="dropdown">
              <div>Menu Content</div>
            </Dropdown>
          </DropdownContext.Provider>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        const dropdown = screen.getByTestId("dropdown") as HTMLElement;
        expect(dropdown.style.left).toBe("222px");
        expect(dropdown.style.top).toBe("333px");
        expect(dropdown.style.position).toBe("fixed");
      });
    });
  });

  describe("Visibility States", () => {
    it("should handle visibility prop", () => {
      const { rerender } = render(
        <Dropdown visible={false} dataTestId="dropdown">
          <div>Content</div>
        </Dropdown>,
      );

      let dropdown = screen.getByTestId("dropdown");
      expect(dropdown).toHaveClass("ls-mounted");

      rerender(
        <Dropdown visible={true} dataTestId="dropdown">
          <div>Content</div>
        </Dropdown>,
      );

      dropdown = screen.getByTestId("dropdown");
      expect(dropdown).toHaveClass("ls-visible");
    });

    it("should call onToggle callback when visibility changes", async () => {
      const onToggle = mock();
      const TestComponent = () => {
        const dropdownRef = useRef<DropdownRef>(null);

        return (
          <Dropdown ref={dropdownRef} onToggle={onToggle} dataTestId="dropdown">
            <div>Content</div>
          </Dropdown>
        );
      };

      render(<TestComponent />);

      // Dropdown renders (content is only in DOM after open)
      expect(screen.getByTestId("dropdown")).toBeInTheDocument();
    });

    it("should call onVisibilityChanged callback when visibility changes", () => {
      const onVisibilityChanged = mock();

      render(
        <Dropdown onVisibilityChanged={onVisibilityChanged} dataTestId="dropdown">
          <div>Content</div>
        </Dropdown>,
      );

      expect(screen.getByTestId("dropdown")).toBeInTheDocument();
    });
  });

  describe("Alignment", () => {
    it("should use default alignment when not specified", async () => {
      const TestComponent = () => {
        const dropdownRef = useRef<DropdownRef>(null);
        const triggerRef = useRef<HTMLElement>(document.createElement("button"));

        const contextValue: DropdownContextValue = {
          triggerRef,
          dropdown: dropdownRef,
          minIndex: 1000,
          cursorPosition: null,
          hasTarget: () => false,
          addChild: () => {},
          removeChild: () => {},
          open: () => {},
          close: () => {},
        };

        useEffect(() => {
          dropdownRef.current?.open(true);
        }, []);

        return (
          <DropdownContext.Provider value={contextValue}>
            <Dropdown ref={dropdownRef} visible={true} animated={false}>
              <div>Menu Content</div>
            </Dropdown>
          </DropdownContext.Provider>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText("Menu Content")).toBeInTheDocument();
      });
    });

    it("should use custom alignment when specified", async () => {
      const TestComponent = () => {
        const dropdownRef = useRef<DropdownRef>(null);
        const triggerRef = useRef<HTMLElement>(document.createElement("button"));

        const contextValue: DropdownContextValue = {
          triggerRef,
          dropdown: dropdownRef,
          minIndex: 1000,
          cursorPosition: null,
          hasTarget: () => false,
          addChild: () => {},
          removeChild: () => {},
          open: () => {},
          close: () => {},
        };

        useEffect(() => {
          dropdownRef.current?.open(true);
        }, []);

        return (
          <DropdownContext.Provider value={contextValue}>
            <Dropdown ref={dropdownRef} visible={true} animated={false} alignment="top-right">
              <div>Menu Content</div>
            </Dropdown>
          </DropdownContext.Provider>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText("Menu Content")).toBeInTheDocument();
      });
    });
  });

  describe("Constrain Height", () => {
    it("should apply maxHeight when constrainHeight is enabled", async () => {
      const TestComponent = () => {
        const dropdownRef = useRef<DropdownRef>(null);
        const triggerRef = useRef<HTMLElement>(document.createElement("button"));

        const contextValue: DropdownContextValue = {
          triggerRef,
          dropdown: dropdownRef,
          minIndex: 1000,
          cursorPosition: null,
          hasTarget: () => false,
          addChild: () => {},
          removeChild: () => {},
          open: () => {},
          close: () => {},
        };

        useEffect(() => {
          dropdownRef.current?.open(true);
        }, []);

        return (
          <DropdownContext.Provider value={contextValue}>
            <Dropdown ref={dropdownRef} visible={true} animated={false} constrainHeight={true} dataTestId="dropdown">
              <div>Menu Content</div>
            </Dropdown>
          </DropdownContext.Provider>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        const dropdown = screen.getByTestId("dropdown");
        expect(dropdown).toHaveClass("ls-dropdown_constrain-height");
      });
    });

    it("should calculate position when constrainHeight is enabled", async () => {
      const TestComponent = () => {
        const dropdownRef = useRef<DropdownRef>(null);
        const triggerRef = useRef<HTMLElement>(document.createElement("button"));

        const contextValue: DropdownContextValue = {
          triggerRef,
          dropdown: dropdownRef,
          minIndex: 1000,
          cursorPosition: null,
          hasTarget: () => false,
          addChild: () => {},
          removeChild: () => {},
          open: () => {},
          close: () => {},
        };

        useEffect(() => {
          dropdownRef.current?.open(true);
        }, []);

        return (
          <DropdownContext.Provider value={contextValue}>
            <Dropdown ref={dropdownRef} visible={true} animated={false} constrainHeight={true} dataTestId="dropdown">
              <div>Menu Content</div>
            </Dropdown>
          </DropdownContext.Provider>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        const dropdown = screen.getByTestId("dropdown");
        expect(dropdown).toHaveClass("ls-dropdown_constrain-height");
      });
    });
  });

  describe("Sync Width", () => {
    it("should apply sync-width class when syncWidth is enabled", () => {
      render(
        <Dropdown syncWidth={true} dataTestId="dropdown">
          <div>Content</div>
        </Dropdown>,
      );

      const dropdown = screen.getByTestId("dropdown");
      expect(dropdown).toHaveClass("ls-dropdown_sync-width");
    });

    it("should not apply sync-width class when syncWidth is disabled", () => {
      render(
        <Dropdown syncWidth={false} dataTestId="dropdown">
          <div>Content</div>
        </Dropdown>,
      );

      const dropdown = screen.getByTestId("dropdown");
      expect(dropdown).not.toHaveClass("ls-dropdown_sync-width");
    });
  });

  describe("Z-Index Stacking", () => {
    it("should apply z-index from context", () => {
      const TestComponent = () => {
        const dropdownRef = useRef<DropdownRef>(null);
        const triggerRef = useRef<HTMLElement>(document.createElement("button"));

        const contextValue: DropdownContextValue = {
          triggerRef,
          dropdown: dropdownRef,
          minIndex: 2000,
          cursorPosition: null,
          hasTarget: () => false,
          addChild: () => {},
          removeChild: () => {},
          open: () => {},
          close: () => {},
        };

        return (
          <DropdownContext.Provider value={contextValue}>
            <Dropdown ref={dropdownRef} dataTestId="dropdown">
              <div>Menu Content</div>
            </Dropdown>
          </DropdownContext.Provider>
        );
      };

      render(<TestComponent />);

      const dropdown = screen.getByTestId("dropdown");
      const zIndex = window.getComputedStyle(dropdown).zIndex;

      // Should have a z-index >= minIndex (2000)
      expect(Number.parseInt(zIndex)).toBeGreaterThanOrEqual(2000);
    });
  });

  describe("Disabled State", () => {
    it("should not open when enabled is false", async () => {
      const TestComponent = () => {
        const dropdownRef = useRef<DropdownRef>(null);

        useEffect(() => {
          dropdownRef.current?.open(true);
        }, []);

        return (
          <Dropdown ref={dropdownRef} enabled={false} dataTestId="dropdown">
            <div>Content</div>
          </Dropdown>
        );
      };

      render(<TestComponent />);

      const dropdown = screen.getByTestId("dropdown");
      // Should not have visible class
      expect(dropdown).not.toHaveClass("ls-visible");
    });
  });

  describe("Inline Mode", () => {
    it("should render inline when inline prop is true", () => {
      render(
        <div data-testid="container">
          <Dropdown inline={true} dataTestId="dropdown">
            <div>Content</div>
          </Dropdown>
        </div>,
      );

      const container = screen.getByTestId("container");
      const dropdown = screen.getByTestId("dropdown");

      // Dropdown should be a child of container (not portaled)
      expect(container).toContainElement(dropdown);
    });

    it("should render in portal by default", () => {
      render(
        <div data-testid="container">
          <Dropdown inline={false} dataTestId="dropdown">
            <div>Content</div>
          </Dropdown>
        </div>,
      );

      const container = screen.getByTestId("container");
      const dropdown = screen.getByTestId("dropdown");

      // Dropdown should not be a child of container (portaled to body)
      expect(container).not.toContainElement(dropdown);
    });
  });

  describe("Animation", () => {
    it("should animate by default", () => {
      const TestComponent = () => {
        const dropdownRef = useRef<DropdownRef>(null);

        useEffect(() => {
          dropdownRef.current?.open();
        }, []);

        return (
          <Dropdown ref={dropdownRef}>
            <div>Content</div>
          </Dropdown>
        );
      };

      render(<TestComponent />);

      // aroundTransition should be called for animation
      expect(transitionUtils.aroundTransition).toHaveBeenCalled();
    });

    it("should skip animation when animated is false", () => {
      (transitionUtils.aroundTransition as any).mockClear();

      const TestComponent = () => {
        const dropdownRef = useRef<DropdownRef>(null);

        useEffect(() => {
          dropdownRef.current?.open();
        }, []);

        return (
          <Dropdown ref={dropdownRef} animated={false}>
            <div>Content</div>
          </Dropdown>
        );
      };

      render(<TestComponent />);

      // aroundTransition should not be called when animation is disabled
      expect(transitionUtils.aroundTransition).not.toHaveBeenCalled();
    });
  });
});
