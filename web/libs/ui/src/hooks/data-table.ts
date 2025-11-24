import { useMemo } from "react";
import type { Table } from "@tanstack/react-table";
import type { DataShape, DataTableProps } from "../lib/data-table/data-table";
import { resolveColumns, createColumnSizeKey } from "../lib/data-table/tools";

/**
 * Hook to manage column sizing and persistence
 *
 * Converts TanStack Table's column sizes into CSS variables and optionally
 * persists them to localStorage for restoration across page reloads.
 */
export const useColumnSizing = <T extends Record<string, unknown>>(table: Table<T>, storageKey?: string) => {
  const { columnSizingInfo, columnSizing, columnVisibility } = table.getState();

  return useMemo(() => {
    const headers = table.getFlatHeaders();
    const columnSizes: { [key: string]: number } = {};
    const cellSizes: Record<string, Record<string, number>> = {};

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]!;
      const headerSizeKey = createColumnSizeKey("header", header.id);
      const colSizeKey = createColumnSizeKey("col", header.column.id);

      columnSizes[headerSizeKey] = header.getSize();
      columnSizes[colSizeKey] = header.column.getSize();

      if (storageKey) {
        cellSizes[header.id] = { size: columnSizes[headerSizeKey] };
      }
    }

    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(cellSizes));

    return columnSizes;
  }, [columnSizingInfo, columnSizing, columnVisibility, storageKey, table]);
};

/**
 * Hook to generate column definitions from data and configuration
 *
 * Auto-generates column definitions when the user doesn't provide pre-defined columns.
 * Handles column sizing, filtering, ordering, and custom headers/cells.
 */
export const useDataColumns = <T extends DataShape>(props: DataTableProps<T>) => {
  const sizes = useMemo(() => {
    const defaultSizes = {
      ...props.sizes,
    };

    // Provide minimal default for the rest of the columns if not specified
    if (!defaultSizes.restColumns) {
      (defaultSizes as any).restColumns = { minSize: 120 };
    }

    const storedSizes = props?.cellSizesStorageKey
      ? JSON.parse(localStorage.getItem(props?.cellSizesStorageKey) ?? "{}")
      : {};

    const allSizes: Record<string, Record<string, number>> = {};

    for (const key in storedSizes) {
      // if no default size is provided, look for the minSize from a key name restColumns
      let minSize = defaultSizes[key]?.minSize;
      if (!minSize) {
        const restColumnsKey = Object.keys(defaultSizes).find((key) => key.includes("restColumns"));
        if (restColumnsKey) {
          minSize = defaultSizes[restColumnsKey]?.minSize;
        }
      }
      allSizes[key] = { minSize, ...defaultSizes[key], ...storedSizes[key] };
    }

    for (const key in defaultSizes) {
      allSizes[key] = { ...defaultSizes[key], ...storedSizes[key] };
    }

    return allSizes;
  }, [props.sizes, props.includeColumns, props.cellSizesStorageKey]);

  return useMemo(() => {
    const colDefinitions = resolveColumns<T>(
      props.data,
      props.headers,
      props.cells,
      sizes,
      props.includeColumns,
      props.excludeColumns,
      props.columnOrder,
    );

    if (props.extraColumns) colDefinitions.push(...(props.extraColumns as any[]));
    return colDefinitions;
  }, [
    props.data,
    props.headers,
    props.cells,
    sizes,
    props.includeColumns,
    props.excludeColumns,
    props.columnOrder,
    props.extraColumns,
  ]);
};
