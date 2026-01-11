import {
  type Table,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type Row,
  type ColumnDef,
  type TableMeta,
  type VisibilityState,
  type HeaderContext,
  type SortingState,
} from "@tanstack/react-table";

// Extend ColumnMeta to include noDivider
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    noDivider?: boolean;
  }
}
import { memo, useState, useMemo, useCallback } from "react";
import { cn } from "../../utils/utils";
import { useColumnSizing, useDataColumns } from "../../hooks/data-table";
import { Checkbox } from "../checkbox/checkbox";
import { Typography } from "../typography/typography";
import { Tooltip } from "../Tooltip/Tooltip";
import { IconSortUp, IconSortDown, IconSearch, IconInfoOutline } from "@humansignal/icons";
import { EmptyState } from "../empty-state/empty-state";
import { Skeleton } from "../skeleton/skeleton";
import styles from "./data-table.module.scss";

export type DataShape = Record<string, any>[];

/**
 * Extended ColumnDef type that includes custom properties for generic DataTable
 */
export type ExtendedDataTableColumnDef<T> = ColumnDef<T> & {
  help?: string; // Optional help text to display in a tooltip with info icon
};

export type DataTableProps<T extends DataShape> = {
  data: T;
  meta?: TableMeta<any>;
  columns?: ExtendedDataTableColumnDef<T[number]>[];
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
  isRowSelectable?: (row: Row<T[number]>) => boolean; // Function to determine if a row checkbox should be shown/selectable
  onSelectAllChange?: (checked: boolean, selectableRowsCount: number) => void; // Called when header checkbox changes, before default selection logic
  invertedSelectionEnabled?: boolean; // When true, header checkbox appears checked (for "select all" mode even when no rows are selectable)
  // Sorting props
  sorting?: SortingState;
  onSortingChange?: (updater: SortingState | ((old: SortingState) => SortingState)) => void;
  enableSorting?: boolean; // Global enable/disable sorting
  // Empty state props
  /** Empty state configuration when no data is available */
  emptyState?: {
    /** Icon to display (defaults to IconSearch) */
    icon?: React.ReactNode;
    /** Title text (defaults to "No items found") */
    title?: string;
    /** Description text (defaults to "Try adjusting your search or clearing the filters to see more results.") */
    description?: string;
    /** Action buttons or other interactive elements */
    actions?: React.ReactNode;
  };
  /** Whether data is currently loading */
  isLoading?: boolean;
  /** Number of skeleton rows to show when loading (default: 5) */
  loadingRows?: number;
  /** Optional className to apply to the table container */
  className?: string;
  /** Test ID for the table container */
  dataTestId?: string;
  /** Controlled active row ID - when provided, controls which row is active */
  activeRowId?: string;
};

/**
 * Calculate column style for consistent width handling across header, body, and skeleton cells
 */
const getColumnStyle = (size: number, minSize: number, maxSize: number | undefined) => ({
  width: `${size}px`,
  minWidth: `${minSize}px`,
  maxWidth: maxSize ? `${maxSize}px` : undefined,
  flex: `0 0 ${size}px`,
});

export const DataTable = <T extends DataShape>(props: DataTableProps<T>) => {
  const {
    selectable = false,
    rowSelection: controlledRowSelection,
    onRowSelectionChange: controlledOnRowSelectionChange,
    sorting: controlledSorting,
    onSortingChange: controlledOnSortingChange,
    enableSorting = true,
    isRowSelectable,
    onSelectAllChange,
    invertedSelectionEnabled,
    loadingRows = 5,
    className,
    dataTestId,
    activeRowId: controlledActiveRowId,
  } = props;
  const [internalRowSelection, setInternalRowSelection] = useState<Record<string, boolean>>({});
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);

  // Restore column sizes from localStorage if storageKey is provided
  const restoredColumnSizing = useMemo(() => {
    if (!props.cellSizesStorageKey) return {};

    try {
      const stored = localStorage.getItem(props.cellSizesStorageKey);
      if (!stored) return {};

      const cellSizes = JSON.parse(stored) as Record<string, { size: number }>;
      const columnSizing: Record<string, number> = {};

      // Convert stored format { [columnId]: { size: number } } to TanStack format { [columnId]: number }
      for (const [columnId, sizeData] of Object.entries(cellSizes)) {
        if (sizeData?.size && typeof sizeData.size === "number") {
          columnSizing[columnId] = sizeData.size;
        }
      }

      return columnSizing;
    } catch (error) {
      console.warn("Failed to restore column sizes from localStorage:", error);
      return {};
    }
  }, [props.cellSizesStorageKey]);

  const [internalColumnSizing, setInternalColumnSizing] = useState<Record<string, number>>(restoredColumnSizing);

  // Use controlled activeRowId ONLY if onRowClick is provided (parent controls state via clicks)
  // Active state should only be enabled when rows are clickable
  // When onRowClick is provided, activeRowId is read-only for display purposes
  const isActiveRowControlled = props.onRowClick !== undefined;
  const activeRowId = isActiveRowControlled ? (controlledActiveRowId ?? undefined) : undefined;

  // Use controlled selection if provided, otherwise use internal state
  const rowSelection = controlledRowSelection ?? internalRowSelection;
  const isControlled = controlledRowSelection !== undefined;

  // Use controlled sorting if provided, otherwise use internal state
  const sorting = controlledSorting ?? internalSorting;
  const isSortingControlled = controlledSorting !== undefined;

  const baseColumns = props.columns ?? useDataColumns(props);

  // Wrap all headers with unified Header component
  const columnsWithHeaders = useMemo(() => {
    return baseColumns.map((col) => {
      // TanStack Table uses accessorKey as id if id is not explicitly set
      const extendedCol = col as ExtendedDataTableColumnDef<T[number]>;
      const columnId =
        extendedCol.id ||
        ("accessorKey" in extendedCol && extendedCol.accessorKey ? String(extendedCol.accessorKey) : undefined);

      // Get current sort state for this column
      const currentSort = sorting.length > 0 ? sorting[0] : null;
      const isSorted = currentSort?.id === columnId;
      const isDesc = currentSort?.desc ?? false;

      // Determine if sorting is enabled for this column
      const columnSortingEnabled = enableSorting && col.enableSorting === true;

      // Preserve original header - extract string if it's a string
      const originalHeader = typeof col.header === "string" ? col.header : undefined;

      // Wrap all headers with unified Header component
      return {
        ...col,
        enableSorting: columnSortingEnabled, // Explicitly set enableSorting on column definition for TanStack
        header: (headerContext: HeaderContext<T[number], unknown>) => (
          <Header
            header={headerContext}
            isSorted={isSorted}
            isDesc={isDesc}
            enableSorting={columnSortingEnabled}
            originalHeader={originalHeader}
            help={extendedCol.help}
          />
        ),
      };
    }) as ColumnDef<T[number]>[];
  }, [baseColumns, enableSorting, sorting, isSortingControlled, controlledOnSortingChange]);

  // Add selection column if selectable
  // Include rowSelection in deps so cells re-render when selection changes
  const columns = useMemo(() => {
    if (!selectable) {
      return columnsWithHeaders as ColumnDef<T[number]>[];
    }

    const selectionColumn: ColumnDef<T[number]> = {
      id: "select",
      header: ({ table }) => {
        // Get all rows that can be selected (excluding disabled rows)
        const selectableRows = table.getRowModel().rows.filter((row) => row.getCanSelect());
        const selectedSelectableRows = selectableRows.filter((row) => row.getIsSelected());

        // Calculate checkbox state: use invertedSelectionEnabled if provided, otherwise calculate normally
        const calculatedIsAllSelected =
          selectableRows.length > 0 && selectedSelectableRows.length === selectableRows.length;
        const calculatedIsSomeSelected =
          selectedSelectableRows.length > 0 && selectedSelectableRows.length < selectableRows.length;

        // When invertedSelectionEnabled is true, checkbox is checked (select all mode)
        // When false/undefined, use calculated state
        const isAllSelected =
          invertedSelectionEnabled !== undefined ? invertedSelectionEnabled : calculatedIsAllSelected;
        const isSomeSelected = invertedSelectionEnabled ? false : calculatedIsSomeSelected; // Don't show indeterminate in inverted mode

        return (
          <label
            className="flex justify-center cursor-pointer size-[48px] -m-tight"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isAllSelected}
              indeterminate={isSomeSelected}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                e.stopPropagation();

                // Call custom handler if provided (allows parent to handle special cases)
                if (onSelectAllChange) {
                  onSelectAllChange(e.target.checked, selectableRows.length);
                }

                // Build new selection state with only selectable rows
                const newSelection: Record<string, boolean> = {};

                if (e.target.checked) {
                  // Select all selectable rows
                  selectableRows.forEach((row) => {
                    newSelection[row.id] = true;
                  });
                }
                // If unchecking, newSelection stays empty (deselect all)

                // Update selection state in one go
                table.setRowSelection(newSelection);
              }}
              ariaLabel={isAllSelected ? "Unselect all rows" : "Select all rows"}
              data-testid="data-table-select-all"
            />
          </label>
        );
      },
      cell: ({ row }) => {
        const canSelect = row.getCanSelect();

        // Hide checkbox completely for disabled rows
        if (!canSelect) {
          return null;
        }

        return (
          <label
            className="flex justify-center cursor-pointer size-[48px] -m-tight"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={row.getIsSelected()}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                e.stopPropagation();
                row.toggleSelected(e.target.checked);
              }}
              ariaLabel={row.getIsSelected() ? "Unselect row" : "Select row"}
              data-testid={`data-table-row-${row.id}-select`}
            />
          </label>
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

    return [selectionColumn, ...columnsWithHeaders];
  }, [columnsWithHeaders, selectable]);

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
      columnSizing: internalColumnSizing,
    },
    onColumnSizingChange: (updater) => {
      setInternalColumnSizing((old) => {
        const newState = typeof updater === "function" ? updater(old) : updater;
        return newState;
      });
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
    enableRowSelection: selectable
      ? isRowSelectable
        ? (row) => isRowSelectable(row) // If isRowSelectable is provided, enable selection based on the function
        : true
      : undefined,
    getRowId: (row, index) => {
      // Use id if available, otherwise fall back to index
      // Note: 'row' parameter is the row data object itself, not a Row object
      const rowId = (row as any)?.id;
      return rowId !== undefined ? String(rowId) : String(index);
    },
    columnResizeMode: "onChange",
    enableSorting: enableSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // just for persistence; don't use this as layout input
  useColumnSizing(table, props.cellSizesStorageKey);

  const { columnSizing } = table.getState();
  const rows = table.getRowModel().rows;

  const handleRowClick = useCallback(
    (row?: Row<T[number]>) => {
      // Call parent's onRowClick handler if provided
      if (props.onRowClick) {
        props.onRowClick(row);
      }
      // Active state is only enabled when onRowClick is provided
      // No internal state management for active rows
    },
    [props.onRowClick],
  );

  // Check if we should show empty state
  const showEmptyState = rows.length === 0 && !props.isLoading && props.emptyState;

  return (
    <div className={cn(styles.container, className)} data-testid={dataTestId}>
      <DataTableHead table={table} />
      {props.isLoading ? (
        <DataTableSkeletonBody
          table={table}
          loadingRows={loadingRows}
          columnSizing={columnSizing}
          selectable={selectable}
        />
      ) : showEmptyState ? (
        <div className={styles.body}>
          <EmptyState
            className="px-wide py-widest"
            size="small"
            variant="warning"
            icon={props.emptyState?.icon ?? <IconSearch />}
            title={props.emptyState?.title ?? "No items found"}
            description={
              props.emptyState?.description ?? "Try adjusting your search or clearing the filters to see more results."
            }
            actions={props.emptyState?.actions}
          />
        </div>
      ) : (
        <MemoizedDataTableBody
          rows={rows}
          rowClassName={props.rowClassName}
          onRowClick={props.onRowClick ? handleRowClick : undefined}
          columnVisibility={props.columnVisibility}
          columnSizing={columnSizing}
          rowSelection={rowSelection}
          activeRowId={activeRowId}
        />
      )}
    </div>
  );
};

interface DataTableHeadProps<T> {
  table: Table<T>;
}

const DataTableHead = <T extends Record<string, unknown>>({ table }: DataTableHeadProps<T>) => {
  return (
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

            // Check if this column is sortable
            const isSortable = column.getCanSort();

            // Calculate column style
            const style = getColumnStyle(size, minSize, maxSize);

            const noDivider = column.columnDef.meta?.noDivider;
            // Also check if previous column has noDivider to prevent divider between them
            const prevHeader = index > 0 ? group.headers[index - 1] : null;
            const prevNoDivider = prevHeader?.column.columnDef.meta?.noDivider;
            // Don't show divider if this column or previous column has noDivider
            const hideDivider = noDivider || prevNoDivider;

            // Custom click handler for sorting that only toggles between asc/desc (doesn't clear)
            const handleHeaderClick = isSortable
              ? () => {
                  const currentSort = column.getIsSorted();
                  if (currentSort === "asc") {
                    column.toggleSorting(true); // Sort descending
                  } else {
                    column.toggleSorting(false); // Sort ascending
                  }
                }
              : undefined;

            return (
              <div
                className={cn(
                  styles.headCell,
                  isPinned && styles.headCellPinned,
                  hideDivider && styles.headCellNoDivider,
                  isSortable && styles.headCellSortable,
                )}
                key={header.id}
                style={style}
                data-testid={`data-table-header-${header.id}`}
              >
                <div className={styles.headCellContent} onClick={handleHeaderClick}>
                  {header.isPlaceholder ? null : flexRender(column.columnDef.header, header.getContext())}
                </div>

                {group.headers[group.headers.length - 1]?.id !== header.id && column.id !== "select" && (
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
};

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
      onClick={onRowClick ? handleRowClick : undefined}
      data-testid={`data-table-row-${row.id}`}
    >
      {row.getVisibleCells().map((cell) => {
        const isPinned = cell.column.getIsPinned();
        const columnDef = cell.column.columnDef;
        const minSize = columnDef.minSize ?? 50;
        const maxSize = columnDef.maxSize ?? 1200;
        const size = cell.column.getSize();

        // Calculate column style
        const style = getColumnStyle(size, minSize, maxSize);

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
 * DataTableSkeletonBody - Renders skeleton loading rows
 * Displayed when table is loading and has no data
 */
interface DataTableSkeletonBodyProps<T> {
  table: Table<T>;
  loadingRows: number;
  columnSizing: Record<string, number>;
  selectable: boolean;
}

const DataTableSkeletonBody = <T,>({
  table,
  loadingRows,
  columnSizing: _columnSizing,
  selectable: _selectable,
}: DataTableSkeletonBodyProps<T>) => {
  const headerGroups = table.getHeaderGroups();
  const headers = headerGroups[0]?.headers || [];

  // Render one of 4 skeleton patterns based on column index
  const renderSkeletonPattern = (columnIndex: number) => {
    // Cycle through 4 patterns using modulo
    const patternIndex = columnIndex % 4;

    switch (patternIndex) {
      case 0:
        // Pattern 1: Circle + line
        return (
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 flex-shrink-0" />
            <Skeleton className="h-4 rounded w-[150px]" />
          </div>
        );
      case 1:
        // Pattern 2: Long line
        return <Skeleton className="h-4 rounded w-[90%]" />;
      case 2:
        // Pattern 3: Line + square at the end
        return (
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 rounded w-[100px]" />
            <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
          </div>
        );
      case 3:
        // Pattern 4: Short line
        return <Skeleton className="h-4 rounded w-1/2" />;
      default:
        return <Skeleton className="h-4 rounded w-2/3" />;
    }
  };

  return (
    <div className={styles.body}>
      {Array.from({ length: loadingRows }).map((_, rowIndex) => (
        <div className={styles.bodyRow} key={rowIndex}>
          {headers.map((header, columnIndex) => {
            const { column } = header;
            const isPinned = column.getIsPinned();
            const columnDef = column.columnDef;
            const minSize = columnDef.minSize ?? 50;
            const maxSize = columnDef.maxSize ?? 1200;
            const size = header.getSize();

            // Calculate column style
            const style = getColumnStyle(size, minSize, maxSize);

            // For selection column, show empty cell
            if (column.id === "select") {
              return (
                <div className={cn(styles.bodyCell, isPinned && styles.bodyCellPinned)} key={header.id} style={style}>
                  <div className="w-4 h-4" />
                </div>
              );
            }

            // Adjust column index to account for select column
            const patternColumnIndex = headers[0]?.column.id === "select" ? columnIndex - 1 : columnIndex;

            return (
              <div className={cn(styles.bodyCell, isPinned && styles.bodyCellPinned)} key={header.id} style={style}>
                {renderSkeletonPattern(patternColumnIndex)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/**
 * Header - Unified header component for all columns
 * Renders the complete header cell structure with optional sorting
 * All headers use the same structure, only hover styles and sort icons differ
 */
export type HeaderProps<T> = {
  header: HeaderContext<T, unknown>;
  isSorted?: boolean;
  isDesc?: boolean;
  enableSorting?: boolean;
  originalHeader?: string | React.ReactNode;
  help?: string; // Optional help text to display in a tooltip with info icon
};

export const Header = <T,>({
  header,
  isSorted = false,
  isDesc = false,
  enableSorting = false,
  originalHeader,
  help,
}: HeaderProps<T>) => {
  // Get header label - use originalHeader if provided, otherwise try to extract from columnDef
  let headerLabel: string | React.ReactNode = undefined;
  if (originalHeader !== undefined) {
    headerLabel = originalHeader;
  } else {
    const headerDef = header.column.columnDef.header;
    if (typeof headerDef === "string") {
      headerLabel = headerDef;
    }
  }

  // If no header label is defined, render nothing
  if (headerLabel === undefined) {
    return null;
  }

  const headerContent = (
    <div className={cn(styles.headerContent, help && "gap-tighter")}>
      <div className="flex items-center gap-2">
        <Typography variant="label" size="small" className={cn(isSorted && styles.headerTextSorted)}>
          {headerLabel}
        </Typography>
        {help && (
          <Tooltip title={help} alignment="top-center">
            <IconInfoOutline width={18} height={18} className="text-neutral-content-subtler cursor-help shrink-0" />
          </Tooltip>
        )}
      </div>
      {enableSorting && (
        <div className={cn(styles.headerIcon, isSorted === true && styles.headerIconVisible)}>
          {isSorted ? isDesc ? <IconSortUp /> : <IconSortDown /> : <IconSortDown />}
        </div>
      )}
    </div>
  );

  if (!enableSorting) {
    return headerContent;
  }

  return headerContent;
};
