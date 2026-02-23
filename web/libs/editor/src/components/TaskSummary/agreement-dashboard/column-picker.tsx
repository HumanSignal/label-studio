/**
 * Column visibility picker for the Annotators × Dimensions table.
 *
 * The trigger button shows "Columns (X of Y)" with an animated chevron.
 * The dropdown contains:
 *   1. **All Columns** checkbox — selects / deselects every dimension at once.
 *   2. **Conflicts Only** checkbox — selects only dimensions with imperfect
 *      agreement. Automatically unchecks when the user changes any individual
 *      column selection.
 *   3. A search input to filter column names.
 *   4. Per-column checkboxes, immediately applied.
 */

import { useCallback, useMemo } from "react";
import { Tooltip, Checkbox, Select } from "@humansignal/ui";
import type { DimensionInfo } from "./types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ColumnPickerProps {
  /** Total number of all dimensions (categorical + non-categorical) */
  totalDimensionCount: number;
  /** Number of columns currently shown after all filters */
  shownCount: number;
  /** All dimensions (categorical + non-categorical) */
  allDimensions: DimensionInfo[];
  visibleColumnIds: number[];
  onVisibleColumnsChange: (ids: number[]) => void;
  /** IDs of dimensions that have imperfect agreement scores */
  conflictingDimensionIds: number[];
  /** When true, the conflict legend reads "ground truth"; otherwise "majority vote" */
  hasGroundTruth: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ColumnPicker = ({
  totalDimensionCount,
  shownCount,
  allDimensions,
  visibleColumnIds,
  onVisibleColumnsChange,
  conflictingDimensionIds,
  hasGroundTruth,
}: ColumnPickerProps) => {
  const options = useMemo(
    () =>
      allDimensions.map((dim) => ({
        value: String(dim.dimensionId),
        label: dim.controlTag ? `${dim.name} (${dim.controlTag})` : dim.name,
      })),
    [allDimensions],
  );

  const stringValue = useMemo(() => visibleColumnIds.map(String), [visibleColumnIds]);

  const allSelected = allDimensions.length > 0 && visibleColumnIds.length === allDimensions.length;

  // "Conflicts Only" is active when visibleColumnIds exactly matches conflictingDimensionIds
  const conflictsOnlyActive = useMemo(() => {
    if (conflictingDimensionIds.length === 0 || visibleColumnIds.length !== conflictingDimensionIds.length) return false;
    const conflictSet = new Set(conflictingDimensionIds);
    return visibleColumnIds.every((id) => conflictSet.has(id));
  }, [visibleColumnIds, conflictingDimensionIds]);

  const handleChange = useCallback(
    (selectedValues: any) => {
      onVisibleColumnsChange((selectedValues as string[]).map(Number));
    },
    [onVisibleColumnsChange],
  );

  const handleSelectAllToggle = useCallback(() => {
    if (allSelected) {
      onVisibleColumnsChange([]);
    } else {
      onVisibleColumnsChange(allDimensions.map((d) => d.dimensionId));
    }
  }, [allSelected, allDimensions, onVisibleColumnsChange]);

  const handleConflictsOnlyToggle = useCallback(() => {
    if (conflictsOnlyActive) {
      // Uncheck: show all columns
      onVisibleColumnsChange(allDimensions.map((d) => d.dimensionId));
    } else {
      // Check: show only conflicting columns
      onVisibleColumnsChange(conflictingDimensionIds);
    }
  }, [conflictsOnlyActive, allDimensions, conflictingDimensionIds, onVisibleColumnsChange]);

  const selectHeader = useMemo(
    () => (
      <div className="border-b border-neutral-border">
        {/* All Columns */}
        <div
          className="rounded-4 text-neutral-content-subtle overflow-hidden p-1 outline-none cursor-pointer"
          onClick={handleSelectAllToggle}
        >
          <div className="flex gap-2 w-full pl-2 pr-4 py-1 hover:bg-primary-emphasis-subtle rounded-4 duration-150 ease-out">
            <Checkbox tabIndex={-1} checked={allSelected} readOnly />
            <div className="w-full min-w-0 truncate">All Columns</div>
          </div>
        </div>

        {/* Conflicts Only — only shown when there are conflicting dimensions */}
        {conflictingDimensionIds.length > 0 && (
          <Tooltip title="Show only columns where annotators disagree">
            <div
              className="rounded-4 text-neutral-content-subtle overflow-hidden p-1 outline-none cursor-pointer"
              onClick={handleConflictsOnlyToggle}
            >
              <div className="flex gap-2 w-full pl-2 pr-4 py-1 hover:bg-primary-emphasis-subtle rounded-4 duration-150 ease-out">
                <Checkbox tabIndex={-1} checked={conflictsOnlyActive} readOnly />
                <div className="w-full min-w-0 truncate">Conflicts Only</div>
              </div>
            </div>
          </Tooltip>
        )}
      </div>
    ),
    [allSelected, handleSelectAllToggle, conflictsOnlyActive, handleConflictsOnlyToggle, conflictingDimensionIds.length],
  );

  return (
    <div className="flex items-center gap-tight">
      {/* Conflict legend — text changes based on whether a ground truth annotation exists */}
      <span className="inline-flex items-center gap-tighter text-label-small text-neutral-content-subtle leading-none">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-negative-background border shrink-0" style={{ borderColor: "var(--color-negative-content)" }} />
        <span className="whitespace-nowrap min-w-[11rem]">
          Conflicts with {hasGroundTruth ? "ground truth" : "majority vote"}
        </span>
      </span>

      {/* Separator */}
      <span className="w-px h-4 bg-neutral-border" />

      {/* Columns multi-select */}
      <Select
        options={options}
        value={stringValue as any}
        multiple
        searchable
        searchPlaceholder="Search columns"
        header={selectHeader}
        onChange={handleChange}
        placeholder="Select Columns"
        renderSelected={() => (
          <span>
            Columns ({shownCount} of {totalDimensionCount})
          </span>
        )}
        contentClassName="w-64"
      />
    </div>
  );
};
