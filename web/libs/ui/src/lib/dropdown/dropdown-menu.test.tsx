import { Fragment } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as transitionUtils from "@humansignal/core/lib/utils/transition";
import { Button } from "../button/button";
import { Dropdown } from "./dropdown";

const originalCSSSupports = CSS.supports;

const renderMenu = (
  items: {
    onSelect?: () => void;
    disabled?: boolean;
    danger?: boolean;
    closeOnSelect?: boolean;
    description?: string;
    icon?: boolean;
    label: string;
    testId: string;
  }[],
  { divider = false }: { divider?: boolean } = {},
) =>
  render(
    <Dropdown.Trigger
      animated={false}
      content={
        <Dropdown.Menu data-testid="menu" aria-label="Actions">
          {items.map((item, index) => (
            <Fragment key={item.testId}>
              {divider && index > 0 ? <Dropdown.Divider data-testid={`divider-${index}`} /> : null}
              <Dropdown.Item
                data-testid={item.testId}
                disabled={item.disabled}
                danger={item.danger}
                closeOnSelect={item.closeOnSelect}
                description={item.description}
                icon={item.icon ? <svg data-testid={`${item.testId}-icon`} /> : undefined}
                onSelect={item.onSelect}
              >
                {item.label}
              </Dropdown.Item>
            </Fragment>
          ))}
        </Dropdown.Menu>
      }
    >
      <Button data-testid="trigger">Open</Button>
    </Dropdown.Trigger>,
  );

const openMenu = async () => {
  fireEvent.click(screen.getByTestId("trigger"));
  await waitFor(() => expect(screen.getByTestId("menu")).toBeInTheDocument());
};

const isMenuClosed = () => screen.queryByTestId("menu") === null;

describe("Dropdown.Menu / Dropdown.Item / Dropdown.Divider", () => {
  beforeEach(() => {
    CSS.supports = mock(() => false);
    spyOn(transitionUtils, "aroundTransition").mockImplementation(
      mock((_element: any, callbacks: any) => {
        callbacks.beforeTransition?.();
        callbacks.transition?.();
        callbacks.afterTransition?.();
      }),
    );
  });

  afterEach(() => {
    CSS.supports = originalCSSSupports;
    mock.restore();
    document.body.querySelectorAll(".dropdown").forEach((el) => el.remove());
  });

  it("exposes the menu, item and divider parts on Dropdown", () => {
    expect(Dropdown.Menu).toBeDefined();
    expect(Dropdown.Item).toBeDefined();
    expect(Dropdown.Divider).toBeDefined();
  });

  describe("roles", () => {
    it("renders role=menu, role=menuitem and role=separator", async () => {
      renderMenu(
        [
          { label: "Configure", testId: "item-a" },
          { label: "Delete", testId: "item-b" },
        ],
        { divider: true },
      );
      await openMenu();

      expect(screen.getByRole("menu", { name: "Actions" })).toBe(screen.getByTestId("menu"));
      expect(screen.getAllByRole("menuitem")).toHaveLength(2);
      expect(screen.getByRole("separator")).toBe(screen.getByTestId("divider-1"));
    });

    it("renders the item label, icon and description", async () => {
      renderMenu([{ label: "Preview", testId: "item-a", icon: true, description: "Open in a new tab" }]);
      await openMenu();

      const item = screen.getByTestId("item-a");
      expect(item).toHaveTextContent("Preview");
      expect(item).toHaveTextContent("Open in a new tab");
      expect(screen.getByTestId("item-a-icon")).toBeInTheDocument();
    });

    it("renders an item without an icon", async () => {
      renderMenu([{ label: "Preview", testId: "item-a" }]);
      await openMenu();

      expect(screen.getByRole("menuitem", { name: "Preview" })).toBeInTheDocument();
    });
  });

  describe("danger", () => {
    it("uses the negative variant for danger items and the neutral one otherwise", async () => {
      renderMenu([
        { label: "Configure", testId: "item-a" },
        { label: "Delete", testId: "item-b", danger: true },
      ]);
      await openMenu();

      expect(screen.getByTestId("item-a")).toHaveAttribute("data-variant", "neutral");
      expect(screen.getByTestId("item-b")).toHaveAttribute("data-variant", "negative");
    });
  });

  describe("selection", () => {
    it("calls onSelect and closes the dropdown by default", async () => {
      const onSelect = mock();
      renderMenu([{ label: "Configure", testId: "item-a", onSelect }]);
      await openMenu();

      fireEvent.click(screen.getByTestId("item-a"));

      expect(onSelect).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(isMenuClosed()).toBe(true));
    });

    it("keeps the dropdown open when closeOnSelect is false", async () => {
      const onSelect = mock();
      renderMenu([{ label: "Configure", testId: "item-a", onSelect, closeOnSelect: false }]);
      await openMenu();

      fireEvent.click(screen.getByTestId("item-a"));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(isMenuClosed()).toBe(false);
    });
  });

  describe("disabled", () => {
    it("marks the item aria-disabled and never calls onSelect", async () => {
      const onSelect = mock();
      renderMenu([{ label: "Delete", testId: "item-a", disabled: true, onSelect, description: "Not allowed" }]);
      await openMenu();

      const item = screen.getByTestId("item-a");
      expect(item).toHaveAttribute("aria-disabled", "true");
      expect(item).toHaveTextContent("Not allowed");

      fireEvent.click(item);

      expect(onSelect).not.toHaveBeenCalled();
      expect(isMenuClosed()).toBe(false);
    });

    it("does not mark enabled items aria-disabled", async () => {
      renderMenu([{ label: "Configure", testId: "item-a" }]);
      await openMenu();

      expect(screen.getByTestId("item-a")).not.toHaveAttribute("aria-disabled");
    });
  });

  describe("keyboard", () => {
    const items = [
      { label: "One", testId: "item-1" },
      { label: "Two", testId: "item-2", disabled: true },
      { label: "Three", testId: "item-3" },
    ];

    it("moves focus to the first enabled item when the menu opens", async () => {
      renderMenu(items);
      await openMenu();

      await waitFor(() => expect(screen.getByTestId("item-1")).toHaveFocus());
    });

    it("skips disabled items to the first enabled one when the first item is disabled", async () => {
      renderMenu([
        { label: "One", testId: "item-1", disabled: true },
        { label: "Two", testId: "item-2" },
      ]);
      await openMenu();

      await waitFor(() => expect(screen.getByTestId("item-2")).toHaveFocus());
    });

    it("ArrowDown moves to the next enabled item, skips disabled ones and wraps", async () => {
      renderMenu(items);
      await openMenu();
      await waitFor(() => expect(screen.getByTestId("item-1")).toHaveFocus());

      fireEvent.keyDown(screen.getByTestId("item-1"), { key: "ArrowDown" });
      expect(screen.getByTestId("item-3")).toHaveFocus();

      fireEvent.keyDown(screen.getByTestId("item-3"), { key: "ArrowDown" });
      expect(screen.getByTestId("item-1")).toHaveFocus();
    });

    it("ArrowUp moves to the previous enabled item, skips disabled ones and wraps", async () => {
      renderMenu(items);
      await openMenu();
      await waitFor(() => expect(screen.getByTestId("item-1")).toHaveFocus());

      fireEvent.keyDown(screen.getByTestId("item-1"), { key: "ArrowUp" });
      expect(screen.getByTestId("item-3")).toHaveFocus();

      fireEvent.keyDown(screen.getByTestId("item-3"), { key: "ArrowUp" });
      expect(screen.getByTestId("item-1")).toHaveFocus();
    });

    it("Home and End jump to the first and last enabled items", async () => {
      renderMenu([...items, { label: "Four", testId: "item-4", disabled: true }]);
      await openMenu();
      await waitFor(() => expect(screen.getByTestId("item-1")).toHaveFocus());

      fireEvent.keyDown(screen.getByTestId("item-1"), { key: "End" });
      expect(screen.getByTestId("item-3")).toHaveFocus();

      fireEvent.keyDown(screen.getByTestId("item-3"), { key: "Home" });
      expect(screen.getByTestId("item-1")).toHaveFocus();
    });

    it("Escape closes the dropdown and returns focus to the trigger", async () => {
      renderMenu(items);
      await openMenu();
      await waitFor(() => expect(screen.getByTestId("item-1")).toHaveFocus());

      fireEvent.keyDown(screen.getByTestId("item-1"), { key: "Escape" });

      await waitFor(() => expect(isMenuClosed()).toBe(true));
      expect(screen.getByTestId("trigger")).toHaveFocus();
    });
  });
});
