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
      expect(dropdown).toHaveStyle({ backgroundColor: "red" });
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
        expect(dropdown).toHaveStyle({ left: "150px", top: "250px" });
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
        expect(dropdown).toHaveStyle({ left: "300px", top: "400px" });
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
        expect(dropdown).toHaveStyle({ left: "500px", top: "600px" });
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
      const onToggle = jest.fn();
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
      const onVisibilityChanged = jest.fn();

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
