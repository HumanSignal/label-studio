/**
 * Ground Truth Row — interactive adjudication row in the Annotators × Dimensions table.
 *
 * Always visible at the bottom of the table, prefilled from the inference API.
 * Each categorical cell is an editable Select; non-categorical cells show a
 * read-only dash with a tooltip explaining they are not editable here.
 */

import { useCallback, useMemo, useRef } from "react";
import { cnm, Tooltip, Select, Badge, Button, Dropdown } from "@humansignal/ui";
import type { DropdownRef } from "@humansignal/ui";
import { IconAnnotationGroundTruth } from "@humansignal/icons";
import type { DimensionInfo, GroundTruthCell, GroundTruthSource } from "./types";
import type { ValueCount } from "./use-ground-truth";
import { ValueChips } from "./value-chips";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GroundTruthRowProps {
  dimensions: DimensionInfo[];
  cells: Map<number, GroundTruthCell>;
  valueCounts: Map<number, ValueCount[]>;
  onSetCell: (
    dimensionId: number,
    value: string | number | boolean | null | (string | number | boolean)[],
    source?: GroundTruthSource,
  ) => void;
  onClearCell: (dimensionId: number) => void;
  /** Display name of the annotator who completed the existing GT annotation. */
  annotatorName?: string;
  /** When true, cells display plain text values instead of Select dropdowns. */
  readOnly?: boolean;
  /** Whether the GT row represents a suggestion, saved annotation, unsaved draft,
   *  or undefined (no badge — fresh empty state with no changes). */
  status?: "draft" | "saved" | "suggested";
  /** Returns the current rendered size (px) for a column ID — used to keep
   *  GT row cell widths in sync with the resizable header columns. */
  getColSize?: (id: string) => number;
  /** When status is "draft", called to revert to suggested values. */
  onRevertToSuggestion?: () => void;
  /** When status is "draft", called to clear all dimension values. */
  onClearAllValues?: () => void;
  /** When true, the entire row appears visually disabled (reduced opacity, no pointer events). */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Single ground truth cell
// ---------------------------------------------------------------------------

interface GroundTruthCellComponentProps {
  dimension: DimensionInfo;
  cell: GroundTruthCell | undefined;
  options: ValueCount[];
  onSetCell: (
    value: string | number | boolean | null | (string | number | boolean)[],
    source?: GroundTruthSource,
  ) => void;
  onClearCell: () => void;
  readOnly?: boolean;
  colSize?: number;
}

const GroundTruthCellComponent = ({ dimension, cell, options, onSetCell, onClearCell, readOnly, colSize }: GroundTruthCellComponentProps) => {
  // Build Select-compatible options from backend labels only (dimension.labels).
  // When no config labels exist, fall back to observed values. Counts from
  // valueCounts are shown when available.
  const selectOptions = useMemo(() => {
    const countByValue = new Map(options.map((opt) => [String(opt.value), opt.count]));

    const configLabels = dimension.labels ?? [];
    const observedValues = options.map((opt) => String(opt.value));
    const allValues = configLabels.length > 0 ? configLabels : observedValues;

    return allValues.map((val) => {
      const count = countByValue.get(val);
      return {
        value: val,
        label: count !== undefined ? `${val} (${count})` : val,
      };
    });
  }, [options, dimension.labels]);

  const allowMultiselect = dimension.allowMultiselect ?? false;

  // Map selected string(s) back to original typed value(s)
  const handleChange = useCallback(
    (val: string | string[]) => {
      if (allowMultiselect && Array.isArray(val)) {
        const typed = val.map((s) => {
          const opt = options.find((o) => String(o.value) === s);
          return opt ? opt.value : s;
        });
        onSetCell(typed, "manual");
      } else {
        const s = Array.isArray(val) ? val[0] : val;
        const original = options.find((o) => String(o.value) === s);
        onSetCell(original ? original.value : s, "manual");
      }
    },
    [allowMultiselect, options, onSetCell],
  );

  if (!dimension.isCategorical) {
    return (
      <td
        className="px-4 py-2.5 align-middle text-label-small text-neutral-content-subtlest italic border-t-2 border-neutral-border-bold bg-neutral-surface"
        style={colSize ? { minWidth: colSize } : undefined}
      >
        <Tooltip title="Non-categorical dimension — not available for adjudication in the dashboard">
          <span className="cursor-default">N/A</span>
        </Tooltip>
      </td>
    );
  }

  if (readOnly) {
    return (
      <td
        className="px-4 py-2.5 align-middle text-label-small border-t-2 border-neutral-border-bold bg-neutral-surface"
        style={colSize ? { minWidth: colSize } : undefined}
      >
        <ValueChips value={cell?.value} />
      </td>
    );
  }

  const isResolved = !!cell;

  const bgClass = "bg-neutral-surface";

  const selectValue = isResolved
    ? allowMultiselect && Array.isArray(cell.value)
      ? (cell.value as (string | number | boolean)[]).map(String)
      : cell.value != null
        ? String(cell.value)
        : undefined
    : undefined;

  const selectEl = (
    <Select
      options={selectOptions}
      value={selectValue}
      multiple={allowMultiselect}
      onChange={handleChange as (value: unknown) => void}
      placeholder="Select"
      searchable
      searchPlaceholder="Search values"
      triggerClassName="!bg-transparent !border-none !shadow-none !px-0 !py-0 !h-auto !min-h-0 !w-auto !gap-tightest !text-label-small [&>svg]:!w-3 [&>svg]:!h-3"
      contentClassName="min-w-[160px]"
      renderSelected={(selectedOptions?, placeholder?: string) => {
        if (!isResolved || !selectedOptions?.length) {
          return (
            <span className="text-neutral-content-subtler text-label-small cursor-pointer">
              {placeholder}
            </span>
          );
        }
        return (
          <ValueChips
            value={cell.value}
            className="flex flex-wrap gap-1"
            chipClassName="text-positive-content"
          />
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
      {selectEl}
    </td>
  );
};

// ---------------------------------------------------------------------------
// Main Row Component
// ---------------------------------------------------------------------------

const DraftBadgeMenu = ({
  onRevertToSuggestion,
  onClearAllValues,
  onClose,
}: {
  onRevertToSuggestion: () => void;
  onClearAllValues: () => void;
  onClose: () => void;
}) => (
  <div className="p-tight flex flex-col gap-tightest min-w-[180px]">
    <button
      type="button"
      className="w-full text-left px-base py-tight text-body-small text-neutral-content hover:bg-neutral-surface-hover rounded-base transition-colors cursor-pointer outline-none focus-visible:bg-neutral-surface-hover"
      onClick={() => {
        onRevertToSuggestion();
        onClose();
      }}
    >
      Revert to suggestion
    </button>
    <button
      type="button"
      className="w-full text-left px-base py-tight text-body-small text-neutral-content hover:bg-neutral-surface-hover rounded-base transition-colors cursor-pointer outline-none focus-visible:bg-neutral-surface-hover"
      onClick={() => {
        onClearAllValues();
        onClose();
      }}
    >
      Clear all values
    </button>
  </div>
);

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
  onRevertToSuggestion,
  onClearAllValues,
  disabled,
}: GroundTruthRowProps) => {
  const draftDropdownRef = useRef<DropdownRef | null>(null);

  return (
    <tr className={disabled ? "opacity-50 pointer-events-none" : undefined} style={{ animation: "fadeInRow 200ms ease-out" }}>
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
            status === "draft" && onRevertToSuggestion && onClearAllValues ? (
              <Dropdown.Trigger
                ref={draftDropdownRef}
                alignment="bottom-right"
                content={
                  <DraftBadgeMenu
                    onRevertToSuggestion={onRevertToSuggestion}
                    onClearAllValues={onClearAllValues}
                    onClose={() => draftDropdownRef.current?.close?.()}
                  />
                }
              >
                <Badge variant="warning" shape="squared" className="cursor-pointer">
                  Draft
                </Badge>
              </Dropdown.Trigger>
            ) : (
              <Badge
                variant={status === "draft" ? "warning" : status === "saved" ? "success" : "info"}
                shape="squared"
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            )
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
