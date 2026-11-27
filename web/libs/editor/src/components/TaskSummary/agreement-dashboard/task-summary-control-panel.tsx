/**
 * Task Summary Control Panel.
 *
 * State-driven toolbar rendered as the table footer:
 * - undefined: not rendered (no GT row to act on)
 * - "draft": progress text + Cancel + Save Ground Truth
 * - "saved": Auto-Review button only
 */

import { cnm, Tooltip } from "@humansignal/ui";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ReviewStats {
  reviewedCount: number;
  totalCount: number;
  acceptedCount: number;
  rejectedCount: number;
}

export interface TaskSummaryControlPanelProps {
  groundTruthStatus: "draft" | "saved" | undefined;
  isComplete: boolean;
  resolvedCount: number;
  totalCount: number;
  hasExistingGt: boolean;
  hasNonCategoricalDimensions?: boolean;
  /** Pre-computed review statistics for annotations (excluding the GT annotation). */
  reviewStats?: ReviewStats;
  onSaveGroundTruth: () => void;
  onCancel: () => void;
  onAutoReview: () => void;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const TaskSummaryControlPanel = ({
  groundTruthStatus,
  isComplete,
  resolvedCount,
  totalCount,
  hasExistingGt,
  hasNonCategoricalDimensions,
  reviewStats,
  onSaveGroundTruth,
  onCancel,
  onAutoReview,
}: TaskSummaryControlPanelProps) => {
  if (!groundTruthStatus) {
    return null;
  }

  if (groundTruthStatus === "saved") {
    const reviewTooltip = hasExistingGt
      ? "Accept or reject annotations based on ground truth match"
      : "Create a ground truth annotation first";

    const showReviewCounter = reviewStats && reviewStats.reviewedCount > 0;

    return (
      <div className="flex items-center gap-2 px-base py-tight border-t border-neutral-border bg-neutral-surface">
        {showReviewCounter && (
          <span className="text-label-small text-neutral-content-subtle">
            {reviewStats.reviewedCount} / {reviewStats.totalCount} reviewed
            {" ("}
            <span className="text-positive-content">{reviewStats.acceptedCount} accepted</span>
            {", "}
            <span className="text-negative-content">{reviewStats.rejectedCount} rejected</span>
            {")"}
          </span>
        )}
        <div className="flex items-center gap-2 ml-auto">
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
              Bulk Review Against Ground Truth
            </button>
          </Tooltip>
        </div>
      </div>
    );
  }

  // "draft" state
  const saveDisabled = hasNonCategoricalDimensions || !isComplete;
  const saveTooltip = hasNonCategoricalDimensions
    ? "Only Choices and Rating are supported here. Go to the labeling screen to create ground truth."
    : !isComplete
      ? "Resolve all values first"
      : "Save the ground truth annotation";

  const progress = totalCount > 0 ? resolvedCount / totalCount : 0;

  return (
    <div className="flex items-center gap-2 px-base py-tight border-t border-neutral-border bg-neutral-background">
      <div className="flex items-center gap-tight flex-shrink-0 ml-auto mr-base">
        {Boolean(totalCount) && (
          <>
            <div className="relative w-[120px] h-2 rounded-full overflow-hidden bg-neutral-surface border border-neutral-border">
              <div
                className="absolute inset-y-0 left-0 bg-positive-surface-hover transition-all duration-300 rounded-full"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="text-label-smallest font-semibold text-neutral-content whitespace-nowrap">
              {resolvedCount} / {totalCount} required values
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-base py-tighter rounded-small text-label-small font-semibold border border-neutral-border bg-neutral-surface text-neutral-content hover:bg-neutral-surface-hover transition-colors cursor-pointer min-w-[100px]"
        >
          Reset
        </button>
        <Tooltip title={saveTooltip}>
          <button
            type="button"
            disabled={saveDisabled}
            onClick={onSaveGroundTruth}
            className={cnm(
              "px-base py-tighter rounded-small text-label-small font-semibold border transition-colors cursor-pointer min-w-[168px]",
              !saveDisabled
                ? "bg-primary-surface text-primary-surface-content border-transparent hover:opacity-90"
                : "bg-neutral-surface border-neutral-border text-neutral-content-subtlest cursor-not-allowed",
            )}
          >
            Create Ground Truth
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
