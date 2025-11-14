import {
  type Table,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Row,
  type ColumnDef,
  type TableMeta,
  type VisibilityState,
} from "@tanstack/react-table";
import { memo } from "react";
import { cn } from "../../utils/utils";
import { useColumnSizing, useDataColumns } from "../../hooks/data-table";
import styles from "./data-table.module.scss";

export type DataShape = Record<string, any>[];

export type DataTableProps<T extends DataShape> = {
  data: T;
  meta?: TableMeta<any>;
  columns?: ColumnDef<T[number]>[];
  extraColumns?: ColumnDef<any>[];
  includeColumns?: (keyof T[number])[];
  excludeColumns?: (keyof T[number])[];
  pinColumns?: (keyof T[number])[];
  columnOrder?: (keyof T[number])[];
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (updater: VisibilityState | ((state: VisibilityState) => VisibilityState)) => void;
  cellSizesStorageKey?: string;
  onRowClick?: (row?: Row<T[number]>) => void;
  rowClassName?: (row: Row<T[number]>) => string | undefined;
};

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

  // just for persistence; don't use this as layout input
  useColumnSizing(table, props.cellSizesStorageKey);

  const { columnSizing } = table.getState();
  const rows = table.getRowModel().rows;

  return (
    <div className={styles.container}>
      <DataTableHead table={table} />
      <MemoizedDataTableBody
        rows={rows}
        rowClassName={props.rowClassName}
        onRowClick={props.onRowClick}
        columnVisibility={props.columnVisibility}
        columnSizing={columnSizing}
      />
    </div>
  );
};

interface DataTableHeadProps<T> {
  table: Table<T>;
}

const DataTableHead = <T extends Record<string, unknown>>({ table }: DataTableHeadProps<T>) => (
  <div className={styles.head}>
    {table.getHeaderGroups().map((group) => (
      <div className={styles.headRow} key={group.id}>
        {group.headers.map((header) => {
          const { column } = header;
          const isPinned = column.getIsPinned();
          const columnDef = column.columnDef;
          const minSize = columnDef.minSize ?? 50;
          const maxSize = columnDef.maxSize ?? 1200;
          const size = header.getSize();

          // super simple: everything uses TanStack's size
          const style = {
            width: `${size}px`,
            minWidth: `${minSize}px`,
            maxWidth: maxSize ? `${maxSize}px` : undefined,
            flex: "0 0 auto",
          };

          return (
            <div className={cn(styles.headCell, isPinned && styles.headCellPinned)} key={header.id} style={style}>
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
    ))}
  </div>
);

interface DataTableRowProps<T> {
  row: Row<T>;
  className?: string;
  onRowClick?: (row?: Row<T>) => void;
}

const DataTableRow = <T,>({ row, className, onRowClick }: DataTableRowProps<T>) => {
  const isError = className?.includes("error") || className?.includes("bodyRowError");

  return (
    <div
      className={cn(styles.bodyRow, onRowClick && styles.bodyRowClickable, isError && styles.bodyRowError, className)}
      onClick={() => onRowClick?.(row)}
    >
      {row.getVisibleCells().map((cell) => {
        const isPinned = cell.column.getIsPinned();
        const columnDef = cell.column.columnDef;
        const minSize = columnDef.minSize ?? 50;
        const maxSize = columnDef.maxSize ?? 1200;
        const size = cell.column.getSize();

        const style = {
          width: `${size}px`,
          minWidth: `${minSize}px`,
          maxWidth: maxSize ? `${maxSize}px` : undefined,
          flex: "0 0 auto",
        };

        return (
          <div className={cn(styles.bodyCell, isPinned && styles.bodyCellPinned)} key={cell.id} style={style}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        );
      })}
    </div>
  );
};

interface DataTableBodyProps<T> {
  rows: Row<T>[];
  onRowClick?: (row?: Row<T>) => void;
  rowClassName?: (row: Row<T>) => string | undefined;
  columnVisibility?: Record<string, boolean>;
  columnSizing?: Record<string, number>;
}

const DataTableBody = <T,>({
  rows,
  onRowClick,
  rowClassName,
  columnVisibility: _columnVisibility, // used to retrigger memo
  columnSizing: _columnSizing,
}: DataTableBodyProps<T>) => {
  return (
    <div className={styles.body}>
      {rows.map((row) => (
        <DataTableRow key={row.id} row={row} className={rowClassName?.(row) ?? ""} onRowClick={onRowClick} />
      ))}
    </div>
  );
};

const MemoizedDataTableBody = memo(DataTableBody, (prev, next) => {
  return (
    prev.rows === next.rows &&
    JSON.stringify(prev.columnVisibility) === JSON.stringify(next.columnVisibility) &&
    JSON.stringify(prev.columnSizing) === JSON.stringify(next.columnSizing)
  );
}) as typeof DataTableBody;
