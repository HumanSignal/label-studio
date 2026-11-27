import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { TableContext } from "../TableContext";
import { TableHead } from "./TableHead";

// jsdom has no layout: give the header a viewport rect and every draggable header cell a fixed layout box.
// Three 100px columns starting at x=50 in the viewport; the header itself starts at x=20. Cells are measured with
// offsetLeft/offsetWidth (relative to the header) for the drop target and with getBoundingClientRect (viewport) by
// dnd-kit and the keyboard handling.
const HEADER_LEFT = 20;
const COLUMN_RECTS = {
  a: { left: 50, right: 150 },
  b: { left: 150, right: 250 },
  c: { left: 250, right: 350 },
};

const makeColumns = () =>
  Object.keys(COLUMN_RECTS).map((id) => ({
    id,
    title: `Column ${id}`,
    Header: () => <span>{`Column ${id}`}</span>,
  }));

const rect = ({ left, right }) => ({ left, right, top: 0, bottom: 40, width: right - left, height: 40, x: left, y: 0 });

// jsdom has no PointerEvent: a MouseEvent with the pointer event name carries the coordinates dnd-kit reads.
const pointer = (type, target, { clientX = 0, clientY = 10 } = {}) => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY, button: 0 });

  Object.defineProperty(event, "isPrimary", { value: true });
  fireEvent(target, event);
  return event;
};

const renderHead = (props = {}) => {
  const ref = createRef();
  const onDragEnd = mock(() => {});
  const result = render(
    <TableContext.Provider value={{ columns: makeColumns(), headerRenderers: {}, cellViews: {} }}>
      <TableHead ref={ref} onDragEnd={onDragEnd} {...props} />
    </TableContext.Provider>,
  );

  ref.current.getBoundingClientRect = () => rect({ left: HEADER_LEFT, right: 500 });
  const cells = Object.fromEntries(
    Object.keys(COLUMN_RECTS).map((id) => {
      const cell = screen.getByText(`Column ${id}`).closest("[data-draggable]");
      const { left, right } = COLUMN_RECTS[id];

      Object.defineProperty(cell, "offsetLeft", { value: left - HEADER_LEFT, configurable: true });
      Object.defineProperty(cell, "offsetWidth", { value: right - left, configurable: true });
      cell.getBoundingClientRect = () => rect({ left, right });
      return [id, cell];
    }),
  );

  return { ref, onDragEnd, cells, header: ref.current, ...result };
};

// Pointer drag: press on the cell, move past the 4px activation distance (starts the drag), then move to each point.
const startPointerDrag = (cell, from = { clientX: 60 }) => {
  pointer("pointerdown", cell, from);
  pointer("pointermove", document, { ...from, clientX: from.clientX + 10 });
};
const moveTo = (point) => pointer("pointermove", document, point);
const release = (point) => pointer("pointerup", document, point);

const placeholder = () => screen.queryByTestId("column-drop-placeholder");
const gripOf = (id) => screen.getByText(`Column ${id}`).closest("[data-draggable]").querySelector("button");
const pressKey = (target, code) => fireEvent.keyDown(target, { code, key: code });
// dnd-kit's keyboard sensor starts listening for the arrow keys one tick after the pick-up key.
const pickUp = async (handle, code = "Space") => {
  handle.focus();
  pressKey(handle, code);
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe("TableHead column drag and drop (FIT-3307)", () => {
  describe("pointer", () => {
    it("shows no placeholder before a drag starts", () => {
      renderHead();
      expect(placeholder()).toBeNull();
    });

    it("does not start a drag for a plain click or a tiny movement (the column menu must keep working)", () => {
      const { cells } = renderHead();

      pointer("pointerdown", cells.a, { clientX: 60 });
      pointer("pointermove", document, { clientX: 62 });
      expect(cells.a.hasAttribute("data-dragging")).toBe(false);
      expect(placeholder()).toBeNull();

      release({ clientX: 62 });
      expect(cells.a.hasAttribute("data-dragging")).toBe(false);
    });

    it("does not start a drag from the column resize handle", () => {
      const { cells } = renderHead();
      const resizeHandle = document.createElement("div");

      resizeHandle.setAttribute("data-resizer-handle", "");
      cells.a.appendChild(resizeHandle);

      pointer("pointerdown", resizeHandle, { clientX: 140 });
      pointer("pointermove", document, { clientX: 170 });
      moveTo({ clientX: 200 });

      expect(cells.a.hasAttribute("data-dragging")).toBe(false);
      expect(placeholder()).toBeNull();
    });

    it("shows a placeholder in the gap nearest to the pointer", () => {
      const { cells } = renderHead();

      startPointerDrag(cells.a);
      moveTo({ clientX: 190 });

      // Column centres are at x=100/200/300; 190 is left of b's centre, so the gap between a and b (x=150 in the
      // viewport) is the nearest, relative to the header: 150 - 20.
      expect(placeholder()).not.toBeNull();
      expect(placeholder().style.transform).toBe(`translateX(${150 - HEADER_LEFT}px)`);
    });

    it("follows the pointer and can be shown before the first and after the last column", () => {
      const { cells } = renderHead();

      startPointerDrag(cells.b, { clientX: 160 });
      moveTo({ clientX: 55 });
      expect(placeholder().style.transform).toBe(`translateX(${50 - HEADER_LEFT}px)`);

      moveTo({ clientX: 490 });
      expect(placeholder().style.transform).toBe(`translateX(${350 - HEADER_LEFT}px)`);
    });

    it("flags the first gap, which has no column resize handle in front of it, so the bar can sit on the edge", () => {
      const { cells } = renderHead();

      startPointerDrag(cells.b, { clientX: 160 });
      moveTo({ clientX: 55 });
      expect(placeholder().getAttribute("data-first-gap")).toBe("true");

      moveTo({ clientX: 190 });
      expect(placeholder().hasAttribute("data-first-gap")).toBe(false);
    });

    it("does not shift the columns: the placeholder is an out-of-flow overlay", () => {
      const { cells, header } = renderHead();
      const cellsBefore = [...header.querySelectorAll("[data-draggable]")];
      const stylesBefore = cellsBefore.map((el) => el.getAttribute("style"));

      startPointerDrag(cells.a);
      moveTo({ clientX: 190 });

      const overlay = placeholder();

      expect(overlay.style.position).toBe("absolute");
      expect(overlay.style.pointerEvents).toBe("none");
      expect(overlay.getAttribute("aria-hidden")).toBe("true");

      // Same column elements, same order, no inline layout styles added to any of them.
      const cellsAfter = [...header.querySelectorAll("[data-draggable]")];

      expect(cellsAfter).toEqual(cellsBefore);
      cellsAfter.forEach((el, index) => {
        expect(el.style.width).toBe("");
        expect(el.style.margin).toBe("");
        expect(el.getAttribute("style")).toBe(stylesBefore[index]);
      });
    });

    it("reorders on drop exactly where the placeholder was shown", () => {
      const { cells, onDragEnd } = renderHead();

      startPointerDrag(cells.a);
      moveTo({ clientX: 310 }); // gap after c
      release({ clientX: 310 });

      expect(onDragEnd).toHaveBeenCalledTimes(1);
      expect(onDragEnd).toHaveBeenCalledWith({ b: 0, c: 1, a: 2 });
      expect(placeholder()).toBeNull();
    });

    it("drops past the last column at the end instead of before the last one", () => {
      const { cells, onDragEnd } = renderHead();

      startPointerDrag(cells.a);
      moveTo({ clientX: 490 });
      release({ clientX: 490 });

      expect(onDragEnd).toHaveBeenCalledWith({ b: 0, c: 1, a: 2 });
    });

    it("moves a column to the start and to the middle", () => {
      const first = renderHead();

      startPointerDrag(first.cells.c, { clientX: 260 });
      moveTo({ clientX: 55 });
      release({ clientX: 55 });
      expect(first.onDragEnd).toHaveBeenCalledWith({ c: 0, a: 1, b: 2 });

      first.unmount();

      const second = renderHead();

      startPointerDrag(second.cells.c, { clientX: 260 });
      moveTo({ clientX: 180 }); // left of b's centre: the gap between a and b
      release({ clientX: 180 });
      expect(second.onDragEnd).toHaveBeenCalledWith({ a: 0, c: 1, b: 2 });
    });

    it("does not report a change when the column is dropped back where it was", () => {
      const { cells, onDragEnd } = renderHead();

      startPointerDrag(cells.b, { clientX: 160 });
      moveTo({ clientX: 170 }); // gap right after b itself
      release({ clientX: 170 });

      expect(onDragEnd).not.toHaveBeenCalled();
      expect(placeholder()).toBeNull();
    });

    it("cancels without changing the order on Escape", () => {
      const { cells, onDragEnd } = renderHead();

      startPointerDrag(cells.a);
      moveTo({ clientX: 310 });
      expect(placeholder()).not.toBeNull();

      pressKey(document, "Escape");
      release({ clientX: 310 });

      expect(onDragEnd).not.toHaveBeenCalled();
      expect(placeholder()).toBeNull();
      expect(cells.a.hasAttribute("data-dragging")).toBe(false);
    });

    it("keeps tracking the pointer some distance above or below the header and accepts the drop there", () => {
      const { cells, onDragEnd } = renderHead();

      startPointerDrag(cells.a);
      // Header spans y 0..40; the pointer is 100px below it and then 60px above it (not over the header at all).
      moveTo({ clientX: 190, clientY: 140 });
      expect(placeholder()).not.toBeNull();
      expect(placeholder().style.transform).toBe(`translateX(${150 - HEADER_LEFT}px)`);

      moveTo({ clientX: 310, clientY: -60 });
      expect(placeholder().style.transform).toBe(`translateX(${350 - HEADER_LEFT}px)`);

      release({ clientX: 310, clientY: -60 });
      expect(onDragEnd).toHaveBeenCalledWith({ b: 0, c: 1, a: 2 });
    });

    it("hides the placeholder and ignores the drop when the pointer is far from the header", () => {
      const { cells, onDragEnd } = renderHead();

      startPointerDrag(cells.a);
      moveTo({ clientX: 190, clientY: 100 });
      expect(placeholder()).not.toBeNull();

      moveTo({ clientX: 190, clientY: 2000 });
      expect(placeholder()).toBeNull();

      release({ clientX: 190, clientY: 2000 });
      expect(onDragEnd).not.toHaveBeenCalled();
    });

    it("ignores pointers beside the header horizontally", () => {
      const { cells, onDragEnd } = renderHead();

      startPointerDrag(cells.a);
      moveTo({ clientX: 900, clientY: 60 });
      expect(placeholder()).toBeNull();

      release({ clientX: 900, clientY: 60 });
      expect(onDragEnd).not.toHaveBeenCalled();
    });

    it("does nothing when interactions are stopped (locked tab)", () => {
      const { cells, onDragEnd } = renderHead({ stopInteractions: true });

      expect(cells.a.getAttribute("data-draggable")).toBe("false");

      pointer("pointerdown", cells.a, { clientX: 60 });
      pointer("pointermove", document, { clientX: 100 });
      moveTo({ clientX: 310 });
      release({ clientX: 310 });

      expect(placeholder()).toBeNull();
      expect(cells.a.hasAttribute("data-dragging")).toBe(false);
      expect(onDragEnd).not.toHaveBeenCalled();
    });
  });

  describe("ghost and drag image", () => {
    it("leaves a ghost of the dragged column in place while dragging, and removes it afterwards", () => {
      const { cells } = renderHead();

      expect(cells.a.hasAttribute("data-dragging")).toBe(false);

      startPointerDrag(cells.a);
      moveTo({ clientX: 190 });

      // Only the dragged column is marked (styled as a transparent ghost), and it is not moved or collapsed.
      expect(cells.a.getAttribute("data-dragging")).toBe("true");
      expect(cells.b.hasAttribute("data-dragging")).toBe(false);
      expect(cells.a.style.transform).toBe("");

      release({ clientX: 190 });
      expect(cells.a.hasAttribute("data-dragging")).toBe(false);
    });

    it("renders a copy of the dragged column that follows the pointer, only while dragging", async () => {
      const { cells } = renderHead();

      expect(screen.getAllByText("Column a")).toHaveLength(1);

      startPointerDrag(cells.a);
      moveTo({ clientX: 190 });

      const copies = screen.getAllByText("Column a");

      expect(copies).toHaveLength(2);
      expect(copies.some((copy) => copy.closest('[class*="drag-image"]'))).toBe(true);
      // The copy lives in a portal on <body>, not inside the header.
      expect(copies.find((copy) => copy.closest('[class*="drag-image"]')).closest("[data-draggable]")).toBeNull();

      release({ clientX: 190 });
      // dnd-kit unmounts the overlay content one microtask after the drop.
      await waitFor(() => expect(screen.getAllByText("Column a")).toHaveLength(1));
    });

    it("shows the closed-hand cursor everywhere while dragging (document attribute used by the CSS)", () => {
      const { cells } = renderHead();

      expect(document.documentElement.hasAttribute("data-column-dragging")).toBe(false);

      startPointerDrag(cells.a);
      expect(document.documentElement.getAttribute("data-column-dragging")).toBe("true");

      release({ clientX: 70 });
      expect(document.documentElement.hasAttribute("data-column-dragging")).toBe(false);
    });

    it("clears the cursor attribute when the header unmounts mid-drag", () => {
      const { cells, unmount } = renderHead();

      startPointerDrag(cells.a);
      expect(document.documentElement.hasAttribute("data-column-dragging")).toBe(true);

      unmount();
      expect(document.documentElement.hasAttribute("data-column-dragging")).toBe(false);
    });
  });

  describe("keyboard", () => {
    it("offsets the dragged copy down by one header row during a keyboard drag only", async () => {
      const { cells } = renderHead();
      const handle = gripOf("a");
      const overlay = () => document.querySelector('[class*="drag-image"]')?.parentElement;

      await pickUp(handle);
      expect(overlay().style.marginTop).toBe("40px");
      pressKey(handle, "Escape");
      await waitFor(() => expect(overlay()).toBeUndefined());

      startPointerDrag(cells.a);
      expect(overlay().style.marginTop).toBe("");
      release({ clientX: 70 });
    });

    it("snaps the dragged copy to the placeholder: right edge when moving right, left edge when moving left", async () => {
      window.innerWidth = 1000;
      const { cells } = renderHead();
      const handle = gripOf("b");
      const shift = () => {
        const wrapper = document.querySelector('[class*="drag-image"]').parentElement;
        const match = /translate3d\((-?[\d.]+)px/.exec(wrapper.style.transform ?? "");

        return match ? Number(match[1]) : null;
      };

      await pickUp(handle);
      pressKey(handle, "ArrowRight"); // placeholder between b and c... gap after c: x = 330 (viewport 350)
      await waitFor(() => expect(placeholder()).not.toBeNull());
      // Right edge on the placeholder (350): left = 250, cell b starts at 150, so shift 100.
      await waitFor(() => expect(shift()).toBe(100));

      pressKey(handle, "ArrowLeft"); // back to b's own gap, then further left
      pressKey(handle, "ArrowLeft"); // gap before b... gap index 0 at x=50
      // Left edge on the placeholder gap before a (viewport 50): shift -100.
      await waitFor(() => expect(shift()).toBe(-100));
      expect(cells.b).not.toBeNull();
    });

    it("keeps focus on the moved column's grip after a keyboard move", async () => {
      const { onDragEnd } = renderHead();
      const handle = gripOf("a");

      await pickUp(handle);
      pressKey(handle, "ArrowRight");
      pressKey(handle, "Space");
      expect(onDragEnd).toHaveBeenCalledTimes(1);

      await waitFor(() => expect(document.activeElement).toBe(gripOf("a")));
    });

    it("moves one column per key press, even past very narrow columns", async () => {
      const widths = { a: 100, b: 2, c: 3, d: 100 };
      const ids = Object.keys(widths);
      const columns = ids.map((id) => ({ id, title: `Column ${id}`, Header: () => <span>{`Column ${id}`}</span> }));
      const ref = createRef();
      const onDragEnd = mock(() => {});

      render(
        <TableContext.Provider value={{ columns, headerRenderers: {}, cellViews: {} }}>
          <TableHead ref={ref} onDragEnd={onDragEnd} />
        </TableContext.Provider>,
      );
      ref.current.getBoundingClientRect = () => rect({ left: 0, right: 205 });
      let left = 0;

      ids.forEach((id) => {
        const cell = screen.getByText(`Column ${id}`).closest("[data-draggable]");
        const start = left;

        left += widths[id];
        Object.defineProperty(cell, "offsetLeft", { value: start, configurable: true });
        Object.defineProperty(cell, "offsetWidth", { value: widths[id], configurable: true });
        cell.getBoundingClientRect = () => rect({ left: start, right: start + widths[id] });
      });

      const handle = gripOf("a");

      await pickUp(handle);
      pressKey(handle, "ArrowRight"); // after b
      pressKey(handle, "ArrowRight"); // after c
      pressKey(handle, "ArrowLeft"); // back to after b
      pressKey(handle, "ArrowRight"); // after c
      pressKey(handle, "Space");

      expect(onDragEnd.mock.calls[0][0]).toEqual({ b: 0, c: 1, a: 2, d: 3 });
    });

    it("does not skip a column when the table scrolls during a keyboard move", async () => {
      // Five 100px columns in a 300px horizontal scroll container. The scroll container's scrollTo moves the rects.
      const ids = ["a", "b", "c", "d", "e"];
      const columns = ids.map((id) => ({ id, title: `Column ${id}`, Header: () => <span>{`Column ${id}`}</span> }));
      const ref = createRef();
      const onDragEnd = mock(() => {});
      const { container } = render(
        <div data-testid="scroller" style={{ overflowX: "auto", width: 300 }}>
          <TableContext.Provider value={{ columns, headerRenderers: {}, cellViews: {} }}>
            <TableHead ref={ref} onDragEnd={onDragEnd} />
          </TableContext.Provider>
        </div>,
      );
      const scroller = container.firstChild;
      let scrollLeft = 0;

      Object.defineProperty(scroller, "scrollLeft", { get: () => scrollLeft, set: (v) => (scrollLeft = v) });
      Object.defineProperty(scroller, "scrollWidth", { value: 500 });
      Object.defineProperty(scroller, "clientWidth", { value: 300 });
      Object.defineProperty(scroller, "scrollHeight", { value: 40 });
      Object.defineProperty(scroller, "clientHeight", { value: 40 });
      scroller.getBoundingClientRect = () => rect({ left: 0, right: 300 });
      scroller.scrollTo = ({ left }) => {
        scrollLeft = Math.max(0, Math.min(200, left ?? scrollLeft));
        fireEvent.scroll(scroller);
      };
      ref.current.getBoundingClientRect = () => rect({ left: -scrollLeft, right: 500 - scrollLeft });
      ids.forEach((id, index) => {
        const cell = screen.getByText(`Column ${id}`).closest("[data-draggable]");

        Object.defineProperty(cell, "offsetLeft", { value: index * 100, configurable: true });
        Object.defineProperty(cell, "offsetWidth", { value: 100, configurable: true });
        cell.getBoundingClientRect = () =>
          rect({ left: index * 100 - scrollLeft, right: index * 100 + 100 - scrollLeft });
      });

      const handle = gripOf("a");

      await pickUp(handle);
      for (let i = 0; i < 3; i++) {
        pressKey(handle, "ArrowRight");
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      pressKey(handle, "Space");

      expect(onDragEnd).toHaveBeenCalledTimes(1);
      // a moved after c... one press per neighbour: b, c, d, so a ends up between d and e.
      expect(onDragEnd.mock.calls[0][0]).toEqual({ b: 0, c: 1, d: 2, a: 3, e: 4 });
    });

    it("renders a focusable drag handle with an accessible name on every column", () => {
      renderHead();

      const handles = screen.getAllByTestId("column-drag-handle");

      expect(handles).toHaveLength(3);
      expect(handles[0].tagName).toBe("BUTTON");
      expect(handles[0].getAttribute("aria-label")).toBe("Reorder column Column a");
      expect(handles[0].getAttribute("tabindex")).toBe("0");
    });

    it("renders no drag handle when interactions are stopped (e.g. locked tab)", () => {
      renderHead({ stopInteractions: true });

      expect(screen.queryAllByTestId("column-drag-handle")).toHaveLength(0);
    });

    it("moves a column with space, the arrow keys and space, and reports the new order", async () => {
      const { cells, onDragEnd } = renderHead();
      const handle = gripOf("a");

      await pickUp(handle); // pick up
      expect(cells.a.getAttribute("data-dragging")).toBe("true");

      pressKey(handle, "ArrowRight"); // after b
      expect(placeholder().style.transform).toBe(`translateX(${250 - HEADER_LEFT}px)`);

      pressKey(handle, "ArrowRight"); // after c (the end)
      expect(placeholder().style.transform).toBe(`translateX(${350 - HEADER_LEFT}px)`);

      pressKey(handle, "Space"); // drop

      expect(onDragEnd).toHaveBeenCalledTimes(1);
      expect(onDragEnd).toHaveBeenCalledWith({ b: 0, c: 1, a: 2 });
      expect(placeholder()).toBeNull();
      expect(cells.a.hasAttribute("data-dragging")).toBe(false);
    });

    it("moves a column to the left with the left arrow, and can use enter to pick up and drop", async () => {
      const { onDragEnd } = renderHead();
      const handle = gripOf("c");

      await pickUp(handle, "Enter");
      pressKey(handle, "ArrowLeft"); // before b
      expect(placeholder().style.transform).toBe(`translateX(${150 - HEADER_LEFT}px)`);

      pressKey(handle, "Enter");

      expect(onDragEnd).toHaveBeenCalledWith({ a: 0, c: 1, b: 2 });
    });

    it("stays put at the edges", async () => {
      const { onDragEnd } = renderHead();
      const handle = gripOf("a");

      await pickUp(handle);
      pressKey(handle, "ArrowLeft"); // already first
      pressKey(handle, "Space");

      expect(onDragEnd).not.toHaveBeenCalled();
    });

    it("cancels with escape and leaves the order unchanged", async () => {
      const { cells, onDragEnd } = renderHead();
      const handle = gripOf("a");

      await pickUp(handle);
      pressKey(handle, "ArrowRight");
      expect(placeholder()).not.toBeNull();

      pressKey(document, "Escape");

      expect(onDragEnd).not.toHaveBeenCalled();
      expect(placeholder()).toBeNull();
      expect(cells.a.hasAttribute("data-dragging")).toBe(false);
    });

    it("announces the move to screen readers", async () => {
      renderHead();
      const handle = gripOf("a");

      await pickUp(handle);
      expect(screen.getByText("Picked up column Column a, position 1 of 3.")).not.toBeNull();

      pressKey(handle, "ArrowRight");
      expect(screen.getByText("Column Column a, position 2 of 3.")).not.toBeNull();

      pressKey(handle, "Space");
      expect(screen.getByText("Column Column a dropped at position 2 of 3.")).not.toBeNull();
    });

    it("explains the keyboard controls to screen reader users", () => {
      renderHead();

      expect(screen.getByText(/press space or enter/i)).not.toBeNull();
      expect(gripOf("a").getAttribute("aria-describedby")).toBeTruthy();
    });
  });
});
