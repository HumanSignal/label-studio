import { useMemo, useState, useEffect, useRef } from "react";
import { flexRender, getCoreRowModel, useReactTable, createColumnHelper } from "@tanstack/react-table";
import type { ColumnDef, Row } from "@tanstack/react-table";

import { userDisplayName } from "@humansignal/core";
import { cnm, IconSparks, Userpic } from "@humansignal/ui";
import type { MSTAnnotation, MSTResult, RawResult } from "../../stores/types";
import { AggregationTableRow } from "./Aggregation";
import { Chip } from "./Chip";
import { renderers } from "./labelings";
import { ResizeHandler } from "./ResizeHandler";
import type { AnnotationSummary, ControlTag, RendererType } from "./types";

type Props = {
  annotations: MSTAnnotation[];
  controls: ControlTag[];
  onSelect: (entity: AnnotationSummary) => void;
  hideInfo: boolean;
};

const cellFn = (control: ControlTag, render: RendererType) => (props: { row: Row<AnnotationSummary> }) => {
  const annotation = props.row.original;
  const results = annotation.results.filter((result) => result.from_name === control.name);
  const content = !results.length ? (
    <span className="text-neutral-content-subtler text-sm">—</span>
  ) : (
    (render?.(results, control) ?? (
      <span className="inline-flex items-center px-2 py-0.5 rounded-4 bg-neutral-surface-subtle text-xs font-medium">
        {results.length} result{results.length > 1 ? "s" : ""}
      </span>
    ))
  );
  return <div className="min-h-[2rem] flex items-center">{content}</div>;
};

const convertPredictionResult = (result: MSTResult) => {
  const json = result.toJSON() as RawResult;
  return {
    ...json,
    // those are real results, so they have full names with @annotation-id postfix
    from_name: json.from_name.replace(/@.*$/, ""),
  };
};

const columnHelper = createColumnHelper<AnnotationSummary>();

export const LabelingSummary = ({ hideInfo, annotations: all, controls, onSelect }: Props) => {
  const currentUser = window.APP_SETTINGS?.user;
  const [showEmpty, setShowEmpty] = useState(true);
  const [countEmpty, setCountEmpty] = useState(false);
  const [popularFirst, setPopularFirst] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const tableRef = useRef<HTMLTableElement>(null);

  const annotations: AnnotationSummary[] = all.map((annotation) => ({
    id: annotation.pk,
    type: annotation.type,
    user: hideInfo ? { email: currentUser?.id === annotation.user?.id ? "Me" : "User" } : annotation.user,
    createdBy:
      annotation.type === "prediction"
        ? annotation.createdBy
        : hideInfo
          ? currentUser?.id === annotation.user?.id
            ? "Me"
            : "User"
          : userDisplayName(annotation.user as Record<string, string>),
    results:
      annotation.type === "prediction"
        ? (annotation.results?.map(convertPredictionResult) ?? [])
        : (annotation.versions.result ?? []),
  }));

  // Filter and sort controls based on toggles
  const processedControls = useMemo(() => {
    let result = [...controls];

    // Filter out empty columns if showEmpty is false
    if (!showEmpty) {
      result = result.filter((control) => {
        const hasResults = annotations.some((ann) => ann.results.some((r) => r.from_name === control.name));
        return hasResults;
      });
    }

    // Sort by popularity if enabled
    if (popularFirst) {
      result = result.sort((a, b) => {
        const aCount = annotations.reduce((sum, ann) => {
          return sum + ann.results.filter((r) => r.from_name === a.name).length;
        }, 0);
        const bCount = annotations.reduce((sum, ann) => {
          return sum + ann.results.filter((r) => r.from_name === b.name).length;
        }, 0);
        return bCount - aCount;
      });
    }

    return result;
  }, [controls, annotations, showEmpty, popularFirst]);

  // Measure initial column widths after first render
  useEffect(() => {
    if (tableRef.current && Object.keys(columnWidths).length === 0) {
      const headers = tableRef.current.querySelectorAll("thead th");
      const widths: Record<string, number> = {};

      headers.forEach((header, index) => {
        const columnId = index === 0 ? "id" : processedControls[index - 1]?.name;
        if (columnId) {
          // Get the computed width
          const width = header.getBoundingClientRect().width;
          widths[columnId] = width;
        }
      });

      setColumnWidths(widths);
    }
  }, [processedControls, columnWidths]);

  const columns = useMemo(() => {
    const columns: ColumnDef<AnnotationSummary, unknown>[] = processedControls.map((control) =>
      columnHelper.display({
        id: control.name,
        header: () => (
          <div>
            <span className="font-semibold text-sm pb-small">{control.name}</span>
            <Chip prefix={control.per_region ? "per-region " : ""} className="px-small ml-2">
              {control.type}
            </Chip>
          </div>
        ),
        cell: cellFn(control, renderers[control.type]),
        size: columnWidths[control.name] || 150,
        minSize: 120,
        maxSize: 600,
      }),
    );
    columns.unshift({
      header: "Annotator",
      accessorKey: "id",
      size: columnWidths.id || 180,
      minSize: 150,
      maxSize: 300,
      cell: ({ row }) => {
        const annotation = row.original;

        return (
          <button
            type="button"
            className="flex gap-tight items-center cursor-pointer hover:bg-neutral-surface-subtle transition-colors p-1 rounded-small -ml-1"
            onClick={() => onSelect(annotation)}
          >
            <Userpic
              user={annotation.user}
              className={annotation.type === "prediction" ? "!bg-accent-plum-subtle text-accent-plum-bold" : ""}
            >
              {annotation.type === "prediction" && <IconSparks size={18} />}
            </Userpic>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{annotation.createdBy}</span>
              {!hideInfo && <span className="text-xs text-neutral-content-subtle">#{annotation.id}</span>}
            </div>
          </button>
        );
      },
    });
    return columns;
  }, [processedControls, onSelect, hideInfo, columnWidths]);

  const table = useReactTable<AnnotationSummary>({
    data: annotations,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    defaultColumn: {
      size: 150, // Default starting size that will fit most content
      minSize: 80,
      maxSize: 800,
    },
  });

  return (
    <div className="mb-base">
      {/* Controls */}
      <div className="hidden gap-base mb-base p-tight bg-neutral-surface-subtle border border-neutral-border rounded-small">
        <label className="flex items-center gap-2 cursor-pointer hover:bg-neutral-surface px-2 py-1 rounded-small transition-colors">
          <input
            type="checkbox"
            checked={showEmpty}
            onChange={(e) => setShowEmpty(e.target.checked)}
            className="cursor-pointer"
          />
          <span className="text-sm font-medium">Show empty</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer hover:bg-neutral-surface px-2 py-1 rounded-small transition-colors">
          <input
            type="checkbox"
            checked={countEmpty}
            onChange={(e) => setCountEmpty(e.target.checked)}
            className="cursor-pointer"
          />
          <span className="text-sm font-medium">Count empty</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer hover:bg-neutral-surface px-2 py-1 rounded-small transition-colors">
          <input
            type="checkbox"
            checked={popularFirst}
            onChange={(e) => setPopularFirst(e.target.checked)}
            className="cursor-pointer"
          />
          <span className="text-sm font-medium">Popular first</span>
        </label>
      </div>

      <div className="overflow-x-auto pb-tight">
        <table
          ref={tableRef}
          className="border border-neutral-border rounded-small w-full"
          style={{
            tableLayout: Object.keys(columnWidths).length > 0 ? "fixed" : "auto",
            borderCollapse: "separate",
            borderSpacing: 0,
            width: "calc(100% - 2px)", // account for border
          }}
        >
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-neutral-border">
                {headerGroup.headers.map((header, index) => (
                  <th
                    key={header.id}
                    style={{
                      position: index === 0 ? "sticky" : "relative",
                      left: index === 0 ? 0 : "auto",
                      width: header.getSize(),
                      minWidth: header.column.columnDef.minSize || 120,
                      maxWidth: header.column.columnDef.maxSize || 600,
                      zIndex: index === 0 ? 20 : 1,
                    }}
                    className={cnm(
                      "px-4 py-2.5 text-left whitespace-nowrap font-semibold text-sm bg-neutral-surface-subtle",
                      index === 0 && "border-r border-neutral-border bg-neutral-surface",
                    )}
                  >
                    <div className="overflow-hidden text-ellipsis flex items-start gap-2">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                    <ResizeHandler header={header} />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {/* Distribution/Aggregation Row */}
            <AggregationTableRow
              headers={table.getHeaderGroups()[0]?.headers ?? []}
              processedControls={processedControls}
              annotations={annotations}
              countEmpty={countEmpty}
            />
            {/* Annotation Rows */}
            {table.getRowModel().rows.map((row, rowIndex) => (
              <tr key={row.id} className="group">
                {row.getVisibleCells().map((cell, cellIndex) => {
                  const isSticky = cellIndex === 0;
                  const isEvenRow = rowIndex % 2 === 0;
                  const isLastRow = rowIndex === table.getRowModel().rows.length - 1;

                  return (
                    <td
                      key={cell.id}
                      style={{
                        position: isSticky ? "sticky" : "relative",
                        left: isSticky ? 0 : "auto",
                        width: cell.column.getSize(),
                        zIndex: isSticky ? 10 : "auto",
                        // @todo fix with proper tailwind classes
                        backgroundColor: isEvenRow ? undefined : "white",
                      }}
                      className={cnm(
                        "px-4 py-2.5 align-top overflow-hidden transition-colors",
                        isEvenRow ? "bg-neutral-surface" : "bg-white",
                        "group-hover:bg-neutral-surface-subtle",
                        !isLastRow && "border-b border-neutral-border-subtle",
                        isSticky && "border-r border-neutral-border",
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
