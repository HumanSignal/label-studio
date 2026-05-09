import { useMemo, useState, useEffect, useRef, useCallback } from "react";
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
import { useAnnotationFetcher } from "../../hooks/useAnnotationQuery";

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

    // FIT-720: Check if this is a stub that needs hydration
    const isStubFlag = (mstAnnotation as any)?.is_stub;
    const wasHydrated = isStubFlag === false;
    const isStubFromBackend = isStubFlag === true;
    const hasNoData = allResults.length === 0;
    const isStub =
      !isPrediction && !mstAnnotation?.userGenerate && annotation.id && isStubFromBackend && hasNoData && !wasHydrated;

    // Show skeleton for stubs that haven't been hydrated yet
    if (isStub && isFF(FF_FIT_720_LAZY_LOAD_ANNOTATIONS)) {
      return <SkeletonCell controlType={control.type} />;
    }

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

// FIT-720: Check if an annotation is a stub that needs hydration
const isAnnotationStub = (annotation: MSTAnnotation): boolean => {
  if (!annotation.pk || annotation.userGenerate) return false;
  if (annotation.type === "prediction") return false;
  // If is_stub was explicitly set to false, it was already hydrated (even if empty)
  if ((annotation as any).is_stub === false) return false;
  const versionsResult = annotation.versions?.result;
  const hasVersionsResult = Array.isArray(versionsResult) && versionsResult.length > 0;
  return !hasVersionsResult;
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
  const currentUser = (window as any).APP_SETTINGS?.user;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const tableRef = useRef<HTMLTableElement>(null);

  // FIT-720: Use TanStack Query for annotation fetching
  const { fetchAnnotationCached, getCachedAnnotation } = useAnnotationFetcher();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);

  // FIT-720: Hydration state - use refs to avoid stale closures
  const [, forceUpdate] = useState(0);
  // Single Set to track ALL annotation IDs we've ever attempted to fetch - prevents ALL duplicates
  const fetchAttemptedIds = useRef<Set<number | string>>(new Set());
  const hydratedIds = useRef<Set<number | string>>(new Set());
  // FIT-720: Track debounce timers for pending hydrations (before fetch starts)
  const pendingHydrationTimers = useRef<Map<number | string, ReturnType<typeof setTimeout>>>(new Map());

  // FIT-720: Cancel pending hydration for an annotation (only cancels timer, not in-flight request)
  const cancelHydration = useCallback((id: number | string) => {
    // Cancel any pending timer (before fetch started)
    const timer = pendingHydrationTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      pendingHydrationTimers.current.delete(id);
      // Remove from attempted so it can be re-scheduled when back in view
      fetchAttemptedIds.current.delete(id);
    }
    // Note: We don't cancel in-flight requests - let them complete and cache
  }, []);

  // FIT-720: Hydrate a single annotation using TanStack Query (called after debounce)
  const hydrateAnnotation = useCallback(
    async (annotation: MSTAnnotation) => {
      if (!annotation.pk) return;
      const id = annotation.pk;

      // Skip if already hydrated
      if (hydratedIds.current.has(id)) return;

      try {
        // Use TanStack Query's ensureQueryData - returns cached data or fetches
        const fullAnnotation = await fetchAnnotationCached(id);

        if (fullAnnotation?.result !== undefined) {
          // Cast to any for MST methods not in type definitions
          const anno = annotation as any;

          // FIT-720: Update versions.result directly so the summary table can read it
          if (anno.versions) {
            anno.versions.result = fullAnnotation.result;
          }

          // FIT-720: Clear the is_stub flag so we don't show skeleton
          if (anno.is_stub !== undefined) {
            anno.is_stub = false;
          }

          anno.history?.freeze?.();
          anno.deserializeResults?.(fullAnnotation.result);
          anno.updateObjects?.();
          anno.history?.safeUnfreeze?.();
          anno.reinitHistory?.();
        }

        // Mark as hydrated regardless of result (even empty results are valid)
        hydratedIds.current.add(id);
        forceUpdate((n) => n + 1);
      } catch (error: any) {
        // Silently ignore cancellation errors
        if (error?.name === "CancelledError" || error?.revert === true) {
          return;
        }
        // Don't mark as hydrated on error so it can be retried
      }
    },
    [fetchAnnotationCached],
  );

  // FIT-720: Schedule hydration after debounce delay (row must stay in view)
  const scheduleHydration = useCallback(
    (annotation: MSTAnnotation) => {
      if (!annotation.pk) return;
      const id = annotation.pk;

      // Single check: skip if we've already attempted to fetch this annotation
      // This prevents ALL duplicates - no race conditions possible
      if (fetchAttemptedIds.current.has(id)) return;

      // Mark as attempted IMMEDIATELY - before any async operations
      fetchAttemptedIds.current.add(id);

      // Schedule hydration after 200ms debounce
      const timer = setTimeout(() => {
        pendingHydrationTimers.current.delete(id);
        hydrateAnnotation(annotation);
      }, 200);

      pendingHydrationTimers.current.set(id, timer);
    },
    [hydrateAnnotation],
  );

  // FIT-720: Cleanup - cancel all pending timers on unmount
  useEffect(() => {
    return () => {
      // Cancel all pending hydration timers
      pendingHydrationTimers.current.forEach((timer) => clearTimeout(timer));
      pendingHydrationTimers.current.clear();
    };
  }, []);

  // FIT-720: On mount, initialize hydratedIds with annotations that already have data
  // This handles the case where user navigated away and came back - restore from MST or cache
  useEffect(() => {
    if (!isFF(FF_FIT_720_LAZY_LOAD_ANNOTATIONS)) return;

    all.forEach((annotation) => {
      if (!annotation.pk) return;
      // Skip predictions and user-generated annotations
      if (annotation.type === "prediction" || annotation.userGenerate) return;

      const id = annotation.pk;

      // Check if annotation already has data in MST (from previous hydration)
      const versionsResult = annotation.versions?.result;
      const hasDataInMST = Array.isArray(versionsResult) && versionsResult.length > 0;

      if (hasDataInMST) {
        // This annotation was previously hydrated and retained its data
        hydratedIds.current.add(id);
        fetchAttemptedIds.current.add(id);
        // Clear stub flag if it was set
        if ((annotation as any).is_stub !== undefined) {
          (annotation as any).is_stub = false;
        }
        return;
      }

      // Check if we have cached data in TanStack Query that can be used
      const cachedData = getCachedAnnotation(id);
      if (cachedData?.result !== undefined) {
        // Restore data from cache to MST annotation
        const anno = annotation as any;
        if (anno.versions) {
          anno.versions.result = cachedData.result;
        }
        if (anno.is_stub !== undefined) {
          anno.is_stub = false;
        }
        // Only deserialize if there's actual result data
        if (cachedData.result && cachedData.result.length > 0) {
          anno.history?.freeze?.();
          anno.deserializeResults?.(cachedData.result);
          anno.updateObjects?.();
          anno.history?.safeUnfreeze?.();
          anno.reinitHistory?.();
        }
        hydratedIds.current.add(id);
        fetchAttemptedIds.current.add(id);
      }
    });

    // Trigger re-render to reflect any restored data
    forceUpdate((n) => n + 1);
  }, []); // Only run once on mount - 'all' dependency would cause re-runs

  // Update container height on mount
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const availableHeight = window.innerHeight - rect.top - 100;
      setContainerHeight(Math.max(300, Math.min(availableHeight, 500)));
    }
  }, []);

  // FIT-720: Initial hydration is handled by IntersectionObserver in TableRow
  // No need for a separate useEffect that scans visible rows - this was causing duplicate requests

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
    // FIT-720: Track hydration state for skeleton rendering
    _isStub: isAnnotationStub(annotation),
    _isHydrating: fetchAttemptedIds.current.has(annotation.pk) && !hydratedIds.current.has(annotation.pk),
    _isHydrated: hydratedIds.current.has(annotation.pk),
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
  }, [controls, onSelect, hideInfo, columnWidths, createCellFn]);

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

  // We can't calculate aggregation for reactcode controls for now, so we hide it if there are no other tags
  const hideAggregation = useMemo(() => {
    if (controls.length === 0) return true;
    return controls.every((control) => control.type === "reactcode");
  }, [controls]);

  // FIT-720: Row component with IntersectionObserver for lazy loading
  const TableRow = useCallback(
    ({ row, rowIndex, totalRows }: { row: Row<AnnotationSummary>; rowIndex: number; totalRows: number }) => {
      const rowRef = useRef<HTMLTableRowElement>(null);
      const annotation = all[rowIndex];
      const isStub = annotation && isAnnotationStub(annotation);

      // Use IntersectionObserver to detect when row enters/leaves viewport
      useEffect(() => {
        if (!isFF(FF_FIT_720_LAZY_LOAD_ANNOTATIONS)) return;
        if (!annotation || !rowRef.current) return;

        const annotationId = annotation.pk;
        const element = rowRef.current;

        const observer = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (!entry) return;

            if (entry.isIntersecting) {
              if (isStub) {
                scheduleHydration(annotation);
              }
            } else {
              cancelHydration(annotationId);
            }
          },
          {
            threshold: 0.1,
            rootMargin: "100px 0px",
          },
        );

        observer.observe(element);
        return () => {
          observer.disconnect();
          cancelHydration(annotationId);
        };
      }, [annotation, isStub]);

      const isEvenRow = rowIndex % 2 === 0;
      const isLastRow = rowIndex === totalRows - 1;

      return (
        <tr ref={rowRef} key={row.id} className="group">
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
    [all, scheduleHydration, cancelHydration],
  );

  return (
    <div className="mb-base" ref={containerRef}>
      <div
        className="border border-neutral-border rounded-small"
        style={{
          maxHeight: containerHeight,
          overflowY: "auto",
          overflowX: "auto",
          position: "relative",
        }}
      >
        <table
          ref={tableRef}
          className="w-full"
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
                taskId={taskId}
              />
            )}
            {/* Annotation Rows */}
            {table.getRowModel().rows.map((row, rowIndex) => (
              <TableRow key={row.id} row={row} rowIndex={rowIndex} totalRows={table.getRowModel().rows.length} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
