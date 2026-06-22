/**
 * Auto-review Dialog — standalone module for reviewing annotations against
 * an existing ground truth annotation.
 *
 * Fully decoupled from the GT creation flow. This module knows nothing about
 * ground truth cells, resolution summaries, or the GT creation dialog.
 * Its only concern is comparing existing annotations against a saved GT
 * annotation and submitting reviews.
 *
 * Comparison logic lives in annotation-review-logic.ts.
 */

import { confirm } from "@humansignal/ui/lib/modal";
import { cnm, Userpic } from "@humansignal/ui";
import { IconWarning } from "@humansignal/icons";
import { computeReviewDecisions } from "./annotation-review-logic";
import type { AnnotatorInfo, DimensionInfo, ExistingGroundTruth } from "./types";
import type { MSTAnnotation } from "../../../stores/types";

// ---------------------------------------------------------------------------
// Per-annotator decision (for the dialog body)
// ---------------------------------------------------------------------------

interface AnnotatorDecision {
  displayName: string;
  user: Record<string, unknown> | null;
  accepted: boolean;
}

// ---------------------------------------------------------------------------
// Dialog body
// ---------------------------------------------------------------------------

interface DialogBodyProps {
  annotatorDecisions: AnnotatorDecision[];
  acceptCount: number;
  rejectCount: number;
  alreadyReviewedCount: number;
  totalDecisionCount: number;
}

const DialogBody = ({
  annotatorDecisions,
  acceptCount,
  rejectCount,
  alreadyReviewedCount,
  totalDecisionCount,
}: DialogBodyProps) => (
  <div className="space-y-base">
    <p className="text-label-small text-neutral-content-subtle">
      Accept matching annotations and reject non-matching ones.
    </p>

    {alreadyReviewedCount > 0 && (
      <div className="flex items-start gap-tight rounded-small border border-warning-border bg-warning-background p-tight">
        <IconWarning width={16} height={16} className="text-warning-content flex-shrink-0 mt-px" />
        <p className="text-label-small text-neutral-content">
          <strong>Warning:</strong> {alreadyReviewedCount} / {totalDecisionCount} annotations have already been
          reviewed. This action will overwrite existing reviews.
        </p>
      </div>
    )}

    <p className="text-label-small font-semibold text-neutral-content">Reviews to be applied:</p>

    <div className="rounded-small border border-neutral-border overflow-hidden">
      {annotatorDecisions.map((d, i) => (
        <div
          key={i}
          className={cnm(
            "flex items-center gap-tight px-base py-tight",
            i < annotatorDecisions.length - 1 && "border-b border-neutral-border-subtle",
          )}
        >
          <Userpic user={d.user} />
          <span className="text-label-small font-medium flex-1 truncate">{d.displayName}</span>
          <span
            className={cnm(
              "text-label-small font-semibold",
              d.accepted ? "text-positive-content" : "text-negative-content",
            )}
          >
            {d.accepted ? "Accept" : "Reject"}
          </span>
        </div>
      ))}
    </div>

    <div className="flex gap-base">
      <div
        data-testid="kpi-accepted"
        className="flex-1 rounded-small border border-positive-border bg-positive-background p-base text-center pb-tight"
      >
        <div className="text-display-medium font-bold text-positive-content py-tight">{acceptCount}</div>
        <div className="text-label-small text-positive-content font-medium mt-tighter">Accepted</div>
      </div>
      <div
        data-testid="kpi-rejected"
        className="flex-1 rounded-small border border-negative-border bg-negative-background p-base text-center pb-tight"
      >
        <div className="text-display-medium font-bold text-negative-content py-tight">{rejectCount}</div>
        <div className="text-label-small text-negative-content font-medium mt-tighter">Rejected</div>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Open the auto-review dialog
// ---------------------------------------------------------------------------

interface OpenAutoReviewDialogOptions {
  taskId: number | string;
  existingGt: ExistingGroundTruth;
  annotations: MSTAnnotation[];
  /** Full list of categorical dimensions — must NOT be UI-filtered.
   *  See annotation-review-logic.ts for why filtering is incorrect here. */
  dimensions: DimensionInfo[];
  /** annotation_ids from the agreement API result, parallel to annotator_ids.
   *  Used to map annotation pk → position index for dimension_values lookup. */
  annotationIds: number[];
  /** Annotator info aligned with annotator_ids, used to render per-annotator rows. */
  annotators: AnnotatorInfo[];
  /** Map of annotation pk → last review accepted status for already-reviewed annotations. */
  existingReviews?: Map<number, boolean>;
  onCommit: () => void;
}

export function openAutoReviewDialog({
  existingGt,
  annotations,
  dimensions,
  annotationIds,
  annotators,
  existingReviews,
  onCommit,
}: OpenAutoReviewDialogOptions): void {
  const submittedAnnotations = annotations.filter((a) => a.type === "annotation" && a.pk);

  const decisions = computeReviewDecisions(submittedAnnotations, existingGt, dimensions, annotationIds);

  const pkToAnnotator = new Map<number, AnnotatorInfo>();
  for (const annotator of annotators) {
    const pk = annotationIds[annotator.index];
    if (pk != null) pkToAnnotator.set(pk, annotator);
  }

  let acceptCount = 0;
  let rejectCount = 0;
  let alreadyReviewedCount = 0;
  const annotatorDecisions: AnnotatorDecision[] = [];

  for (const [pk, accepted] of decisions.entries()) {
    if (accepted) acceptCount++;
    else rejectCount++;
    if (existingReviews?.has(pk)) alreadyReviewedCount++;
    const annotator = pkToAnnotator.get(pk);
    annotatorDecisions.push({
      displayName: annotator?.displayName ?? `Annotation #${pk}`,
      user: annotator?.user ?? null,
      accepted,
    });
  }

  const totalDecisionCount = annotatorDecisions.length;

  confirm({
    title: `Review ${totalDecisionCount} Annotations against Ground Truth`,
    body: (
      <DialogBody
        annotatorDecisions={annotatorDecisions}
        acceptCount={acceptCount}
        rejectCount={rejectCount}
        alreadyReviewedCount={alreadyReviewedCount}
        totalDecisionCount={totalDecisionCount}
      />
    ),
    okText: "Apply Reviews",
    cancelText: "Cancel",
    onOk: () => {
      commitAutoReview({ decisions })
        .then(() => onCommit())
        .catch((err) => {
          console.error("[Auto-review] Failed:", err);
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Commit auto-review (API calls)
// ---------------------------------------------------------------------------

interface CommitAutoReviewOptions {
  decisions: Map<number, boolean>;
}

async function commitAutoReview({ decisions }: CommitAutoReviewOptions): Promise<void> {
  const reviewPromises = [...decisions.entries()].map(async ([annotationPk, accepted]) => {
    try {
      const response = await fetch("/api/annotation-reviews/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annotation: annotationPk, accepted }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.warn(
          `[Auto-review] Failed to create review for annotation ${annotationPk}:`,
          response.status,
          errorText,
        );
      } else {
        console.info(`[Auto-review] Review for annotation ${annotationPk}: ${accepted ? "accepted" : "rejected"}`);
      }
    } catch (err) {
      console.warn(`[Auto-review] Error creating review for annotation ${annotationPk}:`, err);
    }
  });

  await Promise.all(reviewPromises);
}
