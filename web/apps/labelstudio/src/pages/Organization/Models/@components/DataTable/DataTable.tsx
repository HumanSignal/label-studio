import { Block, Elem } from "apps/labelstudio/src/utils/bem";
import { CellContext, ColumnDef, ColumnDefTemplate, ColumnSizingColumnDef, createColumnHelper, DisplayColumnDef, flexRender, getCoreRowModel, StringOrTemplateHeader, Table, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";
import "./DataTable.scss";

type DataShape = Record<string, unknown>[]
type DataTableHeaders<T extends DataShape> = {
  [key in keyof T[number]]?: StringOrTemplateHeader<T[number], unknown>
}

type DataTableCells<T extends DataShape> = {
  [key in keyof T[number]]?: ColumnDefTemplate<CellContext<T[number], unknown>>
}

type DataTableSizes<T extends DataShape> = {
  [key in keyof T[number]]?: ColumnSizingColumnDef
}

type DataTableProps<T extends DataShape> = {
  data: T,
  headers?: DataTableHeaders<T>,
  cells?: DataTableCells<T>
  sizes?: DataTableSizes<T>
  extraColumns?: ColumnDef<any>[]
}

function resolveColumns<T extends DataShape>(
  data: T,
  headers?: DataTableHeaders<T>,
  cells?: DataTableCells<T>,
  sizes?: DataTableSizes<T>,
) {
  const helper = createColumnHelper<DataShape[number]>();

  return Object.keys(data[0]).map((key) => {
    const size = sizes?.[key] ?? {};

    return helper.accessor(key, {
      header: headers?.[key] ? headers[key] : key,
      cell: cells?.[key] ? cells[key] : info => info.getValue(),
      ...size,
    });
  });
}

export const DataTable = function<T extends DataShape>(props: DataTableProps<T>) {
  const columns = useMemo(() => {
    const colDefinitions = resolveColumns(props.data, props.headers, props.cells, props.sizes);

    if (props.extraColumns) colDefinitions.push(...props.extraColumns);
    return colDefinitions;
  }, [props.data, props.headers, props.cells]);

  const table = useReactTable({
    data: props.data,
    columns,
    defaultColumn: {
      minSize: 50,
      maxSize: 300,
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Block name="data-table">
      <DataTableHead table={table}/>
      <DataTableBody table={table}/>
    </Block>
  );
};

const DataTableHead = function<T extends Record<string, unknown>>({
  table,
}: {
  table: Table<T>,
}) {
  return (
    <Elem name="head">
      {table.getHeaderGroups().map((group) => {
        return (
          <Elem name="head-row" key={group.id}>
            {group.headers.map((header) => {
              const { column } = header;
              const autoWidth = column.getSize();
              const width = autoWidth > 0 ? autoWidth : undefined;

              return (
                <Elem name="head-cell" key={header.id} style={{ width, minWidth: width }}>
                  {header.isPlaceholder ? null : flexRender(column.columnDef.header, header.getContext())}
                </Elem>
              );
            })}
          </Elem>
        );
      })}
    </Elem>

  );
};

const DataTableBody = function<T extends Record<string, unknown>>({
  table,
}:{
  table: Table<T>
}) {
  return (
    <Elem name="body">
      {table.getRowModel().rows.map((row) => {
        return (
          <Elem name="body-row" key={row.id}>
            {row.getVisibleCells().map((cell) => {
              const autoWidth = cell.column.getSize();
              const width = autoWidth > 0 ? autoWidth : undefined;

              return (
                <Elem name="body-cell" key={cell.id} style={{ width, minWidth: width }}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Elem>
              );
            })}
          </Elem>
        );
      })}
    </Elem>
  );
};
