/**
 * Ground Truth Row — interactive adjudication row in the Annotators × Dimensions table.
 *
 * Always visible at the bottom of the table. In "draft" state it shows
 * editable selectors (with the clear-winner baseline pre-populated); in
 * "saved" state it shows read-only values.
 *
 * Also exports `MajorityVoteRow` — a read-only row that displays the
 * inferred majority vote values with annotator counts.
 */

import { useCallback, useMemo } from "react";
import { cnm, Tooltip, Select, Badge, Button } from "@humansignal/ui";
import { IconAnnotationGroundTruth } from "@humansignal/icons";
import type { DimensionInfo, GroundTruthCell, GroundTruthSource } from "./types";
import type { ValueCount } from "./use-ground-truth";
import { ValueChips, VALUE_CHIP_CLASS } from "./value-chips";

// ---------------------------------------------------------------------------
// Shared type for per-dimension label colors passed through from the config
// ---------------------------------------------------------------------------

type DimensionLabelColors = Map<string, Record<string, { background?: string; border?: string; color?: string }>>;

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
  /** Whether the GT row represents a saved annotation or an unsaved draft. */
  status?: "draft" | "saved";
  /** Returns the current rendered size (px) for a column ID — used to keep
   *  GT row cell widths in sync with the resizable header columns. */
  getColSize?: (id: string) => number;
  /** When true, the entire row appears visually disabled (reduced opacity, no pointer events). */
  disabled?: boolean;
  /** Display name/email of the current user (shown in the draft subtitle). */
  currentUserName?: string;
  /** Per-dimension label colors: dimension name -> label_attrs. */
  dimensionLabelColors?: DimensionLabelColors;
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
  labelColors?: Record<string, { background?: string; border?: string; color?: string }>;
}

const GroundTruthCellComponent = ({
  dimension,
  cell,
  options,
  onSetCell,
  onClearCell,
  readOnly,
  colSize,
  labelColors,
}: GroundTruthCellComponentProps) => {
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
        className="px-4 py-2.5 align-top text-label-small text-neutral-content-subtlest italic border-t-2 border-neutral-border-bold bg-neutral-surface"
        style={colSize ? { minWidth: colSize } : undefined}
      >
        <Tooltip title={`${dimension.controlTag} can't be used for most common answer`}>
          <span className="cursor-default">N/A</span>
        </Tooltip>
      </td>
    );
  }

  if (readOnly) {
    return (
      <td
        className="px-4 py-2.5 align-top text-label-small border-t-2 border-neutral-border-bold bg-neutral-surface"
        style={colSize ? { minWidth: colSize } : undefined}
      >
        <ValueChips value={cell?.value} labelColors={labelColors} />
      </td>
    );
  }

  const isResolved = !!cell;
  // Auto_majority cells were prefilled from the most common answer rather than chosen
  // by the reviewer. Style them differently so it's obvious which values still need
  // confirmation. Once the reviewer changes the value, source flips to "manual".
  const isPreselected = isResolved && cell.source === "auto_majority";

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
            <span className="text-neutral-content text-label-small cursor-pointer py-tightest">{placeholder}</span>
          );
        }
        const chips = (
          <ValueChips
            value={cell.value}
            className={cnm("flex flex-wrap gap-1", isPreselected && "italic")}
            chipClassName={isPreselected ? "text-neutral-content-subtle" : "text-positive-content"}
            labelColors={labelColors}
          />
        );
        return isPreselected ? (
          <Tooltip title="Pre-selected from the most common answer. Click to confirm or change.">{chips}</Tooltip>
        ) : (
          chips
        );
      }}
      footer={
        <Button variant="neutral" look="outlined" size="small" disabled={!isResolved} onClick={onClearCell}>
          Clear
        </Button>
      }
    />
  );

  return (
    <td
      className={cnm("px-4 py-2.5 align-top text-label-small border-t-2 border-neutral-border-bold", bgClass)}
      style={colSize ? { minWidth: colSize } : undefined}
    >
      {selectEl}
      {!dimension.isRequired && (
        <div className="text-label-smallest text-neutral-content-subtler italic mt-tightest">optional</div>
      )}
    </td>
  );
};

// ---------------------------------------------------------------------------
// Majority Vote Row (read-only)
// ---------------------------------------------------------------------------

interface MajorityVoteRowProps {
  dimensions: DimensionInfo[];
  mostCommonValues: Map<number, unknown>;
  mostCommonCounts: Map<number, { count: number; total: number }>;
  getColSize?: (id: string) => number;
  dimensionLabelColors?: DimensionLabelColors;
}

export const MajorityVoteRow = ({
  dimensions,
  mostCommonValues,
  mostCommonCounts,
  getColSize,
  dimensionLabelColors,
}: MajorityVoteRowProps) => (
  <tr>
    <td
      className="px-4 py-2.5 align-middle text-label-small font-semibold text-neutral-content bg-neutral-background border-t border-r border-neutral-border sticky left-0 z-10"
      style={{ minWidth: getColSize?.("annotator") ?? 160 }}
    >
      Most Common Answer
    </td>
    {dimensions.map((dim) => {
      if (!dim.isCategorical) {
        return (
          <td
            key={dim.dimensionId}
            className="px-4 py-2.5 align-middle text-label-small text-neutral-content-subtlest italic bg-neutral-background border-t border-neutral-border"
            style={{ minWidth: getColSize?.(`dim-${dim.dimensionId}`) }}
          >
            <Tooltip title={`${dim.controlTag} can't be used for most common answer`}>
              <span className="cursor-default">N/A</span>
            </Tooltip>
          </td>
        );
      }

      const value = mostCommonValues.get(dim.dimensionId);
      const count = mostCommonCounts.get(dim.dimensionId);
      const countLabel = count ? `(${count.count}/${count.total})` : null;

      return (
        <td
          key={dim.dimensionId}
          className="px-4 py-2.5 align-middle text-label-small bg-neutral-background border-t border-neutral-border"
          style={{ minWidth: getColSize?.(`dim-${dim.dimensionId}`) }}
        >
          {value !== null && value !== undefined ? (
            <div className="flex flex-wrap items-center gap-1">
              <ValueChips
                value={value}
                className="flex flex-wrap gap-1"
                labelColors={dimensionLabelColors?.get(dim.name)}
              />
              {countLabel && (
                <span className="text-neutral-content-subtler text-label-smallest font-normal">{countLabel}</span>
              )}
            </div>
          ) : (
            <span className={cnm(VALUE_CHIP_CLASS, "text-neutral-content-subtler")}>—</span>
          )}
        </td>
      );
    })}
  </tr>
);

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
  disabled,
  currentUserName,
  dimensionLabelColors,
}: GroundTruthRowProps) => {
  return (
    <tr
      className={disabled ? "opacity-50 pointer-events-none" : undefined}
      style={{ animation: "fadeInRow 200ms ease-out" }}
    >
      <style>{"@keyframes fadeInRow { from { opacity: 0; } to { opacity: 1; } }"}</style>
      {/* Left label cell */}
      <td
        className="px-4 py-2.5 align-top text-label-small border-t-2 border-r border-neutral-border-bold sticky left-0 z-10 bg-neutral-surface text-neutral-content"
        style={{ minWidth: getColSize?.("annotator") ?? 160, minHeight: 52 }}
      >
        <div className="flex items-start gap-tight">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-tighter font-medium">
              <IconAnnotationGroundTruth
                width={16}
                height={16}
                style={{ flexShrink: 0, color: "var(--canteloupe_400)" }}
              />
              <span className="mr-tighter">Ground Truth</span>
              {status === "draft" ? (
                <Badge variant="warning" shape="squared">
                  draft
                </Badge>
              ) : status === "saved" ? (
                <Badge variant="success" shape="squared">
                  Saved
                </Badge>
              ) : null}
            </div>
            {annotatorName ? (
              <div className="text-label-smallest font-normal truncate text-neutral-content-subtler pl-[20px]">
                by {annotatorName}
              </div>
            ) : status === "draft" && currentUserName ? (
              <div className="text-label-smallest font-normal truncate text-neutral-content-subtler pl-[20px]">
                by {currentUserName}
              </div>
            ) : null}
          </div>
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
            labelColors={dimensionLabelColors?.get(dim.name)}
          />
        );
      })}
    </tr>
  );
};
