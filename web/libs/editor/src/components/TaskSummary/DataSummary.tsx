import { useMemo } from "react";
import { flexRender, getCoreRowModel, useReactTable, createColumnHelper } from "@tanstack/react-table";
import { JsonViewer } from "@humansignal/ui";
import { Chip } from "./Chip";
import { ResizeHandler } from "./ResizeHandler";
import type { ObjectTypes } from "./types";

export const DataSummary = ({ data_types }: { data_types: ObjectTypes }) => {
  const data: Record<string, any> = useMemo(() => {
    return Object.fromEntries(Object.entries(data_types).map(([field, { value }]) => [field, value]));
  }, [data_types]);

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<Record<string, any>>();

    return Object.entries(data_types).map(([field, { type }]) =>
      columnHelper.accessor(field, {
        id: field,
        header: () => (
          <>
            {field} <Chip>{type}</Chip>
          </>
        ),
        cell: ({ getValue }) => {
          const value = getValue();

          // super simple support for images, audio, and video
          // @todo create a proper data type handler for all data types
          if (type === "image") {
            return <img src={value} alt={field} className="w-full" />;
          }

          if (type === "audio") {
            // biome-ignore lint/a11y/useMediaCaption: that's user's media, captions can't be used
            return <audio src={value} controls className="w-full" />;
          }

          if (type === "video") {
            // biome-ignore lint/a11y/useMediaCaption: that's user's media, captions can't be used
            return <video src={value} controls className="w-full" />;
          }

          // Arrays: List, Paragraphs, Timeseries values
          // Objects: Table, JSON-like structures with nested dictionaries
          if (typeof value === "object" && value !== null) {
            return (
              <JsonViewer
                data={value}
                showSearch={false}
                showFilters={false}
                showCopyButton={false}
                minHeight={100}
                maxHeight={300}
              />
            );
          }

          return value;
        },
        size: 300,
        maxSize: 800,
      }),
    );
  }, [data_types]);

  const table = useReactTable({
    data: [data],
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    defaultColumn: {
      minSize: 80,
      maxSize: 800,
    },
  });

  return (
    <div className="overflow-x-auto pb-tight mb-base">
      <div className="border border-neutral-border rounded-small overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-surface">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-2 overflow-hidden text-ellipsis text-left whitespace-nowrap font-normal relative"
                    style={{ minWidth: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    <ResizeHandler header={header} />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="even:bg-neutral-surface">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-2 overflow-hidden text-ellipsis align-top"
                    style={{ minWidth: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
