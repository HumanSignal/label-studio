import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ColumnBrowser, ColumnBrowserColumn, ColumnBrowserItem } from "./column-browser";

jest.mock("./column-browser.module.css", () => ({
  root: "root",
  column: "column",
  header: "header",
  headerTitle: "headerTitle",
  headerCount: "headerCount",
  footer: "footer",
  body: "body",
  item: "item",
  itemSelected: "itemSelected",
  itemLabel: "itemLabel",
  itemMeta: "itemMeta",
  itemCaret: "itemCaret",
  itemActions: "itemActions",
}));

describe("ColumnBrowser", () => {
  it("renders the column title with its count and the footer", () => {
    render(
      <ColumnBrowser>
        <ColumnBrowserColumn title="Languages" count={2} footer={<button type="button">Add item</button>}>
          <ColumnBrowserItem>English</ColumnBrowserItem>
          <ColumnBrowserItem>Spanish</ColumnBrowserItem>
        </ColumnBrowserColumn>
      </ColumnBrowser>,
    );

    expect(screen.getByText("Languages")).toBeInTheDocument();
    expect(screen.getByText("2")).toHaveClass("headerCount");
    expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
  });

  it("selects on click, Enter and Space, and exposes the selected state", () => {
    const onSelect = jest.fn();
    render(
      <ColumnBrowserItem selected onSelect={onSelect}>
        English
      </ColumnBrowserItem>,
    );

    const item = screen.getByRole("button", { name: "English" });
    expect(item).toHaveAttribute("aria-pressed", "true");
    expect(item).toHaveClass("itemSelected");

    fireEvent.click(item);
    fireEvent.keyDown(item, { key: "Enter" });
    fireEvent.keyDown(item, { key: " " });
    fireEvent.keyDown(item, { key: "a" });
    expect(onSelect).toHaveBeenCalledTimes(3);
  });

  it("does not select when a key press comes from a control inside the item", () => {
    const onSelect = jest.fn();
    render(
      <ColumnBrowserItem onSelect={onSelect} actions={<button type="button">Menu</button>}>
        English
      </ColumnBrowserItem>,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: "Menu" }), { key: "Enter" });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("shows the child count only when there are children", () => {
    const { rerender } = render(<ColumnBrowserItem childCount={3}>English</ColumnBrowserItem>);
    expect(screen.getByText("3")).toBeInTheDocument();

    rerender(<ColumnBrowserItem childCount={0}>English</ColumnBrowserItem>);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
