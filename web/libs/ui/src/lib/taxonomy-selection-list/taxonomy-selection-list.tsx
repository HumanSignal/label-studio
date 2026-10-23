import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeGrid as Grid } from "react-window";
import { cn } from "../../utils/utils";
import { TaxonomySelectionBadge } from "./taxonomy-selection-badge";
import { TaxonomySelectionGridCell } from "./taxonomy-selection-grid-cell";
import type { TaxonomySelectionGridData, TaxonomySelectionListProps } from "./types";

const SELECTION_VIEWPORT_MAX_PX = 120;
const SELECTION_CHIP_ROW_HEIGHT_PX = 30;
const SELECTION_GRID_MIN_COL_WIDTH_PX = 100;
const SELECTION_GRID_GAP_PX = 6;
const SELECTION_VIRTUALIZE_THRESHOLD = 12;

/** Shared selected-label collection for taxonomy controls, virtualized for large selections. */
export function TaxonomySelectionList({ items, onRemove, className }: TaxonomySelectionListProps) {
  if (items.length < SELECTION_VIRTUALIZE_THRESHOLD) {
    return (
      <div
        role="group"
        aria-label="Selected taxonomy labels"
        className={cn(
          "flex max-h-[7.5rem] min-w-0 flex-1 flex-wrap items-center gap-tighter overflow-y-auto content-center",
          className,
        )}
      >
        {items.map((item) => (
          <TaxonomySelectionBadge key={item.value} item={item} onRemove={onRemove} />
        ))}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Selected taxonomy labels"
      className={cn("max-h-[7.5rem] min-h-0 min-w-0 w-full overflow-hidden", className)}
      style={{ height: SELECTION_VIEWPORT_MAX_PX }}
    >
      <AutoSizer>
        {({ width, height }) => {
          const columnCount = Math.max(
            1,
            Math.min(
              items.length,
              Math.floor((width + SELECTION_GRID_GAP_PX) / (SELECTION_GRID_MIN_COL_WIDTH_PX + SELECTION_GRID_GAP_PX)),
            ),
          );
          const gridData: TaxonomySelectionGridData = { items, onRemove, columnCount };
          return (
            <Grid
              className="htx-taxonomy-selection-virtual-grid"
              columnCount={columnCount}
              columnWidth={width / columnCount}
              height={Math.min(SELECTION_VIEWPORT_MAX_PX, height)}
              rowCount={Math.ceil(items.length / columnCount)}
              rowHeight={SELECTION_CHIP_ROW_HEIGHT_PX}
              width={width}
              itemData={gridData}
              itemKey={({ columnIndex, rowIndex }) => {
                const item = items[rowIndex * columnCount + columnIndex];
                return item ? `value:${item.value}` : `empty:${rowIndex}:${columnIndex}`;
              }}
              overscanColumnCount={1}
              overscanRowCount={2}
            >
              {TaxonomySelectionGridCell}
            </Grid>
          );
        }}
      </AutoSizer>
    </div>
  );
}
