/**
 * Resolution Summary Bar for Ground Truth Mode.
 *
 * Shows progress and three actions:
 * 1. Auto-accept Majority Vote — fills all GT cells with majority values
 * 2. Create Ground Truth — creates the GT annotation (disabled when GT exists)
 * 3. Auto-Review — accepts/rejects annotations based on GT match (enabled only when GT exists)
 */

import { cnm, Tooltip } from "@humansignal/ui";
import type { GroundTruthSummary } from "./use-ground-truth";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ResolutionSummaryBarProps {
  resolvedCount: number;
  totalCount: number;
  progress: number;
  isComplete: boolean;
  summary: GroundTruthSummary;
  hasExistingGt: boolean;
  onAcceptAllMajority: () => void;
  onCreateGroundTruth: () => void;
  onAutoReview: () => void;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Horizontal bar showing ground truth resolution progress and action buttons.
 *
 * Renders a progress bar, an "Auto-accept Majority Vote" button, a "Create
 * Ground Truth" button (disabled until all dimensions are resolved or when
 * a GT annotation already exists), and an "Auto-Review" button (enabled only
 * when a GT annotation exists).
 */
export const ResolutionSummaryBar = ({
  resolvedCount,
  totalCount,
  progress,
  isComplete,
  summary,
  hasExistingGt,
  onAcceptAllMajority,
  onCreateGroundTruth,
  onAutoReview,
}: ResolutionSummaryBarProps) => {
  const remaining = totalCount - resolvedCount;

  const createDisabled = !isComplete || hasExistingGt;
  const createTooltip = hasExistingGt
    ? "Ground truth annotation already exists"
    : !isComplete
      ? `Resolve all ${remaining} remaining dimensions first`
      : "Create the ground truth annotation";

  const reviewTooltip = hasExistingGt
    ? "Accept or reject annotations based on ground truth match"
    : "Create a ground truth annotation first";

  const autoAcceptMajorityDisabled = hasExistingGt;
  const autoAcceptMajorityTooltip = hasExistingGt
    ? "Ground truth annotation already exists"
    : "Set all dimensions to their majority vote value";

  return (
    <div className="flex flex-wrap items-center gap-base p-base rounded-small border border-neutral-border bg-neutral-surface mt-tight">
      {/* Label */}
      <div className="flex items-center gap-tight flex-shrink-0">
        <span className="text-label-small font-semibold text-neutral-content">Ground Truth Progress</span>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-tight flex-shrink-0">
        <div className="relative w-[120px] h-2 rounded-full overflow-hidden bg-neutral-surface border border-neutral-border">
          <div
            className="absolute inset-y-0 left-0 bg-positive-surface-hover transition-all duration-300 rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-label-smallest font-semibold text-neutral-content whitespace-nowrap">
          {resolvedCount} / {totalCount}
        </span>
      </div>

      {/* Auto-accept Majority Vote */}
      <Tooltip title={autoAcceptMajorityTooltip}>
        <button
          type="button"
          disabled={autoAcceptMajorityDisabled}
          onClick={onAcceptAllMajority}
          className={cnm(
            "px-tight py-tighter rounded-small border text-label-small transition-colors cursor-pointer",
            !autoAcceptMajorityDisabled
              ? "bg-positive-background text-positive-content hover:opacity-90"
              : "bg-neutral-surface border-neutral-border text-neutral-content-subtlest cursor-not-allowed",
          )}
          style={!autoAcceptMajorityDisabled ? { borderColor: "var(--color-positive-content)" } : undefined}
        >
          Auto-accept Majority Vote
        </button>
      </Tooltip>

      {/* Create Ground Truth */}
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

      {/* Auto-Review */}
      <div className="ml-auto">
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
