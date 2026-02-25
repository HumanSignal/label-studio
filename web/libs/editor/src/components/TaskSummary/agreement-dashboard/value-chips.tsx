/**
 * Shared value-to-chip display for the agreement dashboard.
 *
 * Normalizes dimension values (scalar, flat array, nested array e.g. taxonomy paths,
 * or label-count maps from spatial dimensions) to a consistent chip representation
 * and renders them with the same styling as the annotators × dimensions table.
 */

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
        v !== null && typeof v === "object" && !Array.isArray(v) && typeof (v as Record<string, unknown>).count === "number",
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
 * - Label-count map → `"Label ×N"` per entry.
 * - Top-level array: one chip per element; nested lists are joined with " / " into a single chip.
 * Returns null for empty/absent.
 */
export function valueToChipStrings(value: unknown): string[] | null {
  if (value === null || value === undefined) return null;

  if (isLabelCountMap(value)) {
    const entries = Object.entries(value as Record<string, { count: number }>);
    if (entries.length === 0) return null;
    return entries.map(([label, { count }]) => `${label || "—"} ×${count}`);
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
  "inline-flex items-center rounded-full border px-2 py-0.5 text-label-small font-medium text-neutral-content-bold bg-neutral-surface border-neutral-border-subtle";

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
}

/**
 * Renders a dimension value as the same chips used in the annotators × dimensions table.
 * Use for consistency in the Majority Vote row, Ground Truth row, and tooltips.
 *
 * For label-count maps the count is shown as a grayed-out superscript next to
 * the label name so that the label itself keeps the same style as plain chips.
 */
export function ValueChips({
  value,
  className = "flex flex-wrap gap-1",
  chipClassName,
  conflictingLabels,
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
      {chips.map((chip, i) => {
        const isConflicting = conflictingLabels?.has(chip.label) ?? false;
        const chipClass = isConflicting ? conflictChipClass : defaultChipClass;
        return (
          <span key={i} className={chipClass}>
            {chip.label}
            {chip.count !== undefined && (
              <sup className="text-neutral-content-subtler font-normal ml-0.5">
                {chip.count}
              </sup>
            )}
          </span>
        );
      })}
    </div>
  );
}
