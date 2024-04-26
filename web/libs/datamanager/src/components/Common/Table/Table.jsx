import { observer } from "mobx-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaCode } from "react-icons/fa";
import { RiCodeLine } from "react-icons/ri";
import { useSDK } from "../../../providers/SDKProvider";
import { isDefined } from "../../../utils/utils";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import { modal } from "../Modal/Modal";
import { Tooltip } from "../Tooltip/Tooltip";
import "./Table.styl";
import { TableCheckboxCell } from "./TableCheckbox";
import { TableBlock, TableContext, TableElem } from "./TableContext";
import { TableHead } from "./TableHead/TableHead";
import { TableRow } from "./TableRow/TableRow";
import { prepareColumns } from "./utils";
import { Block, Elem } from "../../../utils/bem";
import { FieldsButton } from "../FieldsButton";
import { LsGear, LsGearNewUI } from "../../../assets/icons";
import { FF_DEV_3873, FF_LOPS_E_10, FF_LOPS_E_3, isFF } from "../../../utils/feature-flags";

const Decorator = (decoration) => {
  return {
    get(col) {
      return decoration.find((d) => {
        let found = false;

        if (isDefined(d.alias)) {
          found = d.alias === col.alias;
        } else if (d.resolver instanceof Function) {
          found = d.resolver(col);
        }

        return found;
      });
    },
  };
};

const RowRenderer = observer(({ row, index, stopInteractions, rowHeight, fitContent, onRowClick, decoration }) => {
  const isEven = index % 2 === 0;
  const mods = {
    even: isEven,
    selected: row.isSelected,
    highlighted: row.isHighlighted,
    loading: row.isLoading,
    disabled: stopInteractions,
  };

  return (
    <TableElem key={`${row.id}-${index}`} name="row-wrapper" mod={mods} onClick={(e) => onRowClick?.(row, e)}>
      <TableRow
        key={row.id}
        data={row}
        even={index % 2 === 0}
        style={{
          height: rowHeight,
          width: fitContent ? "fit-content" : "auto",
        }}
        decoration={decoration}
      />
    </TableElem>
  );
});

const SelectionObserver = observer(({ id, selection, onSelect, className }) => {
  return (
    <TableCheckboxCell
      checked={id ? selection.isSelected(id) : selection.isAllSelected}
      indeterminate={!id && selection.isIndeterminate}
      onChange={onSelect}
      className={className}
    />
  );
});

export const Table = observer(
  ({
    view,
    data,
    cellViews,
    selectedItems,
    focusedItem,
    decoration,
    stopInteractions,
    onColumnResize,
    onColumnReset,
    headerExtra,
    ...props
  }) => {
    const colOrderKey = "dm:columnorder";
    const tableHead = useRef();
    const [colOrder, setColOrder] = useState(JSON.parse(localStorage.getItem(colOrderKey)) ?? {});
    const columns = prepareColumns(props.columns, props.hiddenColumns);
    const Decoration = useMemo(() => Decorator(decoration), [decoration]);
    const { api, type } = useSDK();

    useEffect(() => {
      localStorage.setItem(colOrderKey, JSON.stringify(colOrder));
    }, [colOrder]);

    if (props.onSelectAll && props.onSelectRow) {
      columns.unshift({
        id: "select",
        headerClassName: "table__select-all",
        cellClassName: "select-row",
        style: {
          width: 40,
          maxWidth: 40,
          justifyContent: "center",
        },
        onClick: (e) => e.stopPropagation(),
        Header: () => {
          return <SelectionObserver selection={selectedItems} onSelect={props.onSelectAll} className="select-all" />;
        },
        Cell: ({ data }) => {
          return (
            <SelectionObserver id={data.id} selection={selectedItems} onSelect={() => props.onSelectRow(data.id)} />
          );
        },
      });
    }

    columns.push({
      id: "show-source",
      cellClassName: "show-source",
      style: {
        width: 40,
        maxWidth: 40,
        justifyContent: "center",
      },
      onClick: (e) => e.stopPropagation(),
      Header() {
        return <div style={{ width: 40 }} />;
      },
      Cell({ data }) {
        let out = JSON.parse(data.source ?? "{}");

        out = {
          id: out?.id,
          data: out?.data,
          annotations: out?.annotations,
          predictions: out?.predictions,
        };

        const onTaskLoad = async () => {
          if (isFF(FF_LOPS_E_3) && type === "DE") {
            return new Promise((resolve) => resolve(out));
          }
          const response = await api.task({ taskID: out.id });

          return response ?? {};
        };

        return (
          <Tooltip title="Show task source">
            <Button
              type="link"
              style={{ width: 32, height: 32, padding: 0 }}
              onClick={() => {
                modal({
                  title: `Source for task ${out?.id}`,
                  style: { width: 800 },
                  body: <TaskSourceView content={out} onTaskLoad={onTaskLoad} sdkType={type} />,
                });
              }}
              icon={
                isFF(FF_LOPS_E_10) ? (
                  <Icon icon={RiCodeLine} style={{ width: 24, height: 24 }} />
                ) : (
                  <Icon icon={FaCode} />
                )
              }
            />
          </Tooltip>
        );
      },
    });

    if (Object.keys(colOrder).length > 0) {
      columns.sort((a, b) => {
        return colOrder[a.id] < colOrder[b.id] ? -1 : 1;
      });
    }

    const contextValue = {
      columns,
      data,
      cellViews,
    };

    const tableWrapper = useRef();

    useEffect(() => {
      const highlightedIndex = data.indexOf(focusedItem) - 1;
      const highlightedElement = tableWrapper.current?.children[highlightedIndex];

      if (highlightedElement) highlightedElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [tableWrapper.current]);

    return (
      <>
        {view.root.isLabeling && (
          <Block name="column-selector">
            {isFF(FF_DEV_3873) ? (
              <Elem
                name="button-new"
                tag={FieldsButton}
                className={"newUi"}
                icon={<LsGearNewUI />}
                tooltip={"Customize Columns"}
                style={{ padding: 0 }}
                wrapper={FieldsButton.Checkbox}
              />
            ) : (
              <Elem
                name="button"
                tag={FieldsButton}
                icon={<LsGear />}
                wrapper={FieldsButton.Checkbox}
                style={{ padding: 0 }}
              />
            )}
          </Block>
        )}
        <TableBlock ref={tableWrapper} name="table" mod={{ fit: props.fitToContent }}>
          <TableContext.Provider value={contextValue}>
            <TableHead
              ref={tableHead}
              order={props.order}
              columnHeaderExtra={props.columnHeaderExtra}
              sortingEnabled={props.sortingEnabled}
              onSetOrder={props.onSetOrder}
              stopInteractions={stopInteractions}
              onTypeChange={props.onTypeChange}
              decoration={Decoration}
              onResize={onColumnResize}
              onReset={onColumnReset}
              extra={headerExtra}
              onDragEnd={(updatedColOrder) => setColOrder(updatedColOrder)}
            />
            {data.map((row, index) => {
              return (
                <RowRenderer
                  key={`${row.id}-${index}`}
                  l
                  row={row}
                  index={index}
                  onRowClick={props.onRowClick}
                  stopInteractions={stopInteractions}
                  rowHeight={props.rowHeight}
                  fitContent={props.fitToContent}
                  decoration={Decoration}
                />
              );
            })}
          </TableContext.Provider>
        </TableBlock>
      </>
    );
  },
);

const TaskSourceView = ({ content, onTaskLoad, sdkType }) => {
  const [source, setSource] = useState(content);

  useEffect(() => {
    onTaskLoad().then((response) => {
      const formatted = {
        id: response.id,
        data: response.data,
      };

      if (sdkType !== "DE") {
        formatted.annotations = response.annotations ?? [];
        formatted.predictions = response.predictions ?? [];
      }
      setSource(formatted);
    });
  }, []);

  return <pre>{source ? JSON.stringify(source, null, "  ") : null}</pre>;
};
