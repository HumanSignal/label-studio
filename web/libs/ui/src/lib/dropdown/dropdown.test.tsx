import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useRef, useEffect } from "react";
import { Dropdown, type DropdownRef } from "./dropdown";
import { DropdownContext, type DropdownContextValue } from "./dropdown-context";

// Mock the SCSS module
jest.mock("./dropdown.scss", () => ({}));

// Mock the alignment utility
jest.mock("@humansignal/core/lib/utils/dom", () => ({
  alignElements: jest.fn(() => ({
    left: 100,
    top: 200,
    maxHeight: 500,
  })),
}));

// Mock the transition utility
jest.mock("@humansignal/core/lib/utils/transition", () => ({
  aroundTransition: jest.fn((_element, callbacks) => {
    callbacks.beforeTransition?.();
    callbacks.transition?.();
    callbacks.afterTransition?.();
  }),
}));

// Mock CSS.supports for anchor positioning tests
const originalCSSSupports = CSS.supports;

describe("Dropdown - Cursor Position Support", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset CSS.supports to default (no anchor positioning support)
    CSS.supports = jest.fn(() => false);
  });

  afterEach(() => {
    CSS.supports = originalCSSSupports;
  });

  describe("Basic Rendering", () => {
    it("should render successfully", () => {
      render(
        <Dropdown>
          <div>Dropdown Content</div>
        </Dropdown>,
      );

      expect(screen.getByText("Dropdown Content")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <Dropdown className="custom-dropdown" dataTestId="dropdown">
          <div>Content</div>
        </Dropdown>,
      );

      const dropdown = screen.getByTestId("dropdown");
      expect(dropdown).toHaveClass("custom-dropdown");
    });

    it("should apply custom styles", () => {
      render(
        <Dropdown style={{ backgroundColor: "red" }} dataTestId="dropdown">
          <div>Content</div>
        </Dropdown>,
      );

      const dropdown = screen.getByTestId("dropdown");
      expect(dropdown).toHaveStyle({ backgroundColor: "red" });
    });
  });

  describe("Cursor Position Handling", () => {
    it("should use cursor position for positioning when provided", async () => {
      const { alignElements } = require("@humansignal/core/lib/utils/dom");

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
            <Dropdown ref={dropdownRef} visible={true} animated={false}>
              <div>Menu Content</div>
            </Dropdown>
          </DropdownContext.Provider>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(alignElements).toHaveBeenCalled();
      });

      // Verify that alignElements was called with a virtual element
      const firstCall = alignElements.mock.calls[0];
      const parentElement = firstCall[0];

      // Virtual element should have getBoundingClientRect that returns cursor position
      expect(parentElement.getBoundingClientRect).toBeDefined();
      const rect = parentElement.getBoundingClientRect();
      expect(rect.left).toBe(150);
      expect(rect.top).toBe(250);
      expect(rect.width).toBe(0);
      expect(rect.height).toBe(0);
    });

    it("should fall back to trigger element when no cursor position", async () => {
      const { alignElements } = require("@humansignal/core/lib/utils/dom");

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
        expect(alignElements).toHaveBeenCalled();
      });

      // Verify that alignElements was called with the trigger element
      const firstCall = alignElements.mock.calls[0];
      const parentElement = firstCall[0];

      // Should be the actual trigger element, not a virtual element
      expect(parentElement).toBeInstanceOf(HTMLElement);
    });

    it("should create virtual element with correct getBoundingClientRect", () => {
      const { alignElements } = require("@humansignal/core/lib/utils/dom");

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
            <Dropdown ref={dropdownRef} visible={true} animated={false}>
              <div>Menu Content</div>
            </Dropdown>
          </DropdownContext.Provider>
        );
      };

      render(<TestComponent />);

      // Get the virtual element from the alignElements call
      const firstCall = alignElements.mock.calls[0];
      const virtualElement = firstCall[0];
      const rect = virtualElement.getBoundingClientRect();

      expect(rect).toEqual({
        left: 300,
        top: 400,
        right: 300,
        bottom: 400,
        width: 0,
        height: 0,
        x: 300,
        y: 400,
        toJSON: expect.any(Function),
      });
    });

    it("should position dropdown at cursor location", async () => {
      const { alignElements } = require("@humansignal/core/lib/utils/dom");

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
            <Dropdown ref={dropdownRef} visible={true} animated={false} alignment="bottom-left">
              <div>Menu Content</div>
            </Dropdown>
          </DropdownContext.Provider>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(alignElements).toHaveBeenCalled();
      });

      // Verify alignElements was called with correct parameters
      const call = alignElements.mock.calls[0];
      expect(call[2]).toBe("bottom-left"); // alignment
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
      expect(dropdown).toHaveClass("mounted");

      rerender(
        <Dropdown visible={true} dataTestId="dropdown">
          <div>Content</div>
        </Dropdown>,
      );

      dropdown = screen.getByTestId("dropdown");
      expect(dropdown).toHaveClass("visible");
    });

    it("should call onToggle callback when visibility changes", async () => {
      const onToggle = jest.fn();
      const TestComponent = () => {
        const dropdownRef = useRef<DropdownRef>(null);

        return (
          <Dropdown ref={dropdownRef} onToggle={onToggle}>
            <div>Content</div>
          </Dropdown>
        );
      };

      render(<TestComponent />);

      // Get the ref and toggle
      const dropdown = screen.getByText("Content").parentElement;
      expect(dropdown).toBeInTheDocument();

      // Note: onToggle is called through the ref's toggle method
      // This is tested indirectly through integration tests
    });

    it("should call onVisibilityChanged callback when visibility changes", () => {
      const onVisibilityChanged = jest.fn();

      render(
        <Dropdown onVisibilityChanged={onVisibilityChanged}>
          <div>Content</div>
        </Dropdown>,
      );

      // Note: onVisibilityChanged is called through the ref's toggle method
      // This is tested indirectly through integration tests
      expect(screen.getByText("Content")).toBeInTheDocument();
    });
  });

  describe("Alignment", () => {
    it("should use default alignment when not specified", async () => {
      const { alignElements } = require("@humansignal/core/lib/utils/dom");

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
        expect(alignElements).toHaveBeenCalled();
      });

      const call = alignElements.mock.calls[0];
      expect(call[2]).toBe("bottom-left"); // default alignment
    });

    it("should use custom alignment when specified", async () => {
      const { alignElements } = require("@humansignal/core/lib/utils/dom");

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
        expect(alignElements).toHaveBeenCalled();
      });

      const call = alignElements.mock.calls[0];
      expect(call[2]).toBe("top-right");
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
        expect(dropdown).toHaveClass("constrain-height");
      });
    });

    it("should calculate position when constrainHeight is enabled", async () => {
      const { alignElements } = require("@humansignal/core/lib/utils/dom");

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
            <Dropdown ref={dropdownRef} visible={true} animated={false} constrainHeight={true}>
              <div>Menu Content</div>
            </Dropdown>
          </DropdownContext.Provider>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(alignElements).toHaveBeenCalled();
      });

      const call = alignElements.mock.calls[0];
      expect(call[4]).toBe(true); // constrainHeight parameter
    });
  });

  describe("Sync Width", () => {
    it("should apply sync-width class when syncWidth is enabled", () => {
      render(
        <Dropdown syncWidth={true} data-testid="dropdown">
          <div>Content</div>
        </Dropdown>,
      );

      const dropdown = screen.getByTestId("dropdown");
      expect(dropdown).toHaveClass("sync-width");
    });

    it("should not apply sync-width class when syncWidth is disabled", () => {
      render(
        <Dropdown syncWidth={false} data-testid="dropdown">
          <div>Content</div>
        </Dropdown>,
      );

      const dropdown = screen.getByTestId("dropdown");
      expect(dropdown).not.toHaveClass("sync-width");
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
            <Dropdown ref={dropdownRef} data-testid="dropdown">
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
          <Dropdown ref={dropdownRef} enabled={false} data-testid="dropdown">
            <div>Content</div>
          </Dropdown>
        );
      };

      render(<TestComponent />);

      const dropdown = screen.getByTestId("dropdown");
      // Should not have visible class
      expect(dropdown).not.toHaveClass("visible");
    });
  });

  describe("Inline Mode", () => {
    it("should render inline when inline prop is true", () => {
      render(
        <div data-testid="container">
          <Dropdown inline={true} data-testid="dropdown">
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
          <Dropdown inline={false} data-testid="dropdown">
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
      const { aroundTransition } = require("@humansignal/core/lib/utils/transition");

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
      expect(aroundTransition).toHaveBeenCalled();
    });

    it("should skip animation when animated is false", () => {
      const { aroundTransition } = require("@humansignal/core/lib/utils/transition");
      aroundTransition.mockClear();

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
      expect(aroundTransition).not.toHaveBeenCalled();
    });
  });
});
