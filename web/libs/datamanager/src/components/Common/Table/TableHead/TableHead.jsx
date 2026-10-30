import { observer, useLocalStore } from "mobx-react";
import { toJS } from "mobx";
import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ViewColumnType, ViewColumnTypeName, ViewColumnTypeShort } from "../../../../stores/Tabs/tab_column";
import { Button, Dropdown, Tooltip } from "@humansignal/ui";
import { Menu } from "../../Menu/Menu";
import { Resizer } from "../../Resizer/Resizer";
import { Space } from "../../Space/Space";
import { Badge } from "@humansignal/ui";
import { TableCell, TableCellContent } from "../TableCell/TableCell";
import { TableContext, tableCN } from "../TableContext";
import { cn } from "../../../../utils/bem";
import { getStyle } from "../utils";
import "./TableHead.prefix.css";
import "../../Resizer/columnSeparator.prefix.css";
import { getColumnDropTarget, reorderColumnIds } from "./columnDrop";
import { getRoot } from "mobx-state-tree";
import { Agreement } from "../../../CellViews/Agreement/Agreement";
import { AgreementSelected } from "../../../CellViews/AgreementSelected";
import { DotsSixVerticalIcon, IconChevronDown } from "@humansignal/icons";
import { isActive, FF_UTC_428_CONSENSUS_CONTROL_TAG_AGREEMENT } from "@humansignal/core/lib/utils/feature-flags";
import { isStarterCloudPlan } from "@humansignal/core";

const tableHeadCN = cn("table-head");

const DropdownWrapper = observer(({ column, cellViews, children, onChange, disabled, disabledTooltip }) => {
  const types = ViewColumnType._types
    .map((t) => t.value)
    .filter((t) => {
      const cellView = cellViews[t];

      const selectable = cellView?.userSelectable !== false;
      const displayType = cellView?.displayType !== false;

      return cellView && selectable && displayType;
    });

  if (disabled) {
    return (
      <Tooltip title={disabledTooltip}>
        <Button look="string" variant="neutral" size="small" disabled>
          {children}
        </Button>
      </Tooltip>
    );
  }

  return (
    <Dropdown.Trigger
      content={
        <Menu title="Display as" size="compact" selectedKeys={[column.currentType]}>
          {types.map((type) => {
            return (
              <Menu.Item key={type} onClick={() => onChange?.(column, type)}>
                <Space>
                  <Badge size="small">{ViewColumnTypeShort(type)}</Badge>
                  {ViewColumnTypeName(type)}
                </Space>
              </Menu.Item>
            );
          })}
        </Menu>
      }
    >
      <Button look="string" variant="neutral" size="small">
        {children}
      </Button>
    </Dropdown.Trigger>
  );
});

const AgreementWrapper = observer(({ column, children }) => {
  const root = getRoot(column.original);
  const selectedView = root.viewsStore.selected;
  const agreementFilters = selectedView.agreement_selected;
  const onSave = (filters) => {
    if (selectedView?.isLockedByManager) return selectedView.notifyLocked();
    selectedView.setAgreementFilters(filters);
    return selectedView.save();
  };

  return (
    <Agreement.HeaderCell
      agreementFilters={agreementFilters}
      onSave={onSave}
      disabled={selectedView?.isLockedByManager}
      disabledTooltip={selectedView?.lockedUpdateMessage}
    >
      {children}
    </Agreement.HeaderCell>
  );
});

const AgreementSelectedWrapper = observer(({ column, children }) => {
  // TODO: make this more generic as a LSE component table header cell
  const root = getRoot(column.original);
  const selectedView = root.viewsStore.selected;
  const agreementFilters = selectedView.agreement_selected;
  const ref = useRef(null);
  const isLocked = selectedView?.isLockedByManager;

  if (isStarterCloudPlan()) {
    return (
      <Agreement.HeaderCell agreementFilters={agreementFilters} onSave={() => {}}>
        {children}
      </Agreement.HeaderCell>
    );
  }

  const closeHandler = () => {
    ref.current?.close();
  };

  const onSave = (agreementFilters) => {
    if (isLocked) return selectedView.notifyLocked();
    selectedView.setAgreementFilters(agreementFilters);
    closeHandler();
    return selectedView.save();
  };

  const triggerButton = (
    <Button
      look="outlined"
      variant="neutral"
      size="small"
      trailing={<IconChevronDown />}
      align="left"
      disabled={isLocked}
      style={{
        minWidth: 200,
        paddingLeft: "0.5rem",
        flexGrow: 1,
        width: "100%",
      }}
    >
      {children}
    </Button>
  );

  if (isLocked) {
    return <Tooltip title={selectedView.lockedUpdateMessage}>{triggerButton}</Tooltip>;
  }

  return (
    <Dropdown.Trigger
      ref={ref}
      content={
        <AgreementSelected.HeaderCell
          agreementFilters={agreementFilters}
          onSave={onSave}
          align="left"
          onClose={closeHandler}
        />
      }
    >
      {triggerButton}
    </Dropdown.Trigger>
  );
});

const ColumnRenderer = observer(
  ({
    column: columnInput,
    cellViews,
    columnHeaderExtra,
    sortingEnabled,
    stopInteractions,
    decoration,
    onTypeChange,
    onResize,
    onReset,
  }) => {
    const { Header, Cell: _, id, ...column } = columnInput;

    if (Header instanceof Function) {
      const { cellClassName: _, headerClassName, ...rest } = column;

      return (
        <div {...rest} className={tableCN.elem("cell").mix(["th", headerClassName]).toClassName()} key={id}>
          <Header />
        </div>
      );
    }

    const root = getRoot(column.original);
    const isDE = root.SDK.type === "DE";
    const selectedView = root.viewsStore.selected;
    const isTabLocked = selectedView?.isLockedByManager;
    const lockedTooltip = selectedView?.lockedUpdateMessage;
    const canOrder = sortingEnabled && column.original?.canOrder;
    const Decoration = decoration?.get?.(column);
    const extra = !isDE && columnHeaderExtra ? columnHeaderExtra(column, Decoration) : null;
    const content = Decoration?.content ? Decoration.content(column) : column.title;
    const style = getStyle(cellViews, column, Decoration);
    const isAgreementV2Enabled =
      root.project?.is_dimensions_enabled ?? isActive(FF_UTC_428_CONSENSUS_CONTROL_TAG_AGREEMENT);

    const isAgreementColumn =
      isAgreementV2Enabled &&
      (column.original?.alias === "agreement" ||
        (typeof column.original?.alias === "string" && column.original.alias.startsWith("dimension_agreement_")));

    const isAgreementSelected = !isAgreementV2Enabled && column.type === "AgreementSelected";

    const headContent = (
      <>
        <TableCellContent mod={{ canOrder, disabled: stopInteractions }} mix="th-content">
          {content}
        </TableCellContent>

        {extra && <span className={tableHeadCN.elem("column-extra").toClassName()}>{extra}</span>}
      </>
    );

    return (
      <TableCell data-id={id} mix="th">
        <Resizer
          variant="column"
          style={{
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: style.justifyContent ?? "space-between",
            overflow: isAgreementSelected || isAgreementColumn ? "visible" : "hidden",
          }}
          initialWidth={style.width ?? 150}
          minWidth={style.minWidth ?? 30}
          onResizeFinished={(width) => onResize?.(column, width)}
          onReset={() => onReset?.(column)}
        >
          {!isDE && column.parent && !isAgreementColumn && !isAgreementSelected ? (
            <DropdownWrapper
              column={column}
              cellViews={cellViews}
              onChange={onTypeChange}
              disabled={isTabLocked}
              disabledTooltip={lockedTooltip}
            >
              {headContent}
            </DropdownWrapper>
          ) : isAgreementSelected ? (
            <AgreementSelectedWrapper column={column}>{headContent}</AgreementSelectedWrapper>
          ) : isAgreementColumn ? (
            <AgreementWrapper column={column}>{headContent}</AgreementWrapper>
          ) : (
            headContent
          )}
        </Resizer>
      </TableCell>
    );
  },
);

// While a column is dragged, the drop target keeps following the pointer up to this many px above/below the header,
// so the user does not have to stay on the 40px header strip.
// Above the app's sticky menu bar (2000), so the dragged copy is never covered.
const DRAG_OVERLAY_Z_INDEX = 2100;
const DRAG_VERTICAL_TOLERANCE = 160;

// Set on <html> while a column is dragged so the CSS can show the closed-hand cursor everywhere and block text selection.
const DRAGGING_ATTRIBUTE = "data-column-dragging";

const SCREEN_READER_INSTRUCTIONS =
  "To reorder this column, press space or enter. While reordering, use the left and right arrow keys to move it, then press space or enter to drop it, or escape to cancel.";

const getColumnLabel = (column) => (typeof column?.title === "string" && column.title ? column.title : "column");

// Position of a keyboard drag, in viewport coordinates. There is no pointer, so the centre of the moved column (its
// cell, which stays in place while dragging) plus the drag delta is used instead.
const getDragPointer = ({ delta }, cell) => {
  const rect = cell?.getBoundingClientRect();

  return rect ? { x: rect.left + rect.width / 2 + delta.x, y: rect.top + rect.height / 2 + delta.y } : null;
};

// One header cell. The whole cell starts a pointer drag (after a few px of movement, so clicks and the column menu
// still work); the grip button is the keyboard activator (space/enter, then arrows).
const DraggableHeaderCell = ({ columnId, label, disabled, isGhost, cellRefs, children }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef } = useDraggable({ id: columnId, disabled });
  const setRefs = useCallback(
    (element) => {
      setNodeRef(element);
      cellRefs.current[columnId] = element;
    },
    [setNodeRef, cellRefs, columnId],
  );

  return (
    <span
      ref={setRefs}
      className={tableHeadCN.elem("draggable").toClassName()}
      data-draggable={disabled ? "false" : "true"}
      // The dragged column stays in place as a transparent ghost (styled in the CSS).
      data-dragging={isGhost ? "true" : undefined}
      onPointerDown={(event) => {
        // The resize handle has its own pointer drag.
        if (disabled || event.target.closest?.("[data-resizer-handle]")) return;
        listeners?.onPointerDown?.(event);
      }}
    >
      {!disabled && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          onKeyDown={listeners?.onKeyDown}
          data-testid="column-drag-handle"
          aria-label={`Reorder column ${label}`}
          className={tableHeadCN.elem("drag-handle").toClassName()}
        >
          <DotsSixVerticalIcon aria-hidden="true" />
        </button>
      )}
      {children}
    </span>
  );
};

export const TableHead = observer(
  forwardRef(
    (
      {
        style,
        columnHeaderExtra,
        sortingEnabled,
        stopInteractions,
        decoration,
        onTypeChange,
        onResize,
        onReset,
        extra,
        onDragEnd,
      },
      ref,
    ) => {
      const { columns, headerRenderers, cellViews } = React.useContext(TableContext);
      const states = useLocalStore(() => ({
        orderedColumns: {},
        setOrderedColumns(updatedColumns) {
          states.orderedColumns = { ...updatedColumns };
        },
        getOrderedColumns() {
          return toJS(states.orderedColumns) ?? {};
        },
        isDragging: false,
        setIsDragging(isDragging) {
          states.isDragging = isDragging;
        },
        getIsDragging() {
          return toJS(states.isDragging);
        },
        initialDragPos: false,
        setInitialDragPos(initPos) {
          states.initialDragPos = initPos;
        },
        getInitialDragPos() {
          return toJS(states.initialDragPos);
        },
        draggedCol: null,
        setDraggedCol(draggedCol) {
          states.draggedCol = draggedCol;
        },
        getDraggedCol() {
          return toJS(states.draggedCol);
        },
        // Where the dragged column would be inserted: `{ gapIndex, offset }`, `offset` being the gap's x position
        // relative to the header. Drives the placeholder; null when no drag is hovering the header.
        dropTarget: null,
        setDropTarget(dropTarget) {
          const current = states.dropTarget;

          if (current?.gapIndex === dropTarget?.gapIndex && current?.offset === dropTarget?.offset) return;
          states.dropTarget = dropTarget;
        },
      }));
      const colRefs = useRef({});
      const columnsRef = useRef(columns);
      // Keyboard drag bookkeeping, all header-relative so scrolling cannot make it stale: the dragged column's own centre,
      // where it currently is, the sensor's reference x and the header's viewport x when the drag started.
      const keyboardRef = useRef(null);
      // After a keyboard move the grip of the moved column must keep focus, even if the reorder remounts the header.
      const refocusRef = useRef(null);
      // Keyboard drags show the dragged copy one header row lower, so the columns it would cover stay readable.
      const [isKeyboardDrag, setIsKeyboardDrag] = useState(false);
      // Stops tracking the real pointer (pointer drags only).
      const pointerTrackerRef = useRef(null);
      // Screen reader feedback: the position the dragged column would take after the drop, and the last one announced.
      const positionRef = useRef(null);

      columnsRef.current = columns;

      // Measured with offsetLeft/offsetWidth (layout boxes, relative to the header) rather than client rects, so
      // transforms never affect the result. The pointer is converted to the same header-relative space, so
      // horizontal scroll and page offsets cancel out.
      const getDropTarget = useCallback(
        (clientX) => {
          const header = ref.current;

          if (!header) return null;

          const rects = columns.map((col) => {
            const element = colRefs.current[col.id];

            return element ? { left: element.offsetLeft, right: element.offsetLeft + element.offsetWidth } : null;
          });

          if (rects.some((rect) => rect === null)) return null;

          return getColumnDropTarget(rects, clientX - header.getBoundingClientRect().left);
        },
        [columns, ref],
      );

      // The header strip plus the vertical tolerance above and below it.
      const isInDropZone = useCallback(
        ({ x, y }) => {
          const rect = ref.current?.getBoundingClientRect();

          if (!rect) return false;

          return (
            x >= rect.left &&
            x <= rect.right &&
            y >= rect.top - DRAG_VERTICAL_TOLERANCE &&
            y <= rect.bottom + DRAG_VERTICAL_TOLERANCE
          );
        },
        [ref],
      );

      // Moves the placeholder to the gap nearest to `pointer` (or hides it when the pointer is out of the drop zone).
      const applyPointer = useCallback(
        (pointer, draggedId) => {
          const target = pointer && isInDropZone(pointer) ? getDropTarget(pointer.x) : null;

          states.setDropTarget(target);

          const ids = columnsRef.current.map((col) => col.id);

          positionRef.current = target ? reorderColumnIds(ids, draggedId, target.gapIndex).indexOf(draggedId) : null;
        },
        [states, isInDropZone, getDropTarget],
      );

      const resetDrag = useCallback(() => {
        pointerTrackerRef.current?.();
        pointerTrackerRef.current = null;
        keyboardRef.current = null;
        setIsKeyboardDrag(false);
        document.documentElement.removeAttribute(DRAGGING_ATTRIBUTE);
        states.setDraggedCol(null);
        states.setDropTarget(null);
      }, [states]);

      useEffect(
        () => () => {
          pointerTrackerRef.current?.();
          document.documentElement.removeAttribute(DRAGGING_ATTRIBUTE);
        },
        [],
      );

      const handleDragStart = useCallback(
        ({ active, activatorEvent }) => {
          const ele = colRefs.current[active.id];

          if (ele) states.setInitialDragPos({ x: ele.offsetLeft, y: ele.offsetTop });
          document.documentElement.setAttribute(DRAGGING_ATTRIBUTE, "true");
          states.setDraggedCol(active.id);
          setIsKeyboardDrag(typeof activatorEvent?.clientX !== "number");

          if (typeof activatorEvent?.clientX === "number") {
            // dnd-kit's delta also includes auto-scroll offsets, which would be counted twice against the
            // scrolled header, so pointer drags follow the real pointer (and re-check when the table scrolls).
            let pointer = { x: activatorEvent.clientX, y: activatorEvent.clientY };
            const onMove = (event) => {
              pointer = { x: event.clientX, y: event.clientY };
              applyPointer(pointer, active.id);
            };
            const onScroll = () => applyPointer(pointer, active.id);

            window.addEventListener("pointermove", onMove, true);
            window.addEventListener("scroll", onScroll, true);
            pointerTrackerRef.current = () => {
              window.removeEventListener("pointermove", onMove, true);
              window.removeEventListener("scroll", onScroll, true);
            };
          }
        },
        [states, applyPointer],
      );

      const handleDragMove = useCallback(
        (event) => {
          // Pointer drags are handled by the pointer tracker above.
          if (pointerTrackerRef.current) return;

          applyPointer(getDragPointer(event, colRefs.current[event.active.id]), event.active.id);
        },
        [applyPointer],
      );

      const handleDragEnd = useCallback(() => {
        // Apply exactly what the placeholder was showing.
        const target = toJS(states.dropTarget);
        const draggedCol = states.getDraggedCol();
        const wasKeyboardDrag = keyboardRef.current !== null;

        resetDrag();
        if (!target || draggedCol === null) return;

        const currentIds = columns.map((col) => col.id);
        const nextIds = reorderColumnIds(currentIds, draggedCol, target.gapIndex);

        // Dropped back where it was: nothing to persist, and the view should not become dirty.
        if (nextIds.every((id, index) => id === currentIds[index])) return;

        const updatedColOrder = {};

        nextIds.forEach((id, index) => {
          updatedColOrder[id] = index;
        });
        if (wasKeyboardDrag) refocusRef.current = draggedCol;
        onDragEnd?.(updatedColOrder);
      }, [states, resetDrag, columns, onDragEnd]);

      // Keyboard: left/right arrows move the dragged column by one position. The moved column's centre is placed just
      // past the centre of the neighbouring column, which makes the drop target the gap on that side of it. The sensor
      // wants absolute coordinates and derives the drag delta from the first ones it saw, so the position is kept here
      // instead of being read back from them.
      const getKeyboardCoordinates = useCallback(
        (event, { currentCoordinates, context }) => {
          const direction = event.code === "ArrowRight" ? 1 : event.code === "ArrowLeft" ? -1 : 0;

          if (!direction) return undefined;
          event.preventDefault();

          const dragged = colRefs.current[context.active?.id];
          const header = ref.current;

          if (!dragged || !header) return undefined;

          // Everything is kept header-relative (offsetLeft), so scrolling the table never invalidates it. Only the
          // returned coordinates are viewport based, converted with the header's rect read on every key press.
          const headerLeft = header.getBoundingClientRect().left;

          const elements = columnsRef.current.map((col) => colRefs.current[col.id]);

          if (elements.some((element) => !element)) return undefined;

          // Position based, not distance based: the state is the column index the dragged column is heading for, and
          // each key press moves it by exactly one column, however narrow the neighbours are.
          if (!keyboardRef.current) {
            const from = columnsRef.current.findIndex((col) => col.id === context.active?.id);

            keyboardRef.current = {
              from,
              index: from,
              ownCenter: dragged.offsetLeft + dragged.offsetWidth / 2,
              reference: currentCoordinates.x,
              headerLeft,
            };
          }

          const state = keyboardRef.current;
          const index = state.index + direction;

          if (state.from < 0 || index < 0 || index >= elements.length) return undefined;
          state.index = index;
          state.direction = direction;

          // Aim 1px past the centre of the column at the target position, on the side we are coming from: that makes
          // the drop target the gap on the far side of it. Back at the start position it is the column's own centre.
          const target = elements[index];
          const side = index > state.from ? 1 : index < state.from ? -1 : 0;
          const targetCenter =
            index === state.from ? state.ownCenter : target.offsetLeft + target.offsetWidth / 2 + side;

          return {
            x: state.reference + (headerLeft - state.headerLeft) + (targetCenter - state.ownCenter),
            y: currentCoordinates.y,
          };
        },
        [ref],
      );

      const pointerSensorOptions = useMemo(() => ({ activationConstraint: { distance: 4 } }), []);
      const keyboardSensorOptions = useMemo(
        () => ({ coordinateGetter: getKeyboardCoordinates }),
        [getKeyboardCoordinates],
      );
      const sensors = useSensors(
        useSensor(PointerSensor, pointerSensorOptions),
        useSensor(KeyboardSensor, keyboardSensorOptions),
      );

      const accessibility = useMemo(() => {
        const labelOf = (id) => getColumnLabel(columnsRef.current.find((col) => col.id === id));
        const total = () => columnsRef.current.length;
        const indexOf = (id) => columnsRef.current.findIndex((col) => col.id === id);
        let lastAnnounced = null;

        return {
          screenReaderInstructions: { draggable: SCREEN_READER_INSTRUCTIONS },
          announcements: {
            onDragStart: ({ active }) => {
              lastAnnounced = indexOf(active.id);
              return `Picked up column ${labelOf(active.id)}, position ${lastAnnounced + 1} of ${total()}.`;
            },
            onDragMove: ({ active }) => {
              const position = positionRef.current;

              if (position === null || position === lastAnnounced) return undefined;
              lastAnnounced = position;
              return `Column ${labelOf(active.id)}, position ${position + 1} of ${total()}.`;
            },
            onDragOver: () => undefined,
            onDragEnd: ({ active }) => {
              const position = positionRef.current;

              return position === null
                ? `Column ${labelOf(active.id)} was not moved.`
                : `Column ${labelOf(active.id)} dropped at position ${position + 1} of ${total()}.`;
            },
            onDragCancel: ({ active }) => `Reordering cancelled. Column ${labelOf(active.id)} was not moved.`,
          },
        };
      }, []);

      useEffect(() => {
        ref.current?.addEventListener("mousedown", (event) => {
          const className = event.target.className;

          // This element could be an SVG element where className is an object, not a string.
          if (className?.includes?.("handle")) {
            event.preventDefault();
          }
        });
      }, []);

      // Keyboard drags: the dragged copy snaps to the drop placeholder instead of following the raw keyboard
      // coordinates. Moving right it sits left of the placeholder (its right edge on it), moving left it sits right
      // of it (its left edge on it); it is clamped so it never leaves the screen.
      const snapToPlaceholder = useCallback(
        ({ transform, activeNodeRect }) => {
          const direction = keyboardRef.current?.direction;
          const header = ref.current;

          if (!direction || !header || !states.dropTarget || !activeNodeRect) return transform;

          const placeholderX = header.getBoundingClientRect().left + states.dropTarget.offset;
          const desiredLeft = direction > 0 ? placeholderX - activeNodeRect.width : placeholderX;
          const left = Math.max(0, Math.min(desiredLeft, window.innerWidth - activeNodeRect.width));

          return { ...transform, x: left - activeNodeRect.left };
        },
        [ref, states],
      );
      const overlayModifiers = useMemo(
        () => (isKeyboardDrag ? [snapToPlaceholder] : undefined),
        [isKeyboardDrag, snapToPlaceholder],
      );

      // Runs after every render until the moved column's grip has focus again (the reorder may rebuild the header,
      // and dnd-kit only restores focus to the element it knew about), then gives up shortly after.
      useEffect(() => {
        const id = refocusRef.current;

        if (id === null) return undefined;

        const grip = colRefs.current[id]?.querySelector('[data-testid="column-drag-handle"]');

        if (grip && document.activeElement !== grip) grip.focus();
        const timer = setTimeout(() => {
          if (refocusRef.current === id) refocusRef.current = null;
        }, 300);

        return () => clearTimeout(timer);
      });

      const draggedColumn = columns.find((col) => col.id === states.draggedCol);
      const draggedRect = draggedColumn ? colRefs.current[draggedColumn.id]?.getBoundingClientRect() : null;

      return (
        <DndContext
          sensors={sensors}
          accessibility={accessibility}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={resetDrag}
        >
          <div
            className={tableHeadCN.mod({ droppable: true }).mix("horizontal-shadow").toClassName()}
            ref={ref}
            style={{
              ...style,
              height: 40,
            }}
          >
            {states.dropTarget && (
              // Out-of-flow overlay: it takes no layout space, so showing/moving it never shifts the columns.
              <div
                data-testid="column-drop-placeholder"
                aria-hidden="true"
                className={tableHeadCN.elem("drop-placeholder").toClassName()}
                data-first-gap={states.dropTarget.gapIndex === 0 ? "true" : undefined}
                style={{
                  position: "absolute",
                  left: 0,
                  pointerEvents: "none",
                  transform: `translateX(${states.dropTarget.offset}px)`,
                }}
              />
            )}
            {columns.map((col) => (
              <DraggableHeaderCell
                key={col.id}
                columnId={col.id}
                label={getColumnLabel(col)}
                disabled={Boolean(stopInteractions)}
                isGhost={states.draggedCol === col.id}
                cellRefs={colRefs}
              >
                <ColumnRenderer
                  column={col}
                  mod={{ draggable: true }}
                  headerRenderers={headerRenderers}
                  cellViews={cellViews}
                  columnHeaderExtra={columnHeaderExtra}
                  sortingEnabled={sortingEnabled}
                  stopInteractions={stopInteractions}
                  decoration={decoration}
                  onTypeChange={onTypeChange}
                  onResize={onResize}
                  onReset={onReset}
                />
              </DraggableHeaderCell>
            ))}
            <span className={tableHeadCN.elem("extra").toClassName()}>{extra}</span>
          </div>
          {createPortal(
            <DragOverlay
              dropAnimation={null}
              zIndex={DRAG_OVERLAY_Z_INDEX}
              modifiers={overlayModifiers}
              style={isKeyboardDrag ? { marginTop: draggedRect?.height } : undefined}
            >
              {draggedColumn ? (
                // A copy of the dragged column that follows the pointer; it owns the rounded corners and the fill.
                <div
                  className={tableHeadCN.elem("drag-image").toClassName()}
                  style={{ width: draggedRect?.width, height: draggedRect?.height }}
                >
                  <ColumnRenderer
                    column={draggedColumn}
                    headerRenderers={headerRenderers}
                    cellViews={cellViews}
                    columnHeaderExtra={columnHeaderExtra}
                    sortingEnabled={sortingEnabled}
                    stopInteractions
                    decoration={decoration}
                  />
                </div>
              ) : null}
            </DragOverlay>,
            document.body,
          )}
        </DndContext>
      );
    },
  ),
);
