import React from "react";

/**
 * Minimal react-window mock for Vitest. Exports a simple FixedSizeList
 * that renders a scrollable div so CodeView (and any other component
 * using react-window) doesn't hit "Element type is invalid" when the
 * real package has CJS/ESM interop issues in the test env.
 */
interface FixedSizeListProps {
  height: number;
  width: number;
  itemCount: number;
  itemSize: number;
  overscanCount?: number;
  children: React.ComponentType<{ index: number; style: React.CSSProperties }>;
}

export const FixedSizeList = React.forwardRef<HTMLDivElement, FixedSizeListProps>(
  function FixedSizeList(
    { height, width, itemCount, itemSize, children: Row },
    ref,
  ) {
    const items = Array.from({ length: itemCount }, (_, i) => i);
    return (
      <div ref={ref} style={{ height, width, overflow: "auto" }}>
        {items.map((index) => (
          <Row
            key={index}
            index={index}
            style={{ height: itemSize, width }}
          />
        ))}
      </div>
    );
  },
);

interface FixedSizeGridProps {
  children: (props: { rowIndex: number; columnIndex: number; style: React.CSSProperties }) => React.ReactNode;
  width?: number;
  height?: number;
  rowHeight?: number;
  columnWidth?: number;
  rowCount?: number;
  columnCount?: number;
  overscanRowCount?: number;
  onItemsRendered?: () => void;
  className?: string;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLDivElement>;
}

export const FixedSizeGrid = React.forwardRef<HTMLDivElement, FixedSizeGridProps>(
  function FixedSizeGrid(
    {
      children,
      width = 800,
      height = 400,
      rowHeight,
      columnWidth,
      rowCount = 0,
      columnCount = 1,
      className,
      style = {},
      ...rest
    },
    ref,
  ) {
    const cells: React.ReactNode[] = [];
    const rows = Math.min(rowCount || 0, 10);
    const cols = columnCount || 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push(children({ rowIndex: r, columnIndex: c, style: {} }));
      }
    }
    return (
      <div
        ref={ref}
        data-testid="fixed-size-grid"
        className={className}
        style={{ ...style, width, height }}
        data-column-count={columnCount}
        data-row-count={rowCount}
        data-row-height={rowHeight}
        data-column-width={columnWidth}
      >
        {cells.length ? cells : children({ rowIndex: 0, columnIndex: 0, style: {} })}
      </div>
    );
  },
);

export const VariableSizeList = FixedSizeList;
export const VariableSizeGrid = FixedSizeGrid;
export function areEqual(): boolean {
  return true;
}
export function shouldComponentUpdate(): boolean {
  return true;
}
