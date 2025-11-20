import { useMemo } from "react";
import { flexRender, getCoreRowModel, useReactTable, createColumnHelper } from "@tanstack/react-table";
import { cnm } from "@humansignal/ui";
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

          // List: [{ id: <id>, body: text, title: text }, ...]
          // Paragraphs: [{ <nameKey>: name, <textKey>: text }, ...]
          if (Array.isArray(value)) {
            return JSON.stringify(value);
          }

          // Timeseries: <channel name>: [array of values]
          // Table: <key>: <value>
          if (typeof value === "object") {
            return Object.entries(value)
              .map(([key, value]) => `${key}: ${String(value).substring(0, 300)}`)
              .join("\n");
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
      <div className="border border-neutral-border rounded-small border-collapse overflow-hidden w-max">
        <div>
          {table.getHeaderGroups().map((headerGroup) => (
            <div
              key={headerGroup.id}
              className={cnm(
                "flex [&>*]:flex-shrink-0 [&>*]:px-4 [&>*]:py-2 bg-neutral-surface",
                "[&>*]:overflow-hidden [&>*]:text-ellipsis [&>*]:text-left [&>*]:whitespace-nowrap",
              )}
            >
              {headerGroup.headers.map((header) => (
                <div
                  key={header.id}
                  style={{
                    width: header.getSize(),
                    position: "relative",
                  }}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  <ResizeHandler header={header} />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div>
          {table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className={cnm(
                "flex [&>*]:flex-shrink-0 even:bg-neutral-surface [&_td]:align-top [&>*]:px-4 [&>*]:py-2",
                "[&>*]:overflow-hidden [&>*]:text-ellipsis",
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <div key={cell.id} style={{ width: cell.column.getSize() }}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
