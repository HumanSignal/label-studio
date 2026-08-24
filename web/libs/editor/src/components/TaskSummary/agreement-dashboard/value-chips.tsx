/**
 * Shared value-to-chip display for the agreement dashboard.
 *
 * Normalizes dimension values (scalar, flat array, nested array e.g. taxonomy paths,
 * or label-count maps from spatial dimensions) to a consistent chip representation
 * and renders them with the same styling as the annotators × dimensions table.
 */

import { useEffect, useRef, useState } from "react";
import { cnm, Tooltip } from "@humansignal/ui";
import { Chip } from "../Chip";

/** Fallback border for the thick left edge when no labelColors are provided. */
const DEFAULT_CHIP_BORDER = "var(--color-neutral-border)";

/** Cap chip width so a single long value cannot blow out the table layout. */
const CHIP_MAX_WIDTH_CLASS = "max-w-[30vw]";

/** Hard cap for tooltip body length so a multi-KB value cannot fill the screen. */
const TOOLTIP_TEXT_LIMIT = 2000;

/** Wider than the default 250px so long truncated values stay readable. */
const TOOLTIP_MAX_WIDTH = "min(50vw, 600px)";

const truncateForTooltip = (text: string): string =>
  text.length > TOOLTIP_TEXT_LIMIT ? `${text.slice(0, TOOLTIP_TEXT_LIMIT)}…` : text;

/** Flatten a nested array to a single level of strings (for joining inside one chip). */
function flattenToStrings(arr: unknown[]): string[] {
  const out: string[] = [];
  for (const item of arr) {
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      out.push(String(item));
    } else if (Array.isArray(item)) {
      out.push(...flattenToStrings(item));
    }
  }
  return out;
}

const NESTED_JOIN = " / ";

/** Structured chip data: label text with an optional region count. */
interface ChipData {
  label: string;
  count?: number;
}

/**
 * Detect whether value is a label-count map produced by the backend for spatial
 * dimensions: `{ "LabelName": { "count": N }, ... }`.
 */
function isLabelCountMap(value: unknown): value is Record<string, { count: number }> {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const entries = Object.values(value as Record<string, unknown>);
  return (
    entries.length > 0 &&
    entries.every(
      (v) =>
        v !== null &&
        typeof v === "object" &&
        !Array.isArray(v) &&
        typeof (v as Record<string, unknown>).count === "number",
    )
  );
}

/**
 * Normalize a dimension value to structured ChipData for rendering.
 * Handles scalars, arrays, nested arrays (taxonomy), and label-count maps.
 */
function valueToChipData(value: unknown): ChipData[] | null {
  if (value === null || value === undefined) return null;

  if (isLabelCountMap(value)) {
    const entries = Object.entries(value as Record<string, { count: number }>);
    if (entries.length === 0) return null;
    return entries.map(([label, { count }]) => ({ label: label || "—", count }));
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [{ label: String(value) }];
  }

  if (Array.isArray(value)) {
    const out: ChipData[] = [];
    for (const item of value) {
      if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
        out.push({ label: String(item) });
      } else if (Array.isArray(item)) {
        const inner = flattenToStrings(item);
        if (inner.length) out.push({ label: inner.join(NESTED_JOIN) });
      }
    }
    return out.length ? out : null;
  }

  return null;
}

/**
 * Compare two chip string arrays for equality in a set sense (order-independent).
 * Used for conflict detection when a dimension allows multi-selection.
 */
export function chipStringsEqualOrderIndependent(a: string[] | null, b: string[] | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((s) => setB.has(s));
}

/**
 * Normalize a dimension value to an array of strings for chip display (one string per chip).
 * - Scalar → one chip.
 * - Label-count map → `"N×Label"` per entry.
 * - Top-level array: one chip per element; nested lists are joined with " / " into a single chip.
 * Returns null for empty/absent.
 */
export function valueToChipStrings(value: unknown): string[] | null {
  if (value === null || value === undefined) return null;

  if (isLabelCountMap(value)) {
    const entries = Object.entries(value as Record<string, { count: number }>);
    if (entries.length === 0) return null;
    return entries.map(([label, { count }]) => `${count}×${label || "—"}`);
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    const out: string[] = [];
    for (const item of value) {
      if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
        out.push(String(item));
      } else if (Array.isArray(item)) {
        const inner = flattenToStrings(item);
        if (inner.length) out.push(inner.join(NESTED_JOIN));
      }
    }
    return out.length ? out : null;
  }
  return null;
}

export const VALUE_CHIP_CLASS =
  "inline-flex items-center whitespace-nowrap rounded-4 border px-2 py-0.5 text-label-small font-medium text-neutral-content-bold bg-neutral-surface border-neutral-border-subtle";

interface ValueChipsProps {
  value: unknown;
  /** Optional wrapper className (e.g. for flex layout). Default: "flex flex-wrap gap-1" */
  className?: string;
  /** Optional extra class applied to every chip (e.g. text-positive-content for GT row). */
  chipClassName?: string;
  /**
   * When provided, chips whose label is in this set are highlighted as conflicting
   * (text-negative-content). Takes precedence over chipClassName for those chips.
   */
  conflictingLabels?: ReadonlySet<string>;
  /**
   * Per-label color configuration (background, border, color) from label_attrs.
   * When provided, label-count chips render with the Chip component and colored
   * thick left border matching the LabelsRenderer in LabelingSummary.
   */
  labelColors?: Record<string, { background?: string; border?: string; color?: string }>;
}

/**
 * Renders a dimension value as chips used in the agreement dashboard.
 *
 * For label-count maps (spatial dimensions) the count is rendered as a bold
 * prefix with a × separator and thick left border, matching the LabelsRenderer
 * in LabelingSummary. Plain values use the standard VALUE_CHIP_CLASS styling.
 */
export function ValueChips({
  value,
  className = "flex flex-wrap gap-1",
  chipClassName,
  conflictingLabels,
  labelColors,
}: ValueChipsProps) {
  const chips = valueToChipData(value);
  const defaultChipClass = chipClassName ? `${VALUE_CHIP_CLASS} ${chipClassName}` : VALUE_CHIP_CLASS;
  const conflictChipClass = `${VALUE_CHIP_CLASS} text-negative-content`;

  if (chips === null || chips.length === 0) {
    const emptyClass = chipClassName ? defaultChipClass : `${VALUE_CHIP_CLASS} text-neutral-content-subtler`;
    return (
      <div className={className}>
        <span className={emptyClass}>—</span>
      </div>
    );
  }
  return (
    <div className={className}>
      {chips.map((chip, i) => (
        <TruncatingChip
          key={i}
          label={chip.label}
          count={chip.count}
          isConflicting={conflictingLabels?.has(chip.label) ?? false}
          chipClassName={chipClassName}
          defaultChipClass={defaultChipClass}
          conflictChipClass={conflictChipClass}
          labelColors={labelColors}
        />
      ))}
    </div>
  );
}

interface TruncatingChipProps {
  label: string;
  count?: number;
  isConflicting: boolean;
  chipClassName?: string;
  defaultChipClass: string;
  conflictChipClass: string;
  labelColors?: Record<string, { background?: string; border?: string; color?: string }>;
}

/**
 * Renders a single chip with a 30vw cap and ellipsis. The tooltip is only
 * activated when the inner text is actually clipped, so short labels don't
 * trigger a redundant tooltip on hover.
 */
function TruncatingChip({
  label,
  count,
  isConflicting,
  chipClassName,
  defaultChipClass,
  conflictChipClass,
  labelColors,
}: TruncatingChipProps) {
  const innerRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const check = () => setIsOverflowing(el.scrollWidth > el.clientWidth);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [label]);

  const inner = (
    <span ref={innerRef} className="min-w-0 truncate">
      {label}
    </span>
  );

  const chipEl =
    count !== undefined ? (
      <Chip
        prefix={count}
        colors={labelColors?.[label] ?? { border: DEFAULT_CHIP_BORDER }}
        thickBorder
        className={cnm(CHIP_MAX_WIDTH_CLASS, isConflicting ? "text-negative-content" : chipClassName)}
      >
        {inner}
      </Chip>
    ) : (
      <span className={cnm(isConflicting ? conflictChipClass : defaultChipClass, CHIP_MAX_WIDTH_CLASS)}>{inner}</span>
    );

  // Always wrap in Tooltip to keep the tree stable across overflow toggles
  // (avoids remounting the chip and losing the ResizeObserver attachment);
  // `disabled` controls whether hover actually triggers the tooltip.
  return (
    <Tooltip title={truncateForTooltip(label)} disabled={!isOverflowing} style={{ maxWidth: TOOLTIP_MAX_WIDTH }}>
      {chipEl}
    </Tooltip>
  );
}
