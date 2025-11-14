import { type Table, flexRender, getCoreRowModel, useReactTable, type Row } from "@tanstack/react-table";
import { memo } from "react";
import { cn } from "../../utils/utils";
import { createColumnSizeKey } from "./tools";
import { useColumnSizing, useDataColumns } from "../../hooks/data-table";
import styles from "./data-table.module.scss";

// Types
import type {
  CellContext,
  ColumnDef,
  ColumnDefTemplate,
  ColumnSizingColumnDef,
  StringOrTemplateHeader,
  TableMeta,
  VisibilityState,
} from "@tanstack/react-table";

export type DataShape = Record<string, any>[];

export type DataTableHeaders<T extends DataShape> = {
  [key in keyof T[number]]?: StringOrTemplateHeader<T[number], unknown>;
};

export type DataTableCells<T extends DataShape> = {
  [key in keyof T[number]]?: ColumnDefTemplate<CellContext<T[number], T[number][key]>>;
};

export type DataTableSizes<T extends DataShape> = {
  [key in keyof T[number]]?: ColumnSizingColumnDef;
};

/**
 * Props for the DataTable component
 */
export type DataTableProps<T extends DataShape> = {
  /** Array of data objects to display in the table */
  data: T;
  /** Optional metadata to pass to the table instance */
  meta?: TableMeta<any>;
  /** Pre-defined column definitions. If not provided, columns will be auto-generated from data */
  columns?: ColumnDef<T[number]>[];
  /** Custom headers for columns. Used when auto-generating columns */
  headers?: DataTableHeaders<T>;
  /** Custom cell renderers for columns. Used when auto-generating columns */
  cells?: DataTableCells<
    T & {
      restCells?: ColumnDefTemplate<CellContext<T[number], T[number][string]>>;
    }
  >;
  /** Column size configurations. Used when auto-generating columns */
  sizes?: DataTableSizes<
    T & {
      restColumns?: ColumnSizingColumnDef;
    }
  >;
  /** Additional columns to append to the table */
  extraColumns?: ColumnDef<any>[];
  /** Only include these columns (when auto-generating) */
  includeColumns?: (keyof T[number])[];
  /** Exclude these columns (when auto-generating) */
  excludeColumns?: (keyof T[number])[];
  /** Columns to pin to the right side of the table */
  pinColumns?: (keyof T[number])[];
  /** Custom column order (when auto-generating) */
  columnOrder?: (keyof T[number])[];
  /** Column visibility state */
  columnVisibility?: VisibilityState;
  /** Callback when column visibility changes */
  onColumnVisibilityChange?: (updater: VisibilityState | ((state: VisibilityState) => VisibilityState)) => void;
  /** localStorage key to persist column sizes */
  cellSizesStorageKey?: string;
  /** Callback when a row is clicked */
  onRowClick?: (row?: Row<T[number]>) => void;
  /** Function to generate custom className for rows */
  rowClassName?: (row: Row<T[number]>) => string | undefined;
};

/**
 * DataTable - A reusable data table component
 *
 * Features:
 * - Column resizing with persistence
 * - Column visibility control
 * - Column pinning (right-side sticky columns)
 * - Row click handlers
 * - Custom row styling
 * - Flexible column definitions
 * - CSS-only scrolling (body scrolls when parent constrains height)
 *
 * @example
 * ```tsx
 * <DataTable
 *   data={myData}
 *   columns={columns}
 *   onRowClick={(row) => console.log(row.original)}
 *   cellSizesStorageKey="my-table-sizes"
 * />
 * ```
 */
export const DataTable = <T extends DataShape>(props: DataTableProps<T>) => {
  const columns = props.columns ?? useDataColumns(props);

  const table = useReactTable({
    data: props.data,
    meta: props.meta ?? {},
    columns,
    defaultColumn: {
      minSize: 50,
      maxSize: 1200,
      enablePinning: true,
    },
    state: {
      columnPinning: {
        right: props.pinColumns as string[],
      },
      columnVisibility: props.columnVisibility,
    },
    onColumnVisibilityChange: props.onColumnVisibilityChange,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
  });

  const columnSizes = useColumnSizing(table, props.cellSizesStorageKey);

  const rows = table.getRowModel().rows;
  return (
    <div className={styles.container} style={columnSizes}>
      <DataTableHead table={table} />
      <MemoizedDataTableBody
        rows={rows}
        rowClassName={props.rowClassName}
        onRowClick={props.onRowClick}
        columnVisibility={props.columnVisibility}
      />
    </div>
  );
};

const DataTableHead = <T extends Record<string, unknown>>({
  table,
}: {
  table: Table<T>;
}) => (
  <div className={styles.head}>
    {table.getHeaderGroups().map((group) => {
      return (
        <div className={styles.headRow} key={group.id}>
          {group.headers.map((header) => {
            const { column } = header;
            const headerSizeKey = createColumnSizeKey("header", header.id);
            const isPinned = column.getIsPinned();

            return (
              <div
                className={cn(styles.headCell, isPinned && styles.headCellPinned)}
                key={header.id}
                style={{
                  width: `calc(var(${headerSizeKey}) * 1px)`,
                }}
              >
                {header.isPlaceholder ? null : flexRender(column.columnDef.header, header.getContext())}
                {group.headers[group.headers.length - 1]?.id !== header.id && (
                  <div
                    className={styles.headCellResizer}
                    onDoubleClick={() => header.column.resetSize()}
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                  />
                )}
              </div>
            );
          })}
        </div>
      );
    })}
  </div>
);

const DataTableRow = <T,>({
  row,
  className,
  onRowClick,
}: {
  row: Row<T>;
  className?: string;
  onRowClick?: (row?: Row<T>) => void;
}) => {
  const isError = className?.includes("error") || className?.includes("bodyRowError");
  return (
    <div
      className={cn(styles.bodyRow, onRowClick && styles.bodyRowClickable, isError && styles.bodyRowError, className)}
      key={row.id}
      onClick={() => onRowClick?.(row)}
    >
      {row.getVisibleCells().map((cell) => {
        const colSizeKey = createColumnSizeKey("col", cell.column.id);
        const isPinned = cell.column.getIsPinned();

        return (
          <div
            className={cn(styles.bodyCell, isPinned && styles.bodyCellPinned)}
            key={cell.id}
            style={{
              width: `calc(var(${colSizeKey}) * 1px)`,
            }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        );
      })}
    </div>
  );
};

const DataTableBody = <T,>({
  rows,
  onRowClick,
  rowClassName,
  columnVisibility: _columnVisibility, // this parameter is used to trigger the re-render of the high-order component 'MemoizedDataTableBody'
}: {
  rows: Row<T>[];
  onRowClick?: (row?: Row<T>) => void;
  rowClassName?: (row: Row<T>) => string | undefined;
  columnVisibility?: Record<string, boolean>;
}) => {
  return (
    <div className={styles.body}>
      {rows.map((row) => (
        <DataTableRow key={row.id} row={row} className={rowClassName?.(row) ?? ""} onRowClick={onRowClick} />
      ))}
    </div>
  );
};

const MemoizedDataTableBody = memo(DataTableBody, (prev, next) => {
  return prev.rows === next.rows && JSON.stringify(prev.columnVisibility) === JSON.stringify(next.columnVisibility);
}) as typeof DataTableBody;
