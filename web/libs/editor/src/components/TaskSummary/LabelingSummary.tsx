import { useMemo, useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { flexRender, getCoreRowModel, useReactTable, createColumnHelper } from "@tanstack/react-table";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { observer } from "mobx-react";

import { userDisplayName } from "@humansignal/core";
import { cnm, IconSparks, Skeleton, Userpic } from "@humansignal/ui";
import type { MSTAnnotation, MSTResult, RawResult } from "../../stores/types";
import { AggregationTableRow } from "./Aggregation";
import { Chip } from "./Chip";
import { renderers, jsonPathToTitle } from "./labelings";
import { ResizeHandler } from "./ResizeHandler";
import type { AnnotationSummary, ControlTag, RendererType } from "./types";
import { FF_FIT_720_LAZY_LOAD_ANNOTATIONS } from "@humansignal/core/lib/utils/feature-flags";
import { isFF } from "../../utils/feature-flags";
import { useAnnotationFetcher, annotationKeys } from "../../hooks/useAnnotationQuery";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Get display name for a control column header.
 * For reactcode controls, converts JSONPath to readable title.
 */
const getControlDisplayName = (control: ControlTag): string => {
  if (control.type === "reactcode") {
    return jsonPathToTitle(control.name);
  }
  return control.name;
};

/**
 * FIT-720: Rows that still need GET /api/annotations/:id/ for the summary table.
 * Empty `versions.result` is ambiguous (lazy stub vs legitimately empty submission); once we've
 * applied the detail response we record the pk in `hydratedPks` and stop treating the row as loading.
 */
function needsSummaryHydration(annotation: MSTAnnotation | undefined, hydratedPks: ReadonlySet<string>): boolean {
  if (!annotation?.pk || annotation.userGenerate || annotation.type === "prediction") return false;
  if (hydratedPks.has(String(annotation.pk))) return false;
  if ((annotation as any).is_stub === false) return false;
  const versionsResult = annotation.versions?.result;
  if (Array.isArray(versionsResult) && versionsResult.length > 0) return false;
  return true;
}

type Props = {
  annotations: MSTAnnotation[];
  controls: ControlTag[];
  onSelect: (entity: AnnotationSummary) => void;
  hideInfo: boolean;
  taskId?: number | string;
};

// FIT-720: Observable cell component that reads directly from MST annotation
const ObservableCell = observer(
  ({ annotation, control, render }: { annotation: AnnotationSummary; control: ControlTag; render: RendererType }) => {
    if (isFF(FF_FIT_720_LAZY_LOAD_ANNOTATIONS) && annotation._isStub) {
      return <SkeletonCell controlType={control.type} />;
    }

    // Read directly from MST annotation if available (for MobX reactivity)
    const mstAnnotation = annotation._mstAnnotation;
    const isPrediction = mstAnnotation?.type === "prediction" || annotation.type === "prediction";

    // Get the results - read from MST annotation for MobX tracking
    let allResults: RawResult[] = [];

    if (mstAnnotation) {
      if (isPrediction) {
        // Predictions have results in a different format
        allResults =
          mstAnnotation.results?.map((r: MSTResult) => {
            const json = r.toJSON() as RawResult;
            return { ...json, from_name: json.from_name.replace(/@.*$/, "") };
          }) ?? [];
      } else {
        // Regular annotations - read from versions.result (this is MobX tracked)
        allResults = mstAnnotation.versions?.result ?? [];
      }
    } else {
      allResults = annotation.results ?? [];
    }

    // For reactcode controls, results are associated with the tag name (to_name), not the JSONPath (name)
    const filterKey = control.type === "reactcode" ? control.to_name : control.name;
    // Filter results for this specific control
    const results = allResults.filter((result: RawResult) => result.from_name === filterKey);

    const content = !results.length ? (
      <span className="text-neutral-content-subtler text-sm">—</span>
    ) : (
      (render?.(results, control) ?? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-4 bg-neutral-surface-active text-xs font-medium">
          {results.length} result{results.length > 1 ? "s" : ""}
        </span>
      ))
    );
    return <div className="min-h-[2rem] flex items-center">{content}</div>;
  },
);

const convertPredictionResult = (result: MSTResult) => {
  const json = result.toJSON() as RawResult;
  return {
    ...json,
    // those are real results, so they have full names with @annotation-id postfix
    from_name: json.from_name.replace(/@.*$/, ""),
  };
};

// FIT-720: Skeleton loader for table cells - renders chip-like skeletons for label controls,
// simple bars for other types
const SkeletonCell = ({ controlType }: { controlType?: string }) => {
  // For label-type controls, show chip-like skeleton shapes
  if (controlType?.endsWith("labels")) {
    return (
      <div className="min-h-[2rem] flex items-center gap-1.5 flex-wrap">
        <Skeleton className="h-5 w-16 rounded-small" />
        <Skeleton className="h-5 w-12 rounded-small" />
      </div>
    );
  }

  // For choices/taxonomy, show smaller chips
  if (controlType === "choices" || controlType === "taxonomy") {
    return (
      <div className="min-h-[2rem] flex items-center gap-1.5">
        <Skeleton className="h-5 w-20 rounded-small" />
      </div>
    );
  }

  // Default: simple bar skeleton
  return (
    <div className="min-h-[2rem] flex items-center">
      <Skeleton className="h-4 w-3/5 rounded-small" />
    </div>
  );
};

// FIT-720: Skeleton loader for the Annotator column (first column)
const AnnotatorSkeletonCell = () => (
  <div className="flex gap-tight items-center p-1 -ml-1">
    <Skeleton className="h-6 w-6 rounded-full shrink-0" />
    <div className="flex flex-col gap-1">
      <Skeleton className="h-3.5 w-20 rounded-small" />
      <Skeleton className="h-3 w-12 rounded-small" />
    </div>
  </div>
);

const columnHelper = createColumnHelper<AnnotationSummary>();

export const LabelingSummary = observer(({ hideInfo, annotations: all, controls, onSelect, taskId }: Props) => {
  const VIRTUAL_DEFAULT_ROW_HEIGHT = 52;
  const VIRTUAL_OVERSCAN = 12;
  const currentUser = (window as any).APP_SETTINGS?.user;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [scrollTop, setScrollTop] = useState(0);
  const [virtualRowHeight, setVirtualRowHeight] = useState(VIRTUAL_DEFAULT_ROW_HEIGHT);
  const tableRef = useRef<HTMLTableElement>(null);
  const allAnnotationsRef = useRef(all);

  allAnnotationsRef.current = all;

  /** PKs for which Task Summary has applied GET /api/annotations/:id/ (including empty `result: []`). */
  const summaryHydratedPksRef = useRef<Set<string>>(new Set());

  /** When order / membership changes without length changing (MST can reorder in place). */
  const annotationRowSignature = all.map((a) => (a.pk != null ? String(a.pk) : "")).join(",");

  /** Stable for Aggregation overflow layout: avoids effect running every parent render (new `annotations` array identity). */
  const aggregationContentKey = all
    .map((a) => {
      const pendingStub = needsSummaryHydration(a, summaryHydratedPksRef.current);
      const stub = pendingStub ? "1" : "0";
      const n = Array.isArray(a.versions?.result) ? a.versions.result.length : 0;
      return `${a.pk ?? ""}:${n}:${stub}`;
    })
    .join("|");

  // FIT-720: Single source of truth for GET /api/annotations/:id/ — TanStack Query only (no parallel ref “hydrated” cache).
  const queryClient = useQueryClient();
  const { fetchAnnotationCached } = useAnnotationFetcher();
  const containerRef = useRef<HTMLDivElement>(null);
  /** Scrollport for the summary table (virtual window + vertical scroll). */
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);

  // FIT-720: Hydration state - use refs to avoid stale closures
  const [, forceUpdate] = useState(0);
  /** Avoid a full table re-render per hydrated row (was overwhelming React / layout with 1000+ annotations). */
  const tableRefreshRaf = useRef<number | null>(null);
  const scheduleTableRefresh = useCallback(() => {
    if (tableRefreshRaf.current != null) return;
    tableRefreshRaf.current = requestAnimationFrame(() => {
      tableRefreshRaf.current = null;
      forceUpdate((n) => n + 1);
    });
  }, []);

  /** Last `dataUpdatedAt` from TanStack we applied to MST — avoids duplicate deserializes when the query snapshot is unchanged. */
  const lastAppliedQueryDataUpdatedAt = useRef<Map<string, number>>(new Map());

  /** Prevents concurrent duplicate hydrate runs for the same pk (deserialize would duplicate results on existing areas). */
  const hydrationInFlight = useRef<Set<number | string>>(new Set());

  /** Latest `shouldHydrateWhenVisible` for the virtual-slice layout effect (avoids stale closures). */
  const hydrateGateRef = useRef<(a: MSTAnnotation | undefined) => boolean>(() => false);

  const hydrateAnnotation = useCallback(
    async (annotation: MSTAnnotation) => {
      if (!annotation.pk) return;
      const id = annotation.pk;
      const idKey = String(id);

      if (hydrationInFlight.current.has(id)) return;
      hydrationInFlight.current.add(id);

      try {
        const fullAnnotation = await fetchAnnotationCached(id);
        const state = queryClient.getQueryState(annotationKeys.detail(id));
        const updatedAt = state?.dataUpdatedAt ?? 0;
        if (lastAppliedQueryDataUpdatedAt.current.get(idKey) === updatedAt) {
          if (!summaryHydratedPksRef.current.has(idKey)) {
            summaryHydratedPksRef.current.add(idKey);
            scheduleTableRefresh();
          }
          return;
        }
        if (!fullAnnotation) {
          return;
        }

        const result = Array.isArray(fullAnnotation.result) ? fullAnnotation.result : [];

        const anno = annotation as any;
        if (anno.versions) {
          anno.versions.result = result;
        }
        if (anno.is_stub !== undefined) {
          anno.is_stub = false;
        }
        anno.history?.freeze?.();
        anno.deleteAllRegions?.({ deleteReadOnly: true });
        anno.deserializeResults?.(result);
        anno.updateObjects?.();
        anno.history?.safeUnfreeze?.();
        anno.reinitHistory?.();

        lastAppliedQueryDataUpdatedAt.current.set(idKey, updatedAt);
        summaryHydratedPksRef.current.add(idKey);
        scheduleTableRefresh();
      } catch (error: any) {
        if (error?.name === "CancelledError" || error?.revert === true) {
          return;
        }
      } finally {
        hydrationInFlight.current.delete(id);
      }
    },
    [fetchAnnotationCached, queryClient, scheduleTableRefresh],
  );

  // Only react when new data lands in the TanStack cache (`success`). Other `updated` actions (`fetch`, `invalidate`, …)
  // fire constantly and were scheduling hundreds of hydrates → main-thread lock when switching Summary ↔ annotation.
  useEffect(() => {
    if (!isFF(FF_FIT_720_LAZY_LOAD_ANNOTATIONS)) return;
    const cache = queryClient.getQueryCache();
    return cache.subscribe((event: { type?: string; query?: { queryKey?: unknown[] }; action?: { type?: string } }) => {
      if (event?.type !== "updated" || event?.action?.type !== "success") return;
      const q = event.query;
      const k = q?.queryKey;
      if (!Array.isArray(k) || k[0] !== "annotations" || k.length < 2) return;
      const pk = String(k[1]);
      const ann = allAnnotationsRef.current.find((a) => a.pk != null && String(a.pk) === pk);
      if (!ann || ann.type === "prediction" || ann.userGenerate) return;
      void hydrateAnnotation(ann);
    });
  }, [queryClient, hydrateAnnotation]);

  /**
   * Whether this annotation should be fetched for the current virtual window.
   * Stubs always need a fetch; non-stubs only when TanStack says the detail query is stale (e.g. after save).
   */
  const shouldHydrateWhenVisible = useCallback(
    (annotation: MSTAnnotation | undefined): boolean => {
      if (!annotation?.pk || annotation.type === "prediction" || annotation.userGenerate) return false;
      if (needsSummaryHydration(annotation, summaryHydratedPksRef.current)) return true;
      const state = queryClient.getQueryState(annotationKeys.detail(annotation.pk)) as
        | { isStale?: boolean }
        | undefined;
      return Boolean(state?.isStale);
    },
    [queryClient],
  );

  useEffect(() => {
    lastAppliedQueryDataUpdatedAt.current.clear();
    summaryHydratedPksRef.current.clear();
  }, [taskId]);

  hydrateGateRef.current = shouldHydrateWhenVisible;

  // FIT-720: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tableRefreshRaf.current != null) {
        cancelAnimationFrame(tableRefreshRaf.current);
        tableRefreshRaf.current = null;
      }
    };
  }, []);

  // Update container height on mount
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const availableHeight = window.innerHeight - rect.top - 100;
      setContainerHeight(Math.max(300, Math.min(availableHeight, 500)));
    }
  }, []);

  useEffect(() => {
    setScrollTop(0);
  }, [taskId]);

  // Create annotation summaries - re-computed when annotations change
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
    _isStub: isFF(FF_FIT_720_LAZY_LOAD_ANNOTATIONS) && needsSummaryHydration(annotation, summaryHydratedPksRef.current),
    // FIT-720: Keep reference to MST annotation for MobX reactivity in cells
    _mstAnnotation: annotation,
  }));

  // Measure initial column widths after first render
  useEffect(() => {
    if (tableRef.current && Object.keys(columnWidths).length === 0) {
      const headers = tableRef.current.querySelectorAll("thead th");
      const widths: Record<string, number> = {};

      headers.forEach((header, index) => {
        const columnId = index === 0 ? "id" : controls[index - 1]?.name;
        if (columnId) {
          // Get the computed width
          const width = header.getBoundingClientRect().width;
          widths[columnId] = width;
        }
      });

      setColumnWidths(widths);
    }
  }, [controls, columnWidths]);

  // FIT-720: Create cell renderer - ObservableCell checks actual data presence
  const createCellFn = useCallback((control: ControlTag, render: RendererType) => {
    return (props: { row: Row<AnnotationSummary> }) => {
      const annotation = props.row.original;
      return <ObservableCell annotation={annotation} control={control} render={render} />;
    };
  }, []);

  const columns = useMemo(() => {
    const columns: ColumnDef<AnnotationSummary, unknown>[] = controls.map((control) =>
      columnHelper.display({
        id: control.name,
        header: () => (
          <div>
            <span className="font-semibold text-sm pb-small">{getControlDisplayName(control)}</span>
            <Chip prefix={control.per_region ? "per-region " : ""} className="px-small ml-2">
              {control.type}
            </Chip>
          </div>
        ),
        cell: createCellFn(control, renderers[control.type]),
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

        // FIT-720: Show skeleton for stub annotations that haven't been hydrated yet
        if (annotation._isStub && isFF(FF_FIT_720_LAZY_LOAD_ANNOTATIONS)) {
          return <AnnotatorSkeletonCell />;
        }

        return (
          <button
            type="button"
            className="flex gap-tight items-center cursor-pointer hover:bg-neutral-surface-active transition-colors p-1 rounded-small -ml-1"
            onClick={async () => {
              const mstAnnotation = annotation._mstAnnotation;
              if (
                isFF(FF_FIT_720_LAZY_LOAD_ANNOTATIONS) &&
                mstAnnotation &&
                needsSummaryHydration(mstAnnotation, summaryHydratedPksRef.current)
              ) {
                await hydrateAnnotation(mstAnnotation);
              }
              onSelect(annotation);
            }}
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
  }, [controls, onSelect, hideInfo, columnWidths, createCellFn, hydrateAnnotation]);

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
  const tableRows = table.getRowModel().rows;
  const totalRows = tableRows.length;
  const virtualVisibleRows = Math.ceil(containerHeight / virtualRowHeight) + VIRTUAL_OVERSCAN * 2;
  const virtualStart = Math.max(0, Math.floor(scrollTop / virtualRowHeight) - VIRTUAL_OVERSCAN);
  const virtualEnd = Math.min(totalRows, virtualStart + virtualVisibleRows);
  const virtualRows = tableRows.slice(virtualStart, virtualEnd);
  const virtualPaddingTop = virtualStart * virtualRowHeight;
  const virtualPaddingBottom = Math.max(0, (totalRows - virtualEnd) * virtualRowHeight);

  // We can't calculate aggregation for reactcode controls for now, so we hide it if there are no other tags
  const hideAggregation = useMemo(() => {
    if (controls.length === 0) return true;
    return controls.every((control) => control.type === "reactcode");
  }, [controls]);

  // Do not depend on virtualStart/virtualRowHeight: scrolling re-ran this on every slice change and
  // height ↔ virtual window could oscillate (different first-row content heights) → max update depth.
  useLayoutEffect(() => {
    const tbody = tableRef.current?.querySelector("tbody");
    if (!tbody) return;
    const firstAnnotationRow = tbody.querySelector("tr[data-annotation-pk]") as HTMLTableRowElement | null;
    if (!firstAnnotationRow) return;
    const measuredHeight = Math.round(firstAnnotationRow.getBoundingClientRect().height);
    if (measuredHeight <= 0) return;
    setVirtualRowHeight((prev) => (Math.abs(measuredHeight - prev) > 1 ? measuredHeight : prev));
  }, [annotationRowSignature, hideAggregation]);

  // FIT-720: Drive stub hydration from the virtual row window, not IntersectionObserver.
  // IO with root = nested overflow + <table> (sticky cells) often keeps isIntersecting false in Chromium,
  // so summary rows never crossed the old “visibility threshold” and GET /api/annotations/:id/ never ran.
  // virtualStart/virtualEnd already match rendered rows. Call hydrate directly — `hydrationInFlight` and
  // `lastAppliedQueryDataUpdatedAt` dedupe concurrent / duplicate work.
  useLayoutEffect(() => {
    if (!isFF(FF_FIT_720_LAZY_LOAD_ANNOTATIONS)) return;
    const gate = hydrateGateRef.current;

    for (let i = virtualStart; i < virtualEnd; i++) {
      const ann = allAnnotationsRef.current[i];
      if (ann == null) continue;
      if (gate(ann)) {
        void hydrateAnnotation(ann);
      }
    }
  }, [taskId, annotationRowSignature, hideAggregation, virtualStart, virtualEnd, hydrateAnnotation]);

  const TableRow = useCallback(
    ({ row, rowIndex, totalRows }: { row: Row<AnnotationSummary>; rowIndex: number; totalRows: number }) => {
      const annotation = all[rowIndex];
      const annotationPkAttr = annotation?.pk != null ? String(annotation.pk) : undefined;

      const isEvenRow = rowIndex % 2 === 0;
      const isLastRow = rowIndex === totalRows - 1;

      return (
        <tr className="group" {...(annotationPkAttr != null ? { "data-annotation-pk": annotationPkAttr } : {})}>
          {row.getVisibleCells().map((cell, cellIndex) => {
            const isSticky = cellIndex === 0;

            return (
              <td
                key={cell.id}
                style={{
                  position: isSticky ? "sticky" : "relative",
                  left: isSticky ? 0 : "auto",
                  width: cell.column.getSize(),
                  zIndex: isSticky ? 10 : "auto",
                }}
                className={cnm(
                  "px-4 py-2.5 align-top overflow-hidden transition-colors",
                  isEvenRow ? "bg-neutral-surface" : "bg-neutral-background",
                  "group-hover:bg-neutral-surface-hover",
                  !isLastRow && "border-b border-neutral-border-subtle",
                  isSticky && "border-r border-neutral-border",
                )}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            );
          })}
        </tr>
      );
    },
    [all],
  );

  return (
    <div className="mb-base min-w-0" ref={containerRef}>
      <div
        ref={scrollAreaRef}
        className="w-full min-w-0 max-w-full border border-neutral-border rounded-small"
        onScroll={(e) => {
          setScrollTop(e.currentTarget.scrollTop);
        }}
        style={{
          maxHeight: containerHeight,
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative",
        }}
      >
        <table
          ref={tableRef}
          className="w-full min-w-0 max-w-full"
          style={{
            tableLayout: Object.keys(columnWidths).length > 0 ? "fixed" : "auto",
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          {/* Sticky Header - z-20 to be above all row content */}
          <thead
            className="bg-neutral-surface-active"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
            }}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <th
                    key={header.id}
                    style={{
                      position: index === 0 ? "sticky" : "relative",
                      left: index === 0 ? 0 : "auto",
                      width: header.getSize(),
                      minWidth: header.column.columnDef.minSize || 120,
                      maxWidth: header.column.columnDef.maxSize || 600,
                      zIndex: index === 0 ? 30 : 20, // All header cells need z-index for proper stacking
                      background: "var(--color-neutral-surface-active)", // Solid background to prevent content bleed-through
                    }}
                    className={cnm(
                      hideAggregation ? "border-b border-neutral-border" : "",
                      "px-4 py-2.5 text-left whitespace-nowrap font-semibold text-sm bg-neutral-surface-active",
                      index === 0 && "border-r border-neutral-border",
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
            {!hideAggregation && (
              <AggregationTableRow
                headers={table.getHeaderGroups()[0]?.headers ?? []}
                controls={controls}
                annotations={annotations}
                aggregationContentKey={aggregationContentKey}
                taskId={taskId}
              />
            )}
            {virtualPaddingTop > 0 && (
              <tr>
                <td colSpan={table.getVisibleLeafColumns().length} style={{ height: virtualPaddingTop, padding: 0 }} />
              </tr>
            )}
            {/* Annotation Rows */}
            {virtualRows.map((row, rowIndex) => (
              <TableRow key={row.id} row={row} rowIndex={virtualStart + rowIndex} totalRows={totalRows} />
            ))}
            {virtualPaddingBottom > 0 && (
              <tr>
                <td
                  colSpan={table.getVisibleLeafColumns().length}
                  style={{ height: virtualPaddingBottom, padding: 0 }}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});
