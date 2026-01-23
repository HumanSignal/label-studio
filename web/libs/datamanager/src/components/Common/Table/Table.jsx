import { observer } from "mobx-react";
import { createContext, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSDK } from "../../../providers/SDKProvider";
import { isDefined } from "../../../utils/utils";
import { Icon } from "../Icon/Icon";
import { modal } from "../Modal/Modal";
import { IconCode, IconCopyOutline, IconChevronDown } from "@humansignal/icons";
import { AutoSizerTable, Tooltip, Button } from "@humansignal/ui";
import { useCopyText } from "@humansignal/core";
import "./Table.scss";
import { TableCheckboxCell } from "./TableCheckbox";
import { tableCN, TableContext } from "./TableContext";
import { TableHead } from "./TableHead/TableHead";
import { TableRow } from "./TableRow/TableRow";
import { prepareColumns } from "./utils";
import { cn } from "../../../utils/bem";
import { FieldsButton } from "../FieldsButton";
import { FF_LOPS_E_3, isFF } from "../../../utils/feature-flags";
import { DensityToggle } from "../../DataManager/Toolbar/DensityToggle";

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
    onDensityChange,
    onRangeSelect,
    ...props
  }) => {
    const colOrderKey = "dm:columnorder";
    const tableHead = useRef();
    const [colOrder, setColOrder] = useState(JSON.parse(localStorage.getItem(colOrderKey)) ?? {});
    const listRef = useRef();
    const Decoration = useMemo(() => Decorator(decoration), [decoration]);
    const { api, type } = useSDK();
    const toolbarHeight = 41;
    const isQuickView = view.root.isLabeling;
    const [toolbarVisible, setToolbarVisible] = useState(true);
    // Track last clicked row ID for shift-click range selection
    const lastClickedId = useRef(null);

    // Reset virtualizer cache when rowHeight changes
    useEffect(() => {
      if (listRef.current?._listRef) {
        listRef.current._listRef.resetAfterIndex(0);
      }
    }, [props.rowHeight]);

    const headerCheckboxCell = useCallback(() => {
      return (
        <TableCheckboxCell
          checked={selectedItems.isAllSelected}
          indeterminate={selectedItems.isIndeterminate}
          onChange={() => props.onSelectAll()}
          className="select-all"
          ariaLabel={`${selectedItems.isAllSelected ? "Unselect" : "Select"} all rows`}
        />
      );
    }, [props.onSelectAll, selectedItems]);

    const rowCheckBoxCell = useCallback(
      ({ data: rowData }) => {
        const isChecked = selectedItems.isSelected(rowData.id);
        return (
          <TableCheckboxCell
            checked={isChecked}
            onChange={(checked, shiftKey) => {
              // Handle shift-click for range selection (works for both select and unselect)
              if (shiftKey && lastClickedId.current !== null && onRangeSelect) {
                const lastClickedIndex = data.findIndex((item) => item.id === lastClickedId.current);
                const currentIndex = data.findIndex((item) => item.id === rowData.id);

                if (lastClickedIndex !== -1 && currentIndex !== -1) {
                  const startIndex = Math.min(lastClickedIndex, currentIndex);
                  const endIndex = Math.max(lastClickedIndex, currentIndex);
                  const rangeIds = data.slice(startIndex, endIndex + 1).map((item) => item.id);

                  // Pass the select state: true = select range, false = unselect range
                  onRangeSelect(rangeIds, checked);
                  lastClickedId.current = rowData.id;
                  return;
                }
              }

              // Normal single-item toggle
              props.onSelectRow(rowData.id);
              // Always remember last clicked for shift-click range
              lastClickedId.current = rowData.id;
            }}
            ariaLabel={`${isChecked ? "Unselect" : "Select"} Task ${rowData.id}`}
          />
        );
      },
      [props.onSelectRow, selectedItems, data, onRangeSelect],
    );

    const columns = prepareColumns(props.columns, props.hiddenColumns);

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
      Header: headerCheckboxCell,
      Cell: rowCheckBoxCell,
    });

    columns.push({
      id: "show-source",
      cellClassName: "show-source",
      headerClassName: "show-source",
      style: {
        width: 44,
        maxWidth: 44,
        justifyContent: "center",
      },
      onClick: (e) => e.stopPropagation(),
      Header() {
        return <div style={{ width: 44 }} />;
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
          <Button
            look="string"
            className="w-6 h-6 p-0 text-primary-content hover:text-primary-content-hover"
            onClick={() => {
              modal({
                title: `Source for task ${out?.id}`,
                style: { width: 800 },
                body: <TaskSourceView content={out} onTaskLoad={onTaskLoad} sdkType={type} />,
              });
            }}
            leading={<Icon icon={IconCode} />}
            tooltip="Show task source"
          />
        );
      },
    });

    if (Object.keys(colOrder).length > 0) {
      columns.sort((a, b) => {
        return colOrder[a.id] < colOrder[b.id] ? -1 : 1;
      });
    }
    useEffect(() => {
      localStorage.setItem(colOrderKey, JSON.stringify(colOrder));
    }, [colOrder]);

    const contextValue = {
      columns,
      data,
      cellViews,
    };

    const headerHeight = 43;

    const renderTableToolbar = useCallback(() => {
      return (
        <div className={cn("table-toolbar").mod({ visible: toolbarVisible }).toString()}>
          <FieldsButton
            className={cn("table-toolbar").elem("customize-button").toString()}
            wrapper={FieldsButton.Checkbox}
            title={"Columns"}
            size="small"
            trailingIcon={<Icon icon={IconChevronDown} />}
            tooltip={"Customize Columns"}
            data-testid="columns-picker-quickview"
          />
          <DensityToggle size="small" onChange={onDensityChange} data-testid="density-toggle-quickview" />
        </div>
      );
    }, [toolbarVisible, onDensityChange]);

    const renderTableHeader = useCallback(
      ({ style }) => (
        <TableHead
          ref={tableHead}
          style={style}
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
      ),
      [
        props.order,
        props.columnHeaderExtra,
        props.sortingEnabled,
        props.onSetOrder,
        props.onTypeChange,
        stopInteractions,
        view,
        view.selected.list,
        view.selected.all,
        tableHead,
      ],
    );

    const renderRow = useCallback(
      ({ style, index }) => {
        // Both QuickView and Regular mode: Index 0 is header (sticky), Index 1+ are data rows
        const dataIndex = index - 1;
        const row = data[dataIndex];
        const isEven = dataIndex % 2 === 0;

        if (isQuickView) {
          return (
            <TableRow
              key={row.id}
              data={row}
              even={isEven}
              onClick={(row, e) => props.onRowClick(row, e)}
              stopInteractions={stopInteractions}
              wrapperStyle={{ ...style, height: props.rowHeight }}
              style={{
                height: props.rowHeight,
                width: props.fitContent ? "fit-content" : "auto",
              }}
              decoration={Decoration}
            />
          );
        }

        // Invert for visual consistency in Regular mode: we want odd rows (2nd, 4th, etc.) to have background
        const shouldApplyBackground = !isEven;

        return (
          <TableRow
            key={row.id}
            data={row}
            even={shouldApplyBackground}
            onClick={(row, e) => props.onRowClick(row, e)}
            stopInteractions={stopInteractions}
            wrapperStyle={{ ...style, height: props.rowHeight }}
            style={{
              height: props.rowHeight,
              width: props.fitContent ? "fit-content" : "auto",
            }}
            decoration={Decoration}
          />
        );
      },
      [
        data,
        props.fitContent,
        props.onRowClick,
        props.rowHeight,
        stopInteractions,
        selectedItems,
        view,
        view.selected.list,
        view.selected.all,
        isQuickView,
      ],
    );

    const isItemLoaded = useCallback(
      (index) => {
        return props.isItemLoaded(data, index);
      },
      [props, data],
    );

    const cachedScrollOffset = useRef();

    const initialScrollOffset = useCallback(
      (height) => {
        if (isDefined(cachedScrollOffset.current)) {
          return cachedScrollOffset.current;
        }

        const h = props.rowHeight;
        const index = data.indexOf(focusedItem);

        if (index >= 0) {
          const scrollOffset = index * h - height / 2 + h / 2; // + headerHeight

          return (cachedScrollOffset.current = scrollOffset);
        }
        return 0;
      },
      [props.rowHeight, data, focusedItem],
    );

    const itemKey = useCallback(
      (index) => {
        if (index > data.length - 1) {
          return index;
        }
        return data[index]?.key ?? index;
      },
      [data],
    );

    useEffect(() => {
      const listComponent = listRef.current?._listRef;

      if (listComponent) {
        listComponent.scrollToItem(data.indexOf(focusedItem), "center");
      }
    }, [data]);
    const tableWrapper = useRef();

    const handleScroll = useCallback(
      ({ scrollOffset }) => {
        if (isQuickView && scrollOffset >= 0) {
          setToolbarVisible(scrollOffset === 0);
        }
      },
      [isQuickView, toolbarHeight],
    );

    return (
      <div ref={tableWrapper} className={tableCN.mod({ fit: props.fitToContent }).toString()}>
        {isQuickView && renderTableToolbar()}
        <TableContext.Provider value={contextValue}>
          <StickyList
            ref={listRef}
            overscanCount={10}
            itemHeight={props.rowHeight}
            totalCount={props.total}
            itemCount={data.length + 1}
            itemKey={itemKey}
            innerElementType={innerElementType}
            stickyItems={[0]}
            stickyItemsHeight={[headerHeight]}
            stickyComponent={renderTableHeader}
            initialScrollOffset={initialScrollOffset}
            isItemLoaded={isItemLoaded}
            loadMore={props.loadMore}
            toolbarHeight={toolbarHeight}
            headerHeight={headerHeight}
            isQuickView={isQuickView}
            onScroll={handleScroll}
            toolbarVisible={toolbarVisible}
          >
            {renderRow}
          </StickyList>
        </TableContext.Provider>
      </div>
    );
  },
);

const StickyListContext = createContext();

StickyListContext.displayName = "StickyListProvider";

const ItemWrapper = ({ data, index, style }) => {
  const { Renderer, stickyItems } = data;

  if (stickyItems?.includes(index) === true) {
    return null;
  }

  return <Renderer index={index} style={style} />;
};

const StickyList = observer(
  forwardRef((props, listRef) => {
    const {
      children,
      stickyComponent,
      stickyItems,
      stickyItemsHeight,
      totalCount,
      isItemLoaded,
      loadMore,
      initialScrollOffset,
      toolbarHeight,
      headerHeight,
      isQuickView,
      onScroll,
      headerTopOffset,
      toolbarVisible,
      ...rest
    } = props;

    const itemData = {
      Renderer: children,
      StickyComponent: stickyComponent,
      stickyItems,
      stickyItemsHeight,
      headerTopOffset,
      isQuickView,
      toolbarHeight,
    };

    const itemSize = (index) => {
      if (isQuickView) {
        if (stickyItems.includes(index)) {
          return headerHeight;
        }
      } else {
        // Regular mode: Index 0 is sticky header
        if (stickyItems.includes(index)) {
          return headerHeight;
        }
      }
      // All other indices are data rows
      return rest.itemHeight;
    };

    // Calculate height adjustment for QuickView mode
    // Subtract toolbar height (when visible) and app header height
    const heightAdjustment = useMemo(() => {
      if (!isQuickView) return 0;

      // Get app header height from CSS variable
      const appHeaderHeight = Number.parseInt(
        getComputedStyle(document.documentElement).getPropertyValue("--header-height") || "0",
        10,
      );

      // Add toolbar height only when toolbar is visible
      const adjustment = appHeaderHeight + (toolbarVisible ? toolbarHeight : 0);

      return adjustment;
    }, [isQuickView, toolbarVisible, toolbarHeight]);

    return (
      <StickyListContext.Provider value={itemData}>
        <AutoSizerTable
          ref={listRef}
          totalCount={totalCount}
          loadMore={loadMore}
          isItemLoaded={isItemLoaded}
          itemData={itemData}
          itemSize={itemSize}
          initialScrollOffset={initialScrollOffset}
          className={tableCN.elem("auto-size").mod({ "quick-view": isQuickView }).toString()}
          onScroll={onScroll}
          heightAdjustment={heightAdjustment}
          {...rest}
        >
          {ItemWrapper}
        </AutoSizerTable>
      </StickyListContext.Provider>
    );
  }),
);

StickyList.displayName = "StickyList";

const innerElementType = forwardRef(({ children, ...rest }, ref) => {
  return (
    <StickyListContext.Consumer>
      {({ stickyItems, stickyItemsHeight, StickyComponent, headerTopOffset, isQuickView, toolbarHeight }) => {
        // Ensure top position is always between 0 and toolbarHeight in QuickView
        const topPosition = isQuickView ? Math.max(0, Math.min(toolbarHeight, headerTopOffset ?? 0)) : 0;

        // In QuickView mode, children[0] is the toolbar, children[1+] are data rows
        const childrenArray = Array.isArray(children) ? children : children ? [children] : [];
        const toolbar = isQuickView && childrenArray.length > 0 ? childrenArray[0] : null;
        const bodyRows = isQuickView && childrenArray.length > 0 ? childrenArray.slice(1) : children;

        return (
          <div ref={ref} {...rest}>
            {stickyItems.map((index) => (
              <StickyComponent
                className={tableCN.elem("sticky-header").toString()}
                key={index}
                index={index}
                style={{
                  height: stickyItemsHeight[index],
                  top: topPosition,
                }}
              />
            ))}

            {isQuickView ? (
              <>
                {toolbar}
                <div className={tableCN.elem("body-rows").toString()}>{bodyRows}</div>
              </>
            ) : (
              children
            )}
          </div>
        );
      }}
    </StickyListContext.Consumer>
  );
});

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
      if (response.state) {
        formatted.state = response.state;
      }
      setSource(formatted);
    });
  }, []);

  const jsonString = useMemo(() => {
    return source ? JSON.stringify(source, null, 2) : "";
  }, [source]);

  const [handleCopy, copied] = useCopyText({ defaultText: jsonString });

  return (
    <div
      className="bg-neutral-surface rounded-small font-mono text-body-small leading-body-small overflow-auto max-h-[500px]"
      style={{ position: "relative" }}
    >
      <div style={{ padding: "16px", paddingTop: "16px" }}>
        <Tooltip title={copied ? "Copied!" : "Copy JSON"}>
          <Button
            look="string"
            variant="neutral"
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              width: 32,
              height: 32,
              padding: 0,
              zIndex: 10,
              color: "var(--color-neutral-content-subtle)",
            }}
            onClick={() => handleCopy()}
            leading={<Icon icon={IconCopyOutline} style={{ color: "var(--color-neutral-content-subtle)" }} />}
          />
        </Tooltip>
        <pre className="m-0 whitespace-pre-wrap break-words max-w-full" style={{ marginRight: "40px" }}>
          {jsonString}
        </pre>
      </div>
    </div>
  );
};
