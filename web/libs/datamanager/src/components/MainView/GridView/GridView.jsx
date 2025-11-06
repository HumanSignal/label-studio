import { observer } from "mobx-react";
import { useCallback, useContext, useMemo, useEffect, useRef } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeGrid } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";
import { cn } from "../../../utils/bem";
import { Checkbox, cnm } from "@humansignal/ui";
import { Space } from "../../Common/Space/Space";
import { getProperty, prepareColumns } from "../../Common/Table/utils";
import * as DataGroups from "../../DataGroups";
import { FF_GRID_PREVIEW, FF_LOPS_E_3, isFF } from "../../../utils/feature-flags";
import { SkeletonLoader } from "../../Common/SkeletonLoader";
import { GridViewContext, GridViewProvider } from "./GridPreview";
import "./GridView.scss";
import { groupBy } from "../../../utils/utils";
import { IMAGE_SIZE_COEFFICIENT } from "../../DataGroups/ImageDataGroup";

const NO_IMAGE_CELL_HEIGHT = 250;
const CELL_HEADER_HEIGHT = 32;

export const GridHeader = observer(({ row, selected, onSelect }) => {
  const isSelected = selected.isSelected(row.id);
  return (
    <div className={cn("grid-view").elem("cell-header").toClassName()}>
      <Space>
        <Checkbox
          checked={isSelected}
          ariaLabel={`${isSelected ? "Unselect" : "Select"} Task ${row.id}`}
          onChange={() => onSelect?.(row.id)}
        />
        <span>{row.id}</span>
      </Space>
    </div>
  );
});

export const GridBody = observer(({ row, fields, columnCount }) => {
  const { hasImage } = useContext(GridViewContext);
  const dataFields = fields.filter((f) => f.parent?.alias === "data");
  const group = groupBy(dataFields, (f) => f.currentType);

  return Object.entries(group).map(([type, fields]) => {
    return (
      <div
        key={type}
        className={cnm("h-full w-full", {
          "overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-border scrollbar-track-transparent":
            type !== "Image" || type === "Unknown",
          "h-auto": !hasImage || hasImage,
        })}
      >
        {fields.map((field, index) => {
          const valuePath = field.id.split(":")[1] ?? field.id;
          const field_type = field.currentType;
          let value = getProperty(row, valuePath);

          /**
           * The value is an array...
           * In this case, we take the first element of the array
           */
          if (Array.isArray(value)) {
            value = value[0];
          }

          return (
            <GridDataGroup
              key={`${row.id}-${index}`}
              type={field_type}
              value={value}
              hasImage={hasImage}
              field={field}
              row={row}
              columnCount={columnCount}
            />
          );
        })}
      </div>
    );
  });
});

export const GridDataGroup = observer(({ type, value, field, row, columnCount, hasImage }) => {
  const DataTypeComponent = DataGroups[type];

  return isFF(FF_LOPS_E_3) && row.loading === field.alias ? (
    <SkeletonLoader />
  ) : DataTypeComponent ? (
    <DataTypeComponent value={value} field={field} original={row} columnCount={columnCount} hasImage={hasImage} />
  ) : (
    <DataGroups.TextDataGroup value={value} field={field} original={row} hasImage={hasImage} />
  );
});

export const GridCell = observer(({ view, selected, row, fields, onClick, columnCount, ...props }) => {
  const { setCurrentTaskId, imageField, hasImage } = useContext(GridViewContext);

  const handleBodyClick = useCallback(
    (e) => {
      if (!isFF(FF_GRID_PREVIEW) || !imageField) return;
      e.stopPropagation();
      setCurrentTaskId(row.id);
    },
    [imageField, row.id],
  );

  return (
    <div
      {...props}
      className={cn("grid-view")
        .elem("cell")
        .mod({ selected: selected.isSelected(row.id) })
        .toClassName()}
      onClick={onClick}
    >
      <div className={cn("grid-view").elem("cell-content").toClassName()}>
        <GridHeader
          view={view}
          row={row}
          fields={fields}
          selected={view.selected}
          onSelect={view.selected.toggleSelected}
        />
        <div
          className={`${cn("grid-view").elem("cell-body").mod({ responsive: !view.gridFitImagesToWidth }).toClassName()} ${cnm({ "overflow-auto": !hasImage })}`}
          onClick={handleBodyClick}
        >
          <GridBody view={view} row={row} fields={fields} columnCount={columnCount} />
        </div>
      </div>
    </div>
  );
});

export const GridView = observer(({ data, view, loadMore, fields, onChange, hiddenFields }) => {
  const columnCount = view.gridWidth ?? 4;
  const prevColumnCountRef = useRef(columnCount);

  const getCellIndex = useCallback((row, column) => columnCount * row + column, [columnCount]);

  const fieldsData = useMemo(() => {
    return prepareColumns(fields, hiddenFields);
  }, [fields, hiddenFields]);
  const hasImage = fieldsData.some((f) => f.currentType === "Image");

  const rowHeight = hasImage
    ? fieldsData
        .filter((f) => f.parent?.alias === "data")
        .reduce((res, f) => {
          const height = (DataGroups[f.currentType] ?? DataGroups.TextDataGroup).height;

          return res + height;
        }, 16)
    : NO_IMAGE_CELL_HEIGHT;
  const finalRowHeight =
    CELL_HEADER_HEIGHT + rowHeight * (hasImage ? Math.max(1, (IMAGE_SIZE_COEFFICIENT - columnCount) * 0.5) : 1);

  // Calculate the total number of rows needed to display all items
  const itemCount = view.dataStore.total || data.length;
  // Use only loaded data for grid dimensions to avoid long scrollbar
  const loadedRows = Math.ceil(data.length / columnCount);

  const renderItem = useCallback(
    ({ style, rowIndex, columnIndex }) => {
      const index = getCellIndex(rowIndex, columnIndex);
      const row = data[index];
      if (!row) return null;

      const props = {
        style: {
          ...style,
          marginLeft: "1em",
        },
      };

      return (
        <GridCell
          {...props}
          view={view}
          row={row}
          fields={fieldsData}
          columnCount={columnCount}
          selected={view.selected}
          onClick={() => onChange?.(row.id)}
        />
      );
    },
    [data, columnCount, fieldsData, view, onChange, getCellIndex],
  );

  const onItemsRenderedWrap = useCallback(
    (cb) =>
      ({ visibleRowStartIndex, visibleRowStopIndex, overscanRowStopIndex, overscanRowStartIndex }) => {
        // Check if we're near the end and need to load more
        const visibleItemStopIndex = getCellIndex(visibleRowStopIndex, columnCount - 1);

        // Calculate how many items are visible in the current view
        const visibleItemsCount = (visibleRowStopIndex - visibleRowStartIndex + 1) * columnCount;

        // If we're showing items near the end of our loaded data, trigger loading
        // Use a threshold of 2 rows worth of items to trigger loading
        const threshold = Math.max(columnCount * 2, 8); // At least 8 items or 2 rows

        // Check if we need to load more items
        const shouldLoadMore = visibleItemStopIndex >= data.length - threshold && view.dataStore.hasNextPage;

        // Also check if we don't have enough items to fill the visible area
        const hasEnoughItemsForVisibleArea = visibleItemStopIndex < data.length;
        const needsMoreItemsForDisplay = !hasEnoughItemsForVisibleArea && view.dataStore.hasNextPage;

        // More aggressive check: if we have fewer items than columns, always load more
        const hasInsufficientItems = data.length < columnCount && view.dataStore.hasNextPage;

        // Special case: if we have very few items compared to columns, be extra aggressive
        const hasVeryFewItems = data.length < columnCount * 0.5 && view.dataStore.hasNextPage;

        if (shouldLoadMore || needsMoreItemsForDisplay || hasInsufficientItems || hasVeryFewItems) {
          loadMore?.();
        }

        cb({
          overscanStartIndex: overscanRowStartIndex,
          overscanStopIndex: overscanRowStopIndex,
          visibleStartIndex: visibleRowStartIndex,
          visibleStopIndex: visibleRowStopIndex,
        });
      },
    [data.length, columnCount, view.dataStore.hasNextPage, view.dataStore.loading, loadMore, getCellIndex],
  );

  // Check if a specific item index is loaded
  const isItemLoaded = useCallback(
    (index) => {
      const rowExists = index < data.length && !!data[index];
      const hasNextPage = view.dataStore.hasNextPage;
      return !hasNextPage || rowExists;
    },
    [data.length, view.dataStore.hasNextPage],
  );

  // Handle column count changes
  useEffect(() => {
    const prevColumnCount = prevColumnCountRef.current;
    const currentColumnCount = columnCount;

    // If column count changed and we have more columns now (showing fewer rows)
    if (prevColumnCount !== currentColumnCount) {
      prevColumnCountRef.current = currentColumnCount;

      // Calculate how many items we can display with the new column count
      const estimatedVisibleRows = Math.ceil(window.innerHeight / finalRowHeight);
      const estimatedVisibleItems = estimatedVisibleRows * currentColumnCount;

      // If we don't have enough items to fill the visible area, load more
      // Note: We don't check !view.dataStore.loading here because we want to trigger loading
      // even if something is already loading, to ensure we get enough items
      if (data.length < estimatedVisibleItems && view.dataStore.hasNextPage) {
        loadMore?.();
      }

      // Fallback: if we have significantly fewer items than columns, always load more
      if (data.length < currentColumnCount * 2 && view.dataStore.hasNextPage) {
        loadMore?.();
      }

      // Special case: if we have fewer items than the column count itself, definitely load more
      // This handles the case where there aren't enough items to even fill one row
      if (data.length < currentColumnCount && view.dataStore.hasNextPage) {
        loadMore?.();
      }
    }
  }, [columnCount, data.length, view.dataStore.hasNextPage, view.dataStore.loading, loadMore, finalRowHeight]);

  // Additional effect to handle cases where we have a gap between content and screen bottom
  useEffect(() => {
    // Calculate if we have enough content to fill the screen
    const estimatedVisibleRows = Math.ceil(window.innerHeight / finalRowHeight);
    const estimatedVisibleItems = estimatedVisibleRows * columnCount;

    // If we have significantly fewer items than needed to fill the screen, load more
    // This handles the case where there's a gap and no scroll events are firing
    if (data.length < estimatedVisibleItems * 0.8 && view.dataStore.hasNextPage) {
      loadMore?.();
    }
  }, [data.length, columnCount, view.dataStore.hasNextPage, loadMore, finalRowHeight]);

  // Custom loadMore function that bypasses InfiniteLoader when needed
  const customLoadMore = useCallback(() => {
    if (view.dataStore.hasNextPage && !view.dataStore.loading) {
      loadMore?.();
    }
  }, [view.dataStore.hasNextPage, view.dataStore.loading, loadMore]);

  // Aggressive initial loading - trigger loading immediately when we don't have enough content
  useEffect(() => {
    const estimatedVisibleRows = Math.ceil(window.innerHeight / finalRowHeight);
    const estimatedVisibleItems = estimatedVisibleRows * columnCount;

    // If we don't have enough items to fill the screen, start loading immediately
    if (data.length < estimatedVisibleItems && view.dataStore.hasNextPage && !view.dataStore.loading) {
      loadMore?.();
    }
  }, [data.length, columnCount, view.dataStore.hasNextPage, view.dataStore.loading, loadMore, finalRowHeight]);

  return (
    <GridViewProvider data={data} view={view} fields={fieldsData}>
      <div className={cn("grid-view").mod({ columnCount }).toClassName()}>
        <AutoSizer className={cn("grid-view").elem("resize").toClassName()}>
          {({ width, height }) => (
            <InfiniteLoader
              itemCount={itemCount}
              isItemLoaded={isItemLoaded}
              loadMoreItems={customLoadMore}
              threshold={Math.max(1, Math.floor(view.dataStore.pageSize / 4))}
              minimumBatchSize={Math.max(1, Math.floor(view.dataStore.pageSize / 2))}
            >
              {({ onItemsRendered, ref }) => (
                <FixedSizeGrid
                  className={cn("grid-view").elem("list").toClassName()}
                  ref={ref}
                  width={width}
                  height={height}
                  rowHeight={finalRowHeight}
                  overscanRowCount={Math.max(2, Math.floor(view.dataStore.pageSize / 2))}
                  columnCount={columnCount}
                  rowCount={loadedRows}
                  columnWidth={width / columnCount - 9.5}
                  onItemsRendered={onItemsRenderedWrap(onItemsRendered)}
                  style={{ overflowX: "hidden" }}
                >
                  {renderItem}
                </FixedSizeGrid>
              )}
            </InfiniteLoader>
          )}
        </AutoSizer>
      </div>
    </GridViewProvider>
  );
});
