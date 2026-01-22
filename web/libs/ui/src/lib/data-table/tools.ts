import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import type { DataShape, DataTableHeaders, DataTableCells, DataTableSizes } from "./data-table";

/**
 * Resolves the columns from the input data.
 * Applies ordering and filtering to the columns.
 */
export function resolveColumns<T extends DataShape>(
  data: T,
  headers?: DataTableHeaders<T>,
  cells?: DataTableCells<T>,
  sizes?: DataTableSizes<T>,
  includeColumns?: (keyof T[number])[],
  excludeColumns?: (keyof T[number])[],
  columnOrder?: (keyof T[number])[],
): ColumnDef<Record<string, unknown>, T[number][string]>[] {
  if (!data?.length) return [];

  const helper = createColumnHelper<DataShape[number]>();
  const keys = getDataKeys(Object.keys(data[0]), columnOrder as string[]);
  const finalColumns = filterColumns(keys, includeColumns, excludeColumns);

  return finalColumns.map((key) => {
    const header = headers?.[key] ?? key;
    const cell = cells?.[key] ?? cells?.restCells ?? ((info) => info.getValue() ?? "");
    const rest = sizes?.[key] ?? sizes?.restColumns ?? {};

    return helper.accessor(key, {
      id: key,
      header,
      cell,
      ...rest,
    });
  });
}

function filterColumns<T extends DataShape>(
  columns: string[],
  includeColumns?: (keyof T[number])[],
  excludeColumns?: (keyof T[number])[],
): string[] {
  if (includeColumns && includeColumns.length > 0) return columns.filter((column) => includeColumns.includes(column));
  if (excludeColumns && excludeColumns.length > 0) return columns.filter((column) => !excludeColumns.includes(column));

  return columns;
}

function getDataKeys(keys: string[], order?: string[]): string[] {
  if (order) {
    const list = [...order];
    const restKeys = keys.filter((key) => !list.includes(key));
    const restPosition = list.indexOf("#restColumns");

    if (restPosition > -1) {
      // replace placeholder with rest of the keys
      list.splice(restPosition, 1, ...restKeys);
    } else {
      // append rest of the keys to the end
      list.push(...restKeys);
    }
    return list;
  }

  return keys;
}

/**
 * Creates a CSS variable key for column sizing
 */
export const createColumnSizeKey = (type: "header" | "col", id: string) => {
  // Replace any whitespace or special characters with underscores
  const sanitizedId = id.replace(/[^a-zA-Z0-9]/g, "_");
  return `--${type}-${sanitizedId}-size`;
};
