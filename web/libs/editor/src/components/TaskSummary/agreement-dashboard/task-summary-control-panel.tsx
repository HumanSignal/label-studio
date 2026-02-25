/**
 * Task Summary Control Panel.
 *
 * Compact toolbar for agreement dashboard actions: Create Ground Truth and
 * Auto-Review. Height matches CollapsiblePanel header. Revert/clear actions
 * are available via the Draft badge dropdown in the GT row.
 */

import { cnm, Tooltip } from "@humansignal/ui";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TaskSummaryControlPanelProps {
  /** Whether all categorical dimensions have a value (inferred or set). */
  isComplete: boolean;
  hasExistingGt: boolean;
  hasNonCategoricalDimensions?: boolean;
  onCreateGroundTruth: () => void;
  onAutoReview: () => void;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const TaskSummaryControlPanel = ({
  isComplete,
  hasExistingGt,
  hasNonCategoricalDimensions,
  onCreateGroundTruth,
  onAutoReview,
}: TaskSummaryControlPanelProps) => {
  const createDisabled = hasNonCategoricalDimensions || !isComplete || hasExistingGt;
  const createTooltip = hasExistingGt
    ? "Ground truth annotation already exists"
    : hasNonCategoricalDimensions
      ? "This task has non-categorical dimensions. Go to the labeling screen to create ground truth there."
      : !isComplete
        ? "Resolve all dimensions first"
        : "Create the ground truth annotation";

  const reviewTooltip = hasExistingGt
    ? "Accept or reject annotations based on ground truth match"
    : "Create a ground truth annotation first";

  return (
    <div className="flex items-center gap-2 px-base py-tight mt-tight rounded-md border border-neutral-border bg-neutral-surface">
      <div className="flex items-center gap-2 ml-auto">
        <Tooltip title={createTooltip}>
          <button
            type="button"
            disabled={createDisabled}
            onClick={onCreateGroundTruth}
            className={cnm(
              "px-base py-tighter rounded-small text-label-small font-semibold border transition-colors cursor-pointer min-w-[168px]",
              !createDisabled
                ? "bg-primary-surface text-primary-surface-content border-transparent hover:opacity-90"
                : "bg-neutral-surface border-neutral-border text-neutral-content-subtlest cursor-not-allowed",
            )}
          >
            Create Ground Truth
          </button>
        </Tooltip>

        <Tooltip title={reviewTooltip}>
          <button
            type="button"
            disabled={!hasExistingGt}
            onClick={onAutoReview}
            className={cnm(
              "px-base py-tighter rounded-small text-label-small font-semibold border transition-colors cursor-pointer min-w-[168px]",
              hasExistingGt
                ? "bg-primary-surface text-primary-surface-content border-transparent hover:opacity-90"
                : "bg-neutral-surface border-neutral-border text-neutral-content-subtlest cursor-not-allowed",
            )}
          >
            Auto-Review
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
