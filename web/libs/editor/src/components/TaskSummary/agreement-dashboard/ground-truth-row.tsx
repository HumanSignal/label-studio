/**
 * Ground Truth Row — interactive adjudication row in the Annotators × Dimensions table.
 *
 * Rendered below the Majority Vote row. Each cell can be in one of three states:
 * - Auto-resolved (green check) — filled by auto-accept, click to override
 * - Pending (amber, dropdown trigger) — needs reviewer decision
 * - Manually set (blue check) — reviewer made explicit choice
 *
 * Uses the builtin Select component from @humansignal/ui for the value picker,
 * which portals its dropdown to the document body to avoid overflow clipping.
 */

import { useCallback, useMemo } from "react";
import { cnm, Tooltip, Select, Badge, Button } from "@humansignal/ui";
import { IconAnnotationGroundTruth } from "@humansignal/icons";
import type { DimensionInfo, GroundTruthCell, GroundTruthSource } from "./types";
import type { ValueCount } from "./use-ground-truth";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GroundTruthRowProps {
  dimensions: DimensionInfo[];
  cells: Map<number, GroundTruthCell>;
  valueCounts: Map<number, ValueCount[]>;
  onSetCell: (dimensionId: number, value: string | number | boolean | null, source?: GroundTruthSource) => void;
  onClearCell: (dimensionId: number) => void;
  /** Display name of the annotator who completed the existing GT annotation. */
  annotatorName?: string;
  /** When true, cells display plain text values instead of Select dropdowns. */
  readOnly?: boolean;
  /** Whether the GT row represents a saved annotation, an unsaved draft,
   *  or undefined (no badge — fresh empty state with no changes). */
  status?: "draft" | "saved";
  /** Returns the current rendered size (px) for a column ID — used to keep
   *  GT row cell widths in sync with the resizable header columns. */
  getColSize?: (id: string) => number;
}

// ---------------------------------------------------------------------------
// Single ground truth cell
// ---------------------------------------------------------------------------

interface GroundTruthCellComponentProps {
  dimension: DimensionInfo;
  cell: GroundTruthCell | undefined;
  options: ValueCount[];
  onSetCell: (value: string | number | boolean | null, source?: GroundTruthSource) => void;
  onClearCell: () => void;
  readOnly?: boolean;
  colSize?: number;
}

const GroundTruthCellComponent = ({ dimension, cell, options, onSetCell, onClearCell, readOnly, colSize }: GroundTruthCellComponentProps) => {
  // Build Select-compatible options by merging labeling-config labels with
  // observed ValueCount entries. Config labels define the full canonical set;
  // observed options add "(n)" counts where annotations exist.
  const selectOptions = useMemo(() => {
    const countByValue = new Map(options.map((opt) => [String(opt.value), opt.count]));

    // Start from config labels when available, otherwise fall back to observed values.
    const configLabels = dimension.labels ?? [];
    const observedValues = options.map((opt) => String(opt.value));
    const allValues = configLabels.length > 0
      ? [...new Set([...configLabels, ...observedValues])]
      : observedValues;

    return allValues.map((val) => {
      const count = countByValue.get(val);
      return {
        value: val,
        label: count !== undefined ? `${val} (${count})` : val,
      };
    });
  }, [options, dimension.labels]);

  // Map selected string back to original typed value
  const handleChange = useCallback(
    (val: string) => {
      const original = options.find((o) => String(o.value) === val);
      onSetCell(original ? original.value : val, "manual");
    },
    [options, onSetCell],
  );

  // Non-categorical dimensions are not editable
  if (!dimension.isCategorical) {
    return (
      <td
        className="px-4 py-2.5 align-middle text-label-small text-neutral-content-subtler italic border-t-2 border-neutral-border-bold"
        style={colSize ? { minWidth: colSize } : undefined}
      >
        N/A
      </td>
    );
  }

  if (readOnly) {
    const displayValue = cell ? String(cell.value) : "—";
    return (
      <td
        className="px-4 py-2.5 align-middle text-label-small border-t-2 border-neutral-border-bold"
        style={colSize ? { minWidth: colSize } : undefined}
      >
        <span>{displayValue}</span>
      </td>
    );
  }

  const isResolved = !!cell;
  const isAutoResolved = cell?.source === "auto_unanimous" || cell?.source === "auto_majority";

  const bgClass = "bg-neutral-surface";

  const tooltipText = isResolved
    ? isAutoResolved
      ? `Auto-accepted (${cell.source === "auto_unanimous" ? "unanimous" : "majority"}). Click to override.`
      : "Manually set. Click to change."
    : undefined;

  const selectEl = (
    <Select
      options={selectOptions}
      value={isResolved ? String(cell.value) : undefined}
      onChange={handleChange as any}
      placeholder="Select"
      searchable
      searchPlaceholder="Search values"
      triggerClassName="!bg-transparent !border-none !shadow-none !px-0 !py-0 !h-auto !min-h-0 !w-auto !gap-tightest !text-label-small [&>svg]:!w-3 [&>svg]:!h-3"
      contentClassName="min-w-[160px]"
      renderSelected={(selectedOptions?: any[], placeholder?: string) => {
        if (!isResolved || !selectedOptions?.length) {
          return (
            <span className="text-neutral-content-subtler text-label-small cursor-pointer">
              {placeholder}
            </span>
          );
        }
        return (
          <span className="text-label-small font-medium text-positive-content">
            {String(cell.value)}
          </span>
        );
      }}
      footer={
        <Button
          variant="neutral"
          look="outlined"
          size="small"
          disabled={!isResolved}
          onClick={onClearCell}
        >
          Clear
        </Button>
      }
    />
  );

  return (
    <td
      className={cnm(
        "px-4 py-2.5 align-middle text-label-small border-t-2 border-neutral-border-bold",
        bgClass,
      )}
      style={colSize ? { minWidth: colSize } : undefined}
    >
      {tooltipText ? (
        <Tooltip title={tooltipText}>
          <div>{selectEl}</div>
        </Tooltip>
      ) : (
        selectEl
      )}
    </td>
  );
};

// ---------------------------------------------------------------------------
// Main Row Component
// ---------------------------------------------------------------------------

export const GroundTruthRow = ({
  dimensions,
  cells,
  valueCounts,
  onSetCell,
  onClearCell,
  annotatorName,
  readOnly,
  status,
  getColSize,
}: GroundTruthRowProps) => {
  return (
    <tr style={{ animation: "fadeInRow 200ms ease-out" }}>
      <style>{`@keyframes fadeInRow { from { opacity: 0; } to { opacity: 1; } }`}</style>
      {/* Left label cell */}
      <td
        className="px-4 py-2.5 align-middle text-label-small border-t-2 border-r border-neutral-border-bold sticky left-0 z-10 bg-neutral-surface text-neutral-content"
        style={{ minWidth: getColSize?.("annotator") ?? 160, height: 52 }}
      >
        <div className="flex items-center gap-tight">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-tighter font-medium">
              <IconAnnotationGroundTruth width={16} height={16} style={{ flexShrink: 0, color: "var(--canteloupe_400)" }} />
              <span>Ground Truth</span>
            </div>
            {annotatorName && (
              <div className="text-label-smallest font-normal truncate text-neutral-content-subtler pl-[20px]">
                by {annotatorName}
              </div>
            )}
          </div>
          {status && (
            <Badge variant={status === "draft" ? "warning" : "success"} shape="squared">
              {status === "draft" ? "Draft" : "Saved"}
            </Badge>
          )}
        </div>
      </td>

      {/* Per-dimension cells */}
      {dimensions.map((dim) => {
        const cell = cells.get(dim.dimensionId);
        const dimOptions = valueCounts.get(dim.dimensionId) ?? [];

        return (
          <GroundTruthCellComponent
            key={dim.dimensionId}
            dimension={dim}
            cell={cell}
            options={dimOptions}
            onSetCell={(value, source) => onSetCell(dim.dimensionId, value, source)}
            onClearCell={() => onClearCell(dim.dimensionId)}
            readOnly={readOnly}
            colSize={getColSize?.(`dim-${dim.dimensionId}`)}
          />
        );
      })}
    </tr>
  );
};
