import { describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import { Provider } from "mobx-react";
import { OrderButton } from "../OrderButton";

const ORDERABLE_COLUMN = {
  key: "tasks:id",
  title: "ID",
  orderable: true,
  readableType: "Number",
};

const renderWithStore = (viewOverrides = {}) => {
  const view = {
    currentOrder: null,
    targetColumns: [ORDERABLE_COLUMN],
    isLockedByManager: false,
    lockedUpdateMessage: null,
    setOrdering: mock(),
    ...viewOverrides,
  };

  return {
    view,
    ...render(
      <Provider store={{ currentView: view }}>
        <OrderButton size="medium" />
      </Provider>,
    ),
  };
};

const getSortButton = () => screen.getByTestId("dm-order-button");

/*
 * Deliberately no assertions about where the two halves sit relative to each other. Bun runs every
 * suite in one process and `mock.module` registrations are never undone, so an unrelated file that
 * stubs `@humansignal/ui` changes whether Tooltip wraps the sort button — the tree shape here is not
 * stable enough to assert on. That position-independence is the whole point of the FIT-2947 fix, and
 * the CSS side of the contract is covered by OrderButton.prefix.test.ts.
 */
describe("OrderButton segmented control", () => {
  it("renders both halves of the control", () => {
    renderWithStore();

    // `dm-order-button` is the hook OrderButton.prefix.css matches; renaming it un-styles the seam.
    expect(getSortButton()).toBeInTheDocument();
    expect(screen.getByText("Order by")).toBeInTheDocument();
  });

  it("disables sorting until an ordering is chosen", () => {
    renderWithStore();

    expect(getSortButton()).toBeDisabled();
  });

  it("enables sorting and offers the descending direction once an ordering is set", () => {
    renderWithStore({ currentOrder: { field: "tasks:id", desc: false } });

    expect(getSortButton()).toBeEnabled();
    expect(getSortButton()).toHaveAttribute("aria-label", "Sort descending");
  });

  it("offers the ascending direction while sorted descending", () => {
    renderWithStore({ currentOrder: { field: "tasks:id", desc: true } });

    expect(getSortButton()).toHaveAttribute("aria-label", "Sort ascending");
  });

  it("re-applies the current field on click, which flips the direction", () => {
    const { view } = renderWithStore({ currentOrder: { field: "tasks:id", desc: false } });

    getSortButton().click();

    expect(view.setOrdering).toHaveBeenCalledWith("tasks:id");
  });
});
