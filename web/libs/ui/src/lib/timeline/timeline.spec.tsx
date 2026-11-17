import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useState } from "react";
import { Timeline } from "./timeline";

describe("Timeline", () => {
  it("renders items in order with a connector between them but not after the last", () => {
    render(
      <Timeline>
        <Timeline.Item icon={<span />} title="First" data-testid="item-1" />
        <Timeline.Item icon={<span />} title="Second" data-testid="item-2" />
        <Timeline.Item icon={<span />} title="Third" data-testid="item-3" />
      </Timeline>,
    );

    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["First", "Second", "Third"]);

    const [first, second, third] = items;
    expect(first.querySelector(".connectorBelow")).toBeInTheDocument();
    expect(second.querySelector(".connectorBelow")).toBeInTheDocument();
    expect(third.querySelector(".connectorBelow")).not.toBeInTheDocument();
  });

  it("draws no connector at all when `connector` is off, and keeps the spacing between entries", () => {
    render(
      <Timeline connector={false}>
        <Timeline.Item icon={<span />} title="First" data-testid="item-1" />
        <Timeline.Item icon={<span />} title="Second" data-testid="item-2" />
      </Timeline>,
    );

    const [first, second] = screen.getAllByRole("listitem");
    expect(first.querySelector(".connector")).not.toBeInTheDocument();
    expect(second.querySelector(".connector")).not.toBeInTheDocument();
    // The gap between entries is each entry's own bottom margin, which does not depend on the line.
    expect(first).toHaveClass("itemSpaced");
    expect(second).not.toHaveClass("itemSpaced");
  });

  it("keeps the connector segments in the entry's own box, and a rail beside expanded content only", () => {
    render(
      <Timeline>
        <Timeline.Item icon={<span />} title="Collapsed" expandable expanded={false} data-testid="a" />
        <Timeline.Item icon={<span />} title="Expanded" expandable expanded data-testid="b">
          <span>Content</span>
        </Timeline.Item>
        <Timeline.Item icon={<span />} title="Last" expandable expanded data-testid="c">
          <span>Content</span>
        </Timeline.Item>
      </Timeline>,
    );

    const [a, b, c] = screen.getAllByRole("listitem");
    for (const entry of [a, b, c]) {
      // The segments are measured against the entry's box, not the (taller, when expanded) item.
      const box = entry.querySelector(".entry");
      expect(box?.querySelector(".connectorAbove")).toBeInTheDocument();
      expect(box?.querySelector(".markerSlot .marker")).toBeInTheDocument();
    }
    expect(a.querySelector(".entry .connectorBelow")).toBeInTheDocument();
    expect(a.querySelector(".connectorRail")).not.toBeInTheDocument();
    expect(b.querySelector(".entry .connectorBelow")).toBeInTheDocument();
    // The rail runs beside the expanded content, outside the entry's box.
    expect(b.querySelector(".body .connectorRail")).toBeInTheDocument();
    expect(b.querySelector(".entry .connectorRail")).not.toBeInTheDocument();
    // Nothing runs on past the last entry, expanded or not.
    expect(c.querySelector(".connectorBelow")).not.toBeInTheDocument();
    expect(c.querySelector(".connectorRail")).not.toBeInTheDocument();
  });

  it("keeps the card around the marker and the header only, never around the expanded content", () => {
    render(
      <Timeline>
        <Timeline.Item
          icon={<span />}
          title="Group"
          selected
          onSelect={() => {}}
          expandable
          expanded
          data-testid="group"
        >
          <Timeline.Row data-testid="child">Child</Timeline.Row>
        </Timeline.Item>
      </Timeline>,
    );

    const box = screen.getByTestId("group-row").querySelector(".entry") as HTMLElement;
    expect(box).toHaveClass("entrySelected");
    expect(box).toContainElement(screen.getByTestId("group"));
    expect(box).toContainElement(screen.getByTestId("group-expand"));
    expect(box).not.toContainElement(screen.getByTestId("child"));
    // The sub-rows are laid out by the body below the box, which is part of the same list item.
    expect(screen.getByTestId("group-row")).toContainElement(screen.getByTestId("child"));
  });

  it("marks only selectable entries as interactive for the hover treatment", () => {
    render(
      <Timeline>
        <Timeline.Item icon={<span />} title="Selectable" onSelect={() => {}} data-testid="a" />
        <Timeline.Item icon={<span />} title="Static" data-testid="b" />
      </Timeline>,
    );

    expect(screen.getByTestId("a-row").querySelector(".entryInteractive")).toBeInTheDocument();
    expect(screen.getByTestId("b-row").querySelector(".entryInteractive")).not.toBeInTheDocument();
  });

  it("makes the header button the one click and cursor target of a selectable entry, and gives static ones none", () => {
    const onSelect = jest.fn();
    render(
      <Timeline>
        <Timeline.Item icon={<span />} title="Selectable" onSelect={onSelect} data-testid="a" />
        <Timeline.Item icon={<span />} title="Static" data-testid="b" />
      </Timeline>,
    );

    // The card's overlay (a pseudo-element of the header button) clicks through to this button.
    const header = screen.getByTestId("a");
    expect(header.tagName).toBe("BUTTON");
    expect(header).toHaveClass("headerButton");
    fireEvent.click(header);
    expect(onSelect).toHaveBeenCalledTimes(1);
    // A static entry has no button at all, so no overlay and no pointer cursor anywhere.
    expect(screen.getByTestId("b-row").querySelector("button")).not.toBeInTheDocument();
  });

  it("lets a selectable entry's marker circle be hovered and forwards its click, and leaves a static entry's alone", () => {
    const onSelect = jest.fn();
    render(
      <Timeline>
        <Timeline.Item icon={<span />} title="Selectable" onSelect={onSelect} data-testid="a" />
        <Timeline.Item icon={<span />} title="Static" data-testid="b" />
      </Timeline>,
    );

    const circle = screen.getByTestId("a-row").querySelector(".markerHit") as HTMLElement;
    expect(circle).toBeInTheDocument();
    fireEvent.click(circle);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("b-row").querySelector(".markerHit")).not.toBeInTheDocument();
  });

  it("renders titles, descriptions, a title badge and a meta row", () => {
    render(
      <Timeline>
        <Timeline.Item
          icon={<span />}
          title="Title"
          titleBadge={<span data-testid="badge">Badge</span>}
          description="A short description"
          meta={<span>Nov 6, 10:32 AM</span>}
          data-testid="item"
        />
      </Timeline>,
    );

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByTestId("badge")).toHaveTextContent("Badge");
    expect(screen.getByText("A short description")).toBeInTheDocument();
    expect(screen.getByText("Nov 6, 10:32 AM")).toBeInTheDocument();
    // Not clickable: no onSelect was given.
    expect(screen.queryByTestId("item")?.tagName).not.toBe("BUTTON");
  });

  it("selects an item via its header and announces it with aria-current, not colour alone", () => {
    const onSelect = jest.fn();
    render(
      <Timeline>
        <Timeline.Item icon={<span />} title="Selected" selected onSelect={onSelect} data-testid="selected" />
        <Timeline.Item icon={<span />} title="Other" onSelect={jest.fn()} data-testid="other" />
      </Timeline>,
    );

    expect(screen.getByTestId("selected")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("other")).not.toHaveAttribute("aria-current");

    fireEvent.click(screen.getByTestId("other"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("paints a selected item as a persistent card on top of the primary marker, and nothing else", () => {
    render(
      <Timeline>
        <Timeline.Item icon={<span />} title="Selected" selected onSelect={() => {}} data-testid="a" />
        <Timeline.Item icon={<span />} title="Other" onSelect={() => {}} data-testid="b" />
        <Timeline.Item icon={<span />} title="Static" selected data-testid="c" />
      </Timeline>,
    );

    expect(screen.getByTestId("a-row").querySelector(".tonePrimary")).toBeInTheDocument();
    expect(screen.getByTestId("b-row").querySelector(".tonePrimary")).not.toBeInTheDocument();
    expect(screen.getByTestId("a-row").querySelector(".entrySelected")).toBeInTheDocument();
    expect(screen.getByTestId("b-row").querySelector(".entrySelected")).not.toBeInTheDocument();
    // The card belongs to selectable entries only.
    expect(screen.getByTestId("c-row").querySelector(".entrySelected")).not.toBeInTheDocument();
  });

  it("keeps an explicit tone on a selected marker, while a neutral one goes primary", () => {
    render(
      <Timeline>
        <Timeline.Item icon={<span />} title="Positive" tone="positive" selected onSelect={() => {}} data-testid="p" />
        <Timeline.Item icon={<span />} title="Warning" tone="warning" selected onSelect={() => {}} data-testid="w" />
        <Timeline.Item icon={<span />} title="Neutral" selected onSelect={() => {}} data-testid="n" />
      </Timeline>,
    );

    const p = screen.getByTestId("p-row");
    expect(p.querySelector(".tonePositive")).toBeInTheDocument();
    expect(p.querySelector(".tonePrimary")).not.toBeInTheDocument();
    expect(screen.getByTestId("w-row").querySelector(".toneWarning")).toBeInTheDocument();
    expect(screen.getByTestId("n-row").querySelector(".tonePrimary")).toBeInTheDocument();
    // Selection is still conveyed without the marker: card, aria-current.
    expect(screen.getByTestId("p")).toHaveAttribute("aria-current", "true");
    expect(p.querySelector(".entrySelected")).toBeInTheDocument();
  });

  it("renders one caret in the toggle and turns it, rather than swapping icons, when the item opens", () => {
    const { rerender } = render(
      <Timeline>
        <Timeline.Item title="Group" expandable expanded={false} onExpandedChange={() => {}} data-testid="g">
          <span>child</span>
        </Timeline.Item>
      </Timeline>,
    );
    const toggle = screen.getByTestId("g-expand");
    const closed = toggle.querySelector("svg");
    expect(toggle.querySelectorAll("svg")).toHaveLength(1);
    expect(closed).toHaveAttribute("data-state", "closed");
    expect(closed).toHaveClass("caret");
    expect(closed).not.toHaveClass("caretOpen");

    rerender(
      <Timeline>
        <Timeline.Item title="Group" expandable expanded onExpandedChange={() => {}} data-testid="g">
          <span>child</span>
        </Timeline.Item>
      </Timeline>,
    );
    const open = screen.getByTestId("g-expand").querySelector("svg");
    // The same element, turned: no icon swap, and the toggle's own semantics are unchanged.
    expect(open).toBe(closed);
    expect(open).toHaveAttribute("data-state", "open");
    expect(open).toHaveClass("caretOpen");
    expect(screen.getByTestId("g-expand")).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the marker neutral when an item is only expanded, and primary once it is selected", () => {
    const { rerender } = render(
      <Timeline>
        <Timeline.Item title="Group" expandable expanded onExpandedChange={() => {}} data-testid="g">
          <span>child</span>
        </Timeline.Item>
      </Timeline>,
    );
    expect(screen.getByTestId("g-row").querySelector(".tonePrimary")).not.toBeInTheDocument();

    rerender(
      <Timeline>
        <Timeline.Item
          title="Group"
          expandable
          expanded
          selected
          onSelect={() => {}}
          onExpandedChange={() => {}}
          data-testid="g"
        >
          <span>child</span>
        </Timeline.Item>
      </Timeline>,
    );
    expect(screen.getByTestId("g-row").querySelector(".tonePrimary")).toBeInTheDocument();
  });

  it("exposes aria-expanded and aria-controls on the expand toggle, and renders children only when expanded", () => {
    function ExpandableItem() {
      const [expanded, setExpanded] = useState(false);
      return (
        <Timeline>
          <Timeline.Item
            icon={<span />}
            title="Group"
            expandable
            expanded={expanded}
            onExpandedChange={setExpanded}
            expandLabel="details for the group"
            data-testid="group"
          >
            <Timeline.Row data-testid="row-1">Row 1</Timeline.Row>
          </Timeline.Item>
        </Timeline>
      );
    }

    render(<ExpandableItem />);

    const toggle = screen.getByTestId("group-expand");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("row-1")).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls");
    expect(screen.getByTestId("row-1")).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("row-1")).not.toBeInTheDocument();
  });

  it("selects a Timeline.Row and reports its own aria-current", () => {
    const onSelect = jest.fn();
    render(
      <Timeline.Row selected onSelect={onSelect} data-testid="row">
        Introduction · 3 edits
      </Timeline.Row>,
    );

    const row = screen.getByTestId("row");
    expect(row).toHaveAttribute("aria-current", "true");
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("renders a Timeline.Row as a button only when it can be clicked, so a static one has no hover treatment to show", () => {
    render(
      <>
        <Timeline.Row onSelect={() => {}} data-testid="selectable">
          Selectable
        </Timeline.Row>
        <Timeline.Row onClick={() => {}} data-testid="clickable">
          Clickable
        </Timeline.Row>
        <Timeline.Row selected data-testid="static-selected">
          Static selected
        </Timeline.Row>
        <Timeline.Row data-testid="static">Static</Timeline.Row>
      </>,
    );

    expect(screen.getByTestId("selectable").tagName).toBe("BUTTON");
    expect(screen.getByTestId("clickable").tagName).toBe("BUTTON");
    expect(screen.getByTestId("static").tagName).toBe("DIV");
    expect(screen.getByTestId("static")).toHaveTextContent("Static");
    expect(screen.getAllByRole("button")).toHaveLength(2);
    // Selection is a state, not an action: a static row still reports it.
    expect(screen.getByTestId("static-selected")).toHaveAttribute("aria-current", "true");
  });

  it("treats an item as interactive only when it can be selected or expanded", () => {
    render(
      <Timeline>
        <Timeline.Item icon={<span />} title="Static" data-testid="static" />
        <Timeline.Item icon={<span />} title="Selectable" onSelect={() => {}} data-testid="selectable" />
        <Timeline.Item
          icon={<span />}
          title="Expandable"
          expandable
          onExpandedChange={() => {}}
          data-testid="expandable"
        />
      </Timeline>,
    );

    // A static entry has nothing to click: no button anywhere in it, and its marker is not a hover target.
    expect(screen.getByTestId("static-row").querySelector("button")).not.toBeInTheDocument();
    expect(screen.getByTestId("static-row").querySelector(".markerHit, .markerButton")).not.toBeInTheDocument();
    expect(screen.getByTestId("selectable").tagName).toBe("BUTTON");
    expect(screen.getByRole("button", { name: "Toggle" })).toBeInTheDocument();
  });

  it("selecting an expandable item's header expands it and selects its first child; selecting a child directly leaves the parent expanded", () => {
    function SelectFirstChild() {
      const [expanded, setExpanded] = useState(false);
      const [selected, setSelected] = useState<string | null>(null);
      const children = ["child-1", "child-2"];
      return (
        <Timeline>
          <Timeline.Item
            icon={<span />}
            title="Parent"
            expandable
            expanded={expanded}
            onExpandedChange={setExpanded}
            onSelect={() => {
              setExpanded(true);
              setSelected(children[0]);
            }}
            data-testid="parent"
          >
            {children.map((child) => (
              <Timeline.Row
                key={child}
                selected={child === selected}
                onSelect={() => setSelected(child)}
                data-testid={child}
              >
                {child}
              </Timeline.Row>
            ))}
          </Timeline.Item>
        </Timeline>
      );
    }

    render(<SelectFirstChild />);

    expect(screen.getByTestId("parent-expand")).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(screen.getByTestId("parent"));

    expect(screen.getByTestId("parent-expand")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("child-1")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("child-2")).not.toHaveAttribute("aria-current");

    fireEvent.click(screen.getByTestId("child-2"));

    // The parent stays expanded; selecting a child never collapses it.
    expect(screen.getByTestId("parent-expand")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("child-2")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("child-1")).not.toHaveAttribute("aria-current");
  });

  it("makes the marker itself the only expand toggle, and toggling never changes selection", () => {
    const onSelect = jest.fn();
    const onExpandedChange = jest.fn();
    render(
      <Timeline>
        <Timeline.Item
          icon={<span data-testid="ignored-icon" />}
          title="Title"
          expandable
          expanded={false}
          onExpandedChange={onExpandedChange}
          onSelect={onSelect}
          data-testid="group"
        >
          <Timeline.Row>Row</Timeline.Row>
        </Timeline.Item>
      </Timeline>,
    );

    const toggle = screen.getByRole("button", { name: "Toggle" });
    expect(toggle).toBe(screen.getByTestId("group-expand"));
    // The marker is the toggle: no static icon and no second toggle button beside it.
    expect(screen.queryByTestId("ignored-icon")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2); // marker toggle + header
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("keeps the marker toggle's accessible name constant across expanded and collapsed, and keeps static markers non-interactive", () => {
    render(
      <Timeline>
        <Timeline.Item
          icon={<span />}
          title="Open"
          expandable
          expanded
          expandLabel="Details for Open"
          onExpandedChange={() => {}}
          data-testid="a"
        >
          <span>child</span>
        </Timeline.Item>
        <Timeline.Item icon={<span />} title="Static" data-testid="b" />
      </Timeline>,
    );

    const toggle = screen.getByRole("button", { name: "Details for Open" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls");
    expect(screen.queryByTestId("b-expand")).not.toBeInTheDocument();
  });

  it("keeps trailing actions in the DOM so they stay reachable by keyboard and touch, forced visible on request", () => {
    render(
      <Timeline>
        <Timeline.Item
          icon={<span />}
          title="Title"
          actions={<button data-testid="kebab">Actions</button>}
          actionsForceVisible
          data-testid="item"
        />
      </Timeline>,
    );

    // Hover/focus reveal is CSS-driven (opacity/pointer-events), never `display: none`.
    expect(screen.getByTestId("item-actions")).toBeInTheDocument();
    expect(screen.getByTestId("kebab")).toBeInTheDocument();
  });

  it("renders Timeline.Row actions beside the row, not inside its button", () => {
    render(
      <Timeline.Row actions={<button data-testid="kebab">Actions</button>} actionsForceVisible data-testid="row">
        Label
      </Timeline.Row>,
    );

    expect(screen.getByTestId("row-actions")).toContainElement(screen.getByTestId("kebab"));
    expect(screen.getByTestId("row")).not.toContainElement(screen.getByTestId("kebab"));
  });

  it("lays every kind of entry out from the list's shared height variable", () => {
    // jsdom cannot measure, so assert the structure the one `--timeline-item-min-height` rule applies to: all
    // kinds are entries of the same list, and each one's header row / button carries the class that uses it.
    const { container } = render(
      <Timeline data-testid="list">
        <Timeline.Item title="Item" meta="meta" data-testid="item" icon={<span />} />
        <Timeline.Item title="Title only" onSelect={() => {}} data-testid="single" icon={<span />} />
        <Timeline.Skeleton data-testid="skeleton" />
        <Timeline.LoadMore hasMore onLoadMore={() => {}} data-testid="more" />
      </Timeline>,
    );

    const list = screen.getByTestId("list");
    expect(list).toHaveClass("root");
    expect(container.querySelectorAll(":scope > ol > li")).toHaveLength(4);
    for (const id of ["item", "single", "skeleton"]) {
      expect(screen.getByTestId(`${id}-row`)).toBeInTheDocument();
      expect(screen.getByTestId(`${id}-row`).querySelector(".row")).toBeInTheDocument();
    }
    expect(screen.getByTestId("single-row").querySelector(".headerBodySingle")).toBeInTheDocument();
    expect(screen.getByTestId("more-action")).toHaveClass("loadMore");
  });

  describe("Timeline.Skeleton", () => {
    it("renders placeholder entries with markers and connectors but no text, and marks the list busy", () => {
      render(
        <Timeline aria-busy="true" aria-label="Loading entries">
          <Timeline.Skeleton data-testid="a" />
          <Timeline.Skeleton data-testid="b" withMeta={false} />
        </Timeline>,
      );

      const list = screen.getByRole("list", { name: "Loading entries" });
      expect(list).toHaveAttribute("aria-busy", "true");
      const [first, second] = screen.getAllByRole("listitem");
      expect(first.textContent).toBe("");
      // A marker, a title line and a meta line, then the same connector as any entry; the last has none.
      expect(first.querySelectorAll("[data-slot='skeleton']")).toHaveLength(3);
      expect(second.querySelectorAll("[data-slot='skeleton']")).toHaveLength(2);
      expect(first.querySelector(".connectorBelow")).toBeInTheDocument();
      expect(second.querySelector(".connectorBelow")).not.toBeInTheDocument();
      expect(first).toHaveClass("itemSpaced");
    });
  });

  describe("Timeline.LoadMore", () => {
    it("renders the action with a generic default label and the caller's caption", () => {
      const onLoadMore = jest.fn();
      render(<Timeline.LoadMore hasMore onLoadMore={onLoadMore} caption="Showing 1 of 12 items" />);

      expect(screen.getByText("Showing 1 of 12 items")).toBeInTheDocument();
      expect(screen.getByTestId("timeline-load-more-action")).toHaveTextContent("Load more");
      fireEvent.click(screen.getByTestId("timeline-load-more-action"));
      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it("uses the label the caller supplies", () => {
      render(<Timeline.LoadMore hasMore label="Load earlier" onLoadMore={() => {}} />);

      expect(screen.getByTestId("timeline-load-more-action")).toHaveTextContent("Load earlier");
    });

    it("is a single button holding the label and caption, busy and disabled while loading", () => {
      render(<Timeline.LoadMore hasMore isLoadingMore caption="Showing 1 of 12 items" onLoadMore={() => {}} />);

      const action = screen.getByTestId("timeline-load-more-action");
      expect(action).toBeDisabled();
      expect(action).toHaveAttribute("aria-busy", "true");
      expect(screen.getAllByRole("button")).toHaveLength(1);
      expect(action).toHaveTextContent("Load more");
      expect(action).toHaveTextContent("Showing 1 of 12 items");
    });

    it("renders nothing once exhausted", () => {
      render(<Timeline.LoadMore hasMore={false} onLoadMore={() => {}} />);

      expect(screen.queryByTestId("timeline-load-more")).not.toBeInTheDocument();
    });
  });
});
