import { observer, useLocalStore } from "mobx-react";
import { toJS } from "mobx";
import React, { forwardRef, useCallback, useEffect, useRef } from "react";
import { ViewColumnType, ViewColumnTypeName, ViewColumnTypeShort } from "../../../../stores/Tabs/tab_column";
import { Button, Dropdown } from "@humansignal/ui";
import { Menu } from "../../Menu/Menu";
import { Resizer } from "../../Resizer/Resizer";
import { Space } from "../../Space/Space";
import { Badge } from "@humansignal/ui";
import { TableCell, TableCellContent } from "../TableCell/TableCell";
import { TableContext, tableCN } from "../TableContext";
import { cn } from "../../../../utils/bem";
import { getStyle } from "../utils";
import "./TableHead.prefix.css";
import { getRoot } from "mobx-state-tree";
import { Agreement } from "../../../CellViews/Agreement/Agreement";
import { AgreementSelected } from "../../../CellViews/AgreementSelected";
import { IconChevronDown } from "@humansignal/icons";
import {
  isActive,
  FF_AGREEMENT_FILTERED,
  FF_UTC_428_CONSENSUS_CONTROL_TAG_AGREEMENT,
} from "@humansignal/core/lib/utils/feature-flags";
import { isStarterCloudPlan } from "@humansignal/core";

const tableHeadCN = cn("table-head");

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
    selectedView.setAgreementFilters(filters);
    return selectedView.save();
  };

  return (
    <Agreement.HeaderCell agreementFilters={agreementFilters} onSave={onSave}>
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
    selectedView.setAgreementFilters(agreementFilters);
    closeHandler();
    return selectedView.save();
  };

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
      <Button
        look="outlined"
        variant="neutral"
        size="small"
        trailing={<IconChevronDown />}
        align="left"
        style={{
          minWidth: 200,
          paddingLeft: "0.5rem",
          flexGrow: 1,
          width: "100%",
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
        <div {...rest} className={tableCN.elem("cell").mix(["th", headerClassName]).toClassName()} key={id}>
          <Header />
        </div>
      );
    }

    const root = getRoot(column.original);
    const isDE = root.SDK.type === "DE";
    const canOrder = sortingEnabled && column.original?.canOrder;
    const Decoration = decoration?.get?.(column);
    const extra = !isDE && columnHeaderExtra ? columnHeaderExtra(column, Decoration) : null;
    const content = Decoration?.content ? Decoration.content(column) : column.title;
    const style = getStyle(cellViews, column, Decoration);

    const isAgreementColumn =
      isActive(FF_AGREEMENT_FILTERED) &&
      isActive(FF_UTC_428_CONSENSUS_CONTROL_TAG_AGREEMENT) &&
      (column.original?.alias === "agreement" ||
        (typeof column.original?.alias === "string" && column.original.alias.startsWith("dimension_agreement_")));

    const isAgreementSelected =
      isActive(FF_AGREEMENT_FILTERED) &&
      !isActive(FF_UTC_428_CONSENSUS_CONTROL_TAG_AGREEMENT) &&
      column.type === "AgreementSelected";

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
            <DropdownWrapper column={column} cellViews={cellViews} onChange={onTypeChange}>
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
        <div
          className={tableHeadCN.mod({ droppable: true }).mix("horizontal-shadow").toClassName()}
          ref={ref}
          style={{
            ...style,
            height: 40,
          }}
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
              <span
                className={tableHeadCN.elem("draggable").toClassName()}
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

                  colRefs.current[draggedCol]?.style?.setProperty("--scale", "");

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
              </span>
            );
          })}
          <span className={tableHeadCN.elem("extra").toClassName()}>{extra}</span>
        </div>
      );
    },
  ),
);
