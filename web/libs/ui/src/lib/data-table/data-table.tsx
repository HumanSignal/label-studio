import {
  type Table,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Row,
  type ColumnDef,
  type TableMeta,
  type VisibilityState,
  type HeaderContext,
  type SortingState,
} from "@tanstack/react-table";

// Extend ColumnMeta to include noDivider and sortParam
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    noDivider?: boolean;
    sortParam?: string; // API field name for sorting (e.g., "user__first_name")
  }
}
import { memo, useState, useMemo, useCallback } from "react";
import { cn } from "../../utils/utils";
import { useColumnSizing, useDataColumns } from "../../hooks/data-table";
import { Checkbox } from "../checkbox/checkbox";
import { Typography } from "../typography/typography";
import { IconSortUp, IconSortDown } from "@humansignal/icons";
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
  selectable?: boolean;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (
    updater: Record<string, boolean> | ((old: Record<string, boolean>) => Record<string, boolean>),
  ) => void;
  // Sorting props
  sorting?: SortingState;
  onSortingChange?: (updater: SortingState | ((old: SortingState) => SortingState)) => void;
  enableSorting?: boolean; // Global enable/disable sorting
};

export const DataTable = <T extends DataShape>(props: DataTableProps<T>) => {
  const {
    selectable = false,
    rowSelection: controlledRowSelection,
    onRowSelectionChange: controlledOnRowSelectionChange,
    sorting: controlledSorting,
    onSortingChange: controlledOnSortingChange,
    enableSorting = true,
  } = props;
  const [internalRowSelection, setInternalRowSelection] = useState<Record<string, boolean>>({});
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [activeRowId, setActiveRowId] = useState<string | undefined>(undefined);

  // Use controlled selection if provided, otherwise use internal state
  const rowSelection = controlledRowSelection ?? internalRowSelection;
  const isControlled = controlledRowSelection !== undefined;

  // Use controlled sorting if provided, otherwise use internal state
  const sorting = controlledSorting ?? internalSorting;
  const isSortingControlled = controlledSorting !== undefined;

  const baseColumns = props.columns ?? useDataColumns(props);

  // Wrap sortable headers automatically
  const columnsWithSorting = useMemo(() => {
    if (!enableSorting) {
      return baseColumns;
    }

    return baseColumns.map((col) => {
      // Only wrap if enableSorting is true (default is true, but can be explicitly false)
      const columnSortingEnabled = col.enableSorting !== false;
      if (!columnSortingEnabled) {
        return col;
      }

      // Get current sort state for this column
      const currentSort = sorting.length > 0 ? sorting[0] : null;
      const isSorted = currentSort?.id === col.id;
      const isDesc = currentSort?.desc ?? false;

      // Preserve original header - extract string if it's a string
      const originalHeader = typeof col.header === "string" ? col.header : undefined;

      // Wrap header with SortableHeader
      return {
        ...col,
        header: (header: HeaderContext<T[number], unknown>) => (
          <SortableHeader
            header={header}
            isSorted={isSorted}
            isDesc={isDesc}
            onSort={(columnId, desc) => {
              const newSorting: SortingState = [{ id: columnId, desc }];
              if (isSortingControlled && controlledOnSortingChange) {
                controlledOnSortingChange(newSorting);
              } else {
                setInternalSorting(newSorting);
              }
            }}
            enableSorting={columnSortingEnabled}
            originalHeader={originalHeader}
          />
        ),
      };
    }) as ColumnDef<T[number]>[];
  }, [baseColumns, enableSorting, sorting, isSortingControlled, controlledOnSortingChange]);

  // Add selection column if selectable
  // Include rowSelection in deps so cells re-render when selection changes
  const columns = useMemo(() => {
    if (!selectable) {
      return columnsWithSorting as ColumnDef<T[number]>[];
    }

    const selectionColumn: ColumnDef<T[number]> = {
      id: "select",
      header: ({ table }) => {
        const isAllSelected = table.getIsAllRowsSelected();
        const isSomeSelected = table.getIsSomeRowsSelected();

        return (
          <Checkbox
            checked={isAllSelected}
            indeterminate={isSomeSelected && !isAllSelected}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              e.stopPropagation();
              table.toggleAllRowsSelected(e.target.checked);
            }}
            ariaLabel={isAllSelected ? "Unselect all rows" : "Select all rows"}
          />
        );
      },
      cell: ({ row }) => {
        return (
          <Checkbox
            checked={row.getIsSelected()}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              e.stopPropagation();
              row.toggleSelected(e.target.checked);
            }}
            ariaLabel={row.getIsSelected() ? "Unselect row" : "Select row"}
          />
        );
      },
      size: 20,
      minSize: 20,
      maxSize: 20,
      enableResizing: false,
      enablePinning: false,
      meta: {
        noDivider: true,
      },
    };

    return [selectionColumn, ...columnsWithSorting];
  }, [columnsWithSorting, selectable]);

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
      rowSelection,
      sorting,
    },
    onSortingChange: (updater) => {
      if (isSortingControlled && controlledOnSortingChange) {
        controlledOnSortingChange(updater);
      } else {
        setInternalSorting((old) => {
          const newState = typeof updater === "function" ? updater(old) : updater;
          return newState;
        });
      }
    },
    onColumnVisibilityChange: props.onColumnVisibilityChange,
    onRowSelectionChange: (updater) => {
      if (isControlled && controlledOnRowSelectionChange) {
        // Controlled: call the parent's handler
        controlledOnRowSelectionChange(updater);
      } else {
        // Uncontrolled: update internal state
        setInternalRowSelection((old) => {
          const newState = typeof updater === "function" ? updater(old) : updater;
          return newState;
        });
      }
    },
    enableRowSelection: selectable ? true : undefined,
    getRowId: (row, index) => {
      // Use id if available, otherwise fall back to index
      return (row as any)?.id?.toString() ?? index.toString();
    },
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
  });

  // just for persistence; don't use this as layout input
  useColumnSizing(table, props.cellSizesStorageKey);

  const { columnSizing } = table.getState();
  const rows = table.getRowModel().rows;

  const handleRowClick = useCallback(
    (row?: Row<T[number]>) => {
      // Toggle active row ID: if clicking the same row, deactivate it
      if (row) {
        setActiveRowId((currentActiveId) => (currentActiveId === row.id ? undefined : row.id));
      }
      // Only call onRowClick if selectable is false, or if selectable is true but the click wasn't on the checkbox
      // The checkbox click is already handled by stopPropagation in the checkbox onChange
      props.onRowClick?.(row);
    },
    [props.onRowClick],
  );

  return (
    <div className={styles.container}>
      <DataTableHead table={table} />
      <MemoizedDataTableBody
        rows={rows}
        rowClassName={props.rowClassName}
        onRowClick={handleRowClick}
        columnVisibility={props.columnVisibility}
        columnSizing={columnSizing}
        rowSelection={rowSelection}
        activeRowId={activeRowId}
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
        {group.headers.map((header, index) => {
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

          const noDivider = column.columnDef.meta?.noDivider;
          // Also check if previous column has noDivider to prevent divider between them
          const prevHeader = index > 0 ? group.headers[index - 1] : null;
          const prevNoDivider = prevHeader?.column.columnDef.meta?.noDivider;
          // Don't show divider if this column or previous column has noDivider
          const hideDivider = noDivider || prevNoDivider;

          return (
            <div
              className={cn(
                styles.headCell,
                isPinned && styles.headCellPinned,
                hideDivider && styles.headCellNoDivider,
              )}
              key={header.id}
              style={style}
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
    ))}
  </div>
);

interface DataTableRowProps<T> {
  row: Row<T>;
  className?: string;
  onRowClick?: (row?: Row<T>) => void;
  isSelected?: boolean;
  isActive?: boolean;
}

const DataTableRow = <T,>({ row, className, onRowClick, isSelected, isActive }: DataTableRowProps<T>) => {
  const isError = className?.includes("error") || className?.includes("bodyRowError");

  const handleRowClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't trigger row click if clicking on a checkbox
    const target = e.target as HTMLElement;
    if (target.closest('input[type="checkbox"]') || target.closest(".checkbox")) {
      return;
    }
    onRowClick?.(row);
  };

  return (
    <div
      className={cn(
        styles.bodyRow,
        onRowClick && styles.bodyRowClickable,
        isError && styles.bodyRowError,
        isSelected && styles.bodyRowSelected,
        isActive && styles.bodyRowActive,
        className,
      )}
      onClick={handleRowClick}
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
  rowSelection?: Record<string, boolean>;
  activeRowId?: string;
}

const DataTableBody = <T,>({
  rows,
  onRowClick,
  rowClassName,
  columnVisibility: _columnVisibility, // used to retrigger memo
  columnSizing: _columnSizing,
  rowSelection, // used to retrigger memo when selection changes
  activeRowId,
}: DataTableBodyProps<T>) => {
  return (
    <div className={styles.body}>
      {rows.map((row) => (
        <DataTableRow
          key={row.id}
          row={row}
          className={rowClassName?.(row) ?? ""}
          onRowClick={onRowClick}
          isSelected={rowSelection?.[row.id] === true}
          isActive={activeRowId === row.id}
        />
      ))}
    </div>
  );
};

const MemoizedDataTableBody = memo(DataTableBody, (prev, next) => {
  return (
    prev.rows === next.rows &&
    JSON.stringify(prev.columnVisibility) === JSON.stringify(next.columnVisibility) &&
    JSON.stringify(prev.columnSizing) === JSON.stringify(next.columnSizing) &&
    JSON.stringify(prev.rowSelection) === JSON.stringify(next.rowSelection) &&
    prev.activeRowId === next.activeRowId
  );
}) as typeof DataTableBody;

/**
 * SortableHeader - Header component with optional sort icons
 * Shows sort icon on hover for sortable columns (indicating next sort direction)
 * Shows sort icon always for currently sorted column with direction indicator
 * Works for both sortable and non-sortable columns
 * Follows the same pattern as PeopleList: IconSortUp for desc, IconSortDown for asc
 */
export type SortableHeaderProps<T> = {
  header: HeaderContext<T, unknown>;
  isSorted: boolean;
  isDesc: boolean;
  onSort: (columnId: string, desc: boolean) => void;
  enableSorting: boolean;
  originalHeader?: string | React.ReactNode;
};

export const SortableHeader = <T,>({
  header,
  isSorted,
  isDesc,
  onSort,
  enableSorting,
  originalHeader,
}: SortableHeaderProps<T>) => {
  const [isHovered, setIsHovered] = useState(false);
  const columnId = header.column.id;

  // Get header label - use originalHeader if provided, otherwise try to extract from columnDef
  let headerLabel: string | React.ReactNode = columnId;
  if (originalHeader) {
    headerLabel = originalHeader;
  } else {
    const headerDef = header.column.columnDef.header;
    if (typeof headerDef === "string") {
      headerLabel = headerDef;
    }
  }

  // Show icon on hover or when sorted
  const showSortIcon = enableSorting && (isSorted || isHovered);

  // Determine icon: when sorted, show current direction; when hovering unsorted, show next direction (asc)
  let sortIcon: React.ReactNode;
  if (isSorted) {
    // Currently sorted: show direction (IconSortUp for desc, IconSortDown for asc - matching PeopleList)
    sortIcon = isDesc ? <IconSortUp /> : <IconSortDown />;
  } else {
    // Hovering unsorted column: show next direction (ascending)
    sortIcon = <IconSortDown />;
  }

  const handleClick = () => {
    if (!enableSorting) return;

    if (isSorted) {
      // Toggle direction if already sorted
      onSort(columnId, !isDesc);
    } else {
      // Start sorting ascending
      onSort(columnId, false);
    }
  };

  return (
    <div
      className={`flex items-center justify-between w-full transition-colors duration-150 ${
        enableSorting ? "cursor-pointer hover:bg-neutral-surface-subtler rounded-sm px-1 -mx-1" : ""
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <Typography
        variant="body"
        size="small"
        className={`font-medium transition-colors duration-150 ${
          enableSorting ? "hover:text-neutral-content" : ""
        } ${isSorted ? "text-neutral-content" : ""}`}
      >
        {headerLabel}
      </Typography>
      {showSortIcon && (
        <div
          className="ml-2 flex items-center shrink-0 transition-all duration-150"
          style={{
            color:
              isHovered || isSorted ? "var(--color-neutral-content-subtler)" : "var(--color-neutral-content-subtlest)",
          }}
        >
          {sortIcon}
        </div>
      )}
    </div>
  );
};
