import { describe, expect, it, mock } from "bun:test";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { TreeSelect, type TreeSelectNode } from "./tree-select";

const nodes: TreeSelectNode[] = [
  {
    key: "parent",
    value: "parent",
    label: "Parent",
    checkState: "indeterminate",
    children: [{ key: "child", value: "alias", label: <strong>Child</strong>, ariaLabel: "Child" }],
  },
  { key: "last", value: "last", label: "Last" },
];

function Example({
  onSelect = mock(),
  items = nodes,
}: {
  onSelect?: (node: TreeSelectNode) => void;
  items?: TreeSelectNode[];
}) {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  return (
    <TreeSelect
      nodes={items}
      expandedKeys={expandedKeys}
      selectedValues={[]}
      onToggleExpand={(node) =>
        setExpandedKeys((keys) =>
          keys.includes(node.key) ? keys.filter((key) => key !== node.key) : [...keys, node.key],
        )
      }
      onToggleSelect={onSelect}
      ariaLabel="Categories"
      required
    />
  );
}

describe("TreeSelect accessible navigation", () => {
  it("exposes named tree rows with levels and partial selection", () => {
    render(<Example />);
    const tree = screen.getByRole("tree", { name: "Categories" });
    expect(tree).toHaveAttribute("aria-multiselectable", "true");
    expect(tree).toHaveAttribute("aria-required", "true");
    const parent = screen.getByRole("treeitem", { name: "Parent" });
    expect(parent).toHaveAttribute("aria-expanded", "false");
    expect(parent).toHaveAttribute("aria-checked", "mixed");
    expect(parent).toHaveAttribute("aria-level", "1");
    expect(parent).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("treeitem", { name: "Last" })).toHaveAttribute("tabindex", "-1");
  });

  it("expands, visits children, selects, and returns to the parent with arrow keys", () => {
    const onSelect = mock();
    render(<Example onSelect={onSelect} />);
    const parent = screen.getByRole("treeitem", { name: "Parent" });
    act(() => parent.focus());
    fireEvent.keyDown(parent, { key: "ArrowRight" });
    expect(parent).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(parent, { key: "ArrowRight" });
    const child = screen.getByRole("treeitem", { name: "Child" });
    expect(child).toHaveFocus();
    expect(child).toHaveAttribute("aria-level", "2");
    fireEvent.keyDown(child, { key: " " });
    expect(onSelect).toHaveBeenCalledWith(nodes[0].children?.[0]);
    fireEvent.keyDown(child, { key: "ArrowLeft" });
    expect(parent).toHaveFocus();
    fireEvent.keyDown(parent, { key: "ArrowLeft" });
    expect(parent).toHaveAttribute("aria-expanded", "false");
    fireEvent.keyDown(parent, { key: "ArrowDown" });
    expect(screen.getByRole("treeitem", { name: "Last" })).toHaveFocus();
  });

  it("scrolls virtualized rows into view before focusing End and Home", async () => {
    const items = Array.from({ length: 1000 }, (_, index) => ({
      key: String(index),
      value: String(index),
      label: `Item ${index}`,
    }));
    render(<Example items={items} />);
    const first = screen.getByRole("treeitem", { name: "Item 0" });
    expect(screen.getAllByRole("treeitem").length).toBeLessThan(30);
    act(() => first.focus());
    fireEvent.keyDown(first, { key: "End" });
    await waitFor(() => expect(screen.getByRole("treeitem", { name: "Item 999" })).toHaveFocus());
    fireEvent.keyDown(screen.getByRole("treeitem", { name: "Item 999" }), { key: "Home" });
    await waitFor(() => expect(screen.getByRole("treeitem", { name: "Item 0" })).toHaveFocus());
  });

  it("keeps the expanding row focused when expansion switches to virtualization", () => {
    const children = Array.from({ length: 30 }, (_, index) => ({
      key: String(index),
      value: String(index),
      label: `Item ${index}`,
    }));
    render(<Example items={[{ ...nodes[0], children }]} />);
    const parent = screen.getByRole("treeitem", { name: "Parent" });
    act(() => parent.focus());
    fireEvent.keyDown(parent, { key: "ArrowRight" });
    expect(screen.getByRole("treeitem", { name: "Parent" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("treeitem", { name: "Parent" }), { key: "ArrowLeft" });
    expect(screen.getByRole("treeitem", { name: "Parent" })).toHaveFocus();
  });

  it("keeps a mounted row in the tab order after mouse scrolling past the active row", () => {
    const items = Array.from({ length: 1000 }, (_, index) => ({
      key: String(index),
      value: String(index),
      label: `Item ${index}`,
    }));
    render(<Example items={items} />);
    const scroller = screen.getByRole("tree", { name: "Categories" }).firstElementChild;
    if (!(scroller instanceof HTMLElement)) throw new Error("Missing tree scroll container");
    Object.defineProperties(scroller, {
      clientHeight: { value: 384, configurable: true },
      scrollHeight: { value: 32000, configurable: true },
    });
    fireEvent.scroll(scroller, { target: { scrollTop: 3200 } });
    expect(screen.queryByRole("treeitem", { name: "Item 0" })).not.toBeInTheDocument();
    const tabbableRows = screen.getAllByRole("treeitem").filter((row) => row.tabIndex === 0);
    expect(tabbableRows).toHaveLength(1);
    expect(tabbableRows[0]).toHaveAttribute("aria-label", "Item 100");
    act(() => tabbableRows[0].focus());
    fireEvent.keyDown(tabbableRows[0], { key: "ArrowDown" });
    expect(screen.getByRole("treeitem", { name: "Item 101" })).toHaveFocus();
  });

  it("does not intercept keyboard activation of row actions", () => {
    const onAction = mock();
    const onSelect = mock();
    render(
      <Example
        onSelect={onSelect}
        items={[
          {
            key: "one",
            value: "one",
            label: "One",
            rowSuffix: (
              <button type="button" onClick={onAction}>
                Remove
              </button>
            ),
          },
        ]}
      />,
    );
    const action = screen.getByRole("button", { name: "Remove" });
    fireEvent.keyDown(action, { key: "Enter" });
    fireEvent.click(action);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("allows expanding disabled parents without selecting them", () => {
    const onSelect = mock();
    render(<Example onSelect={onSelect} items={[{ ...nodes[0], disabled: true }]} />);
    const parent = screen.getByRole("treeitem", { name: "Parent" });
    expect(parent.getAttribute("aria-disabled")).toBe("false");
    expect(screen.getByRole("checkbox", { name: "Select Parent" })).toBeDisabled();
    fireEvent.keyDown(parent, { key: "Enter" });
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.keyDown(parent, { key: "ArrowRight" });
    expect(screen.getByRole("treeitem", { name: "Child" })).toBeInTheDocument();
  });

  it("exposes a selection-disabled leaf as an unavailable tree item", () => {
    render(<Example items={[{ ...nodes[1], disabled: true }]} />);
    expect(screen.getByRole("treeitem", { name: "Last" })).toHaveAttribute("aria-disabled", "true");
  });

  it("leaves editing keys available to embedded text inputs", () => {
    const onSelect = mock();
    render(
      <Example
        onSelect={onSelect}
        items={[{ key: "input", value: "input", label: <input aria-label="New label" />, labelIsInteractive: false }]}
      />,
    );
    const input = screen.getByRole("textbox", { name: "New label" });
    act(() => input.focus());
    expect(fireEvent.keyDown(input, { key: "Home" })).toBe(true);
    expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(true);
    expect(input).toHaveFocus();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("preserves button and checkbox behavior without an accessible tree label", () => {
    const onSelect = mock();
    render(
      <TreeSelect
        nodes={nodes}
        expandedKeys={[]}
        selectedValues={[]}
        onToggleExpand={mock()}
        onToggleSelect={onSelect}
      />,
    );
    expect(screen.queryByRole("tree")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Last" }));
    expect(onSelect).toHaveBeenCalledWith(nodes[1]);
  });
});
