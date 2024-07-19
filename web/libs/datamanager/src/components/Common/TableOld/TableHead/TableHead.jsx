import { observer, useLocalStore } from "mobx-react";
import { toJS } from "mobx";
import React, { forwardRef, useCallback, useEffect, useRef } from "react";
import { ViewColumnType, ViewColumnTypeName, ViewColumnTypeShort } from "../../../../stores/Tabs/tab_column";
import { BemWithSpecifiContext } from "../../../../utils/bem";
import { Button } from "../../Button/Button";
import { Dropdown } from "../../Dropdown/Dropdown";
import { Menu } from "../../Menu/Menu";
import { Resizer } from "../../Resizer/Resizer";
import { Space } from "../../Space/Space";
import { Tag } from "../../Tag/Tag";
import { TableCell, TableCellContent } from "../TableCell/TableCell";
import { TableContext, TableElem } from "../TableContext";
import { getStyle } from "../utils";
import "./TableHead.scss";
import { FF_DEV_2984, FF_DEV_3873, isFF } from "../../../../utils/feature-flags";
import { getRoot } from "mobx-state-tree";

const { Block, Elem } = BemWithSpecifiContext();

const is2984FF = isFF(FF_DEV_2984);

const DropdownWrapper = observer(({ column, cellViews, children, onChange }) => {
  const types = ViewColumnType._types
    .map((t) => t.value)
    .filter((t) => {
      const cellView = cellViews[t];

      const selectable = cellView?.userSelectable !== false;
      const displayType = cellView?.displayType !== false;

      return cellView && selectable && displayType;
    });

  return (
    <Dropdown.Trigger
      content={
        <Menu title="Display as" size="compact" selectedKeys={[column.currentType]}>
          {types.map((type) => {
            return (
              <Menu.Item key={type} onClick={() => onChange?.(column, type)}>
                <Space>
                  <Tag
                    size="small"
                    style={{
                      width: 45,
                      textAlign: "center",
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    {ViewColumnTypeShort(type)}
                  </Tag>
                  {ViewColumnTypeName(type)}
                </Space>
              </Menu.Item>
            );
          })}
        </Menu>
      }
    >
      <Button
        type="text"
        size="small"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "none",
          fontSize: 14,
        }}
      >
        {children}
      </Button>
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
        <TableElem {...rest} name="cell" key={id} mix={["th", headerClassName]}>
          <Header />
        </TableElem>
      );
    }

    const root = getRoot(column.original);
    const isDE = root.SDK.type === "DE";
    const canOrder = sortingEnabled && column.original?.canOrder;
    const Decoration = decoration?.get?.(column);
    const extra = !isDE && columnHeaderExtra ? columnHeaderExtra(column, Decoration) : null;
    const content = Decoration?.content ? Decoration.content(column) : column.title;
    const style = getStyle(cellViews, column, Decoration);

    const headContent = (
      <>
        <TableCellContent mod={{ canOrder, disabled: stopInteractions }} mix="th-content">
          {content}
        </TableCellContent>

        {extra && <Elem name="column-extra">{extra}</Elem>}
      </>
    );

    return (
      <TableCell data-id={id} mix="th">
        <Resizer
          style={{
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: style.justifyContent ?? "space-between",
            overflow: "hidden",
          }}
          initialWidth={style.width ?? 150}
          minWidth={style.minWidth ?? 30}
          onResizeFinished={(width) => onResize?.(column, width)}
          onReset={() => onReset?.(column)}
        >
          {!isDE && column.parent ? (
            <DropdownWrapper column={column} cellViews={cellViews} onChange={onTypeChange}>
              {headContent}
            </DropdownWrapper>
          ) : (
            headContent
          )}
        </Resizer>
      </TableCell>
    );
  },
);

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

      if (is2984FF) {
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
        }));
        const colRefs = useRef({});
        const getUpdatedColOrder = useCallback(
          (cols) => {
            const orderedColumns = {};

            (cols ?? columns).forEach((col, colIndex) => {
              orderedColumns[col.id] = colIndex;
            });
            return orderedColumns;
          },
          [columns],
        );

        useEffect(() => {
          ref.current?.addEventListener("mousedown", (event) => {
            const className = event.target.className;

            // This element could be an SVG element where className is an object, not a string.
            if (className?.includes?.("handle")) {
              event.preventDefault();
            }
          });
        }, []);

        return (
          <Block
            name="table-head"
            ref={ref}
            style={{
              ...style,
              height: isFF(FF_DEV_3873) && 42,
            }}
            mod={{ droppable: true }}
            mix="horizontal-shadow"
            onDragOver={useCallback(
              (e) => {
                const draggedCol = states.getDraggedCol();

                colRefs.current[draggedCol].style.setProperty("--scale", "0");
                e.stopPropagation();
              },
              [states],
            )}
          >
            {columns.map((col) => {
              return (
                <Elem
                  name="draggable"
                  draggable={true}
                  ref={(ele) => (colRefs.current[col.id] = ele)}
                  key={col.id}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "none";
                    const ele = colRefs.current[col.id];

                    states.setInitialDragPos({
                      x: ele.offsetLeft,
                      y: ele.offsetTop,
                    });
                    states.setDraggedCol(col.id);
                  }}
                  onDragEnd={(e) => {
                    e.stopPropagation();
                    const draggedCol = states.getDraggedCol();
                    const curColumns = columns.filter((curCol) => curCol.id !== draggedCol);
                    const newIndex = curColumns.findIndex((curCol) => {
                      const colRefrence = colRefs.current[curCol.id];
                      const mousePos = e.clientX + (ref?.current?.parentElement?.parentElement.scrollLeft ?? 0);
                      const isGreaterThanPos = mousePos < colRefrence.offsetLeft + colRefrence.clientWidth / 2;

                      return isGreaterThanPos;
                    });

                    colRefs.current[draggedCol].style.setProperty("--scale", "");

                    states.setDraggedCol(null);
                    curColumns.splice(newIndex, 0, col);
                    const updatedColOrder = getUpdatedColOrder(curColumns);

                    onDragEnd?.(updatedColOrder);
                  }}
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
                </Elem>
              );
            })}
            <Elem name="extra">{extra}</Elem>
          </Block>
        );
      }
      return (
        <Block name="table-head" ref={ref} style={style} mix="horizontal-shadow">
          {columns.map((col) => {
            return (
              <ColumnRenderer
                key={col.id}
                column={col}
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
            );
          })}
          <Elem name="extra">{extra}</Elem>
        </Block>
      );
    },
  ),
);
