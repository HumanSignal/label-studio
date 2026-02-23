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
import { IconWarning } from "@humansignal/icons";
import { computeReviewDecisions } from "./annotation-review-logic";
import type { DimensionInfo, ExistingGroundTruth } from "./types";
import type { MSTAnnotation } from "../../../stores/types";

// ---------------------------------------------------------------------------
// Dialog body
// ---------------------------------------------------------------------------

interface DialogBodyProps {
  annotationCount: number;
  acceptCount: number;
  rejectCount: number;
}

const DialogBody = ({ annotationCount, acceptCount, rejectCount }: DialogBodyProps) => (
  <div className="space-y-base">
    <div className="rounded-small border border-neutral-border p-base bg-neutral-surface-subtle">
      <div className="text-label-small font-semibold text-neutral-content mb-tight">
        Review summary for {annotationCount} annotation{annotationCount !== 1 ? "s" : ""}:
      </div>
      <ul className="space-y-tighter text-label-small text-neutral-content">
        <li className="flex items-center gap-tight">
          <span className="w-2 h-2 rounded-full bg-positive-content inline-block flex-shrink-0" />
          {acceptCount} annotation{acceptCount !== 1 ? "s" : ""} will be <strong>accepted</strong> (match ground truth)
        </li>
        <li className="flex items-center gap-tight">
          <span className="w-2 h-2 rounded-full bg-negative-content inline-block flex-shrink-0" />
          {rejectCount} annotation{rejectCount !== 1 ? "s" : ""} will be <strong>rejected</strong> (differ from ground truth)
        </li>
      </ul>
    </div>

    <div className="text-label-small text-neutral-content-subtle space-y-tighter">
      <p className="flex items-center gap-tight">
        <IconWarning width={16} height={16} className="text-warning-content flex-shrink-0" />
        This will create a review for each annotation. This action cannot be undone.
      </p>
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
  onCommit: () => void;
}

export function openAutoReviewDialog({
  existingGt,
  annotations,
  dimensions,
  annotationIds,
  onCommit,
}: OpenAutoReviewDialogOptions): void {
  const submittedAnnotations = annotations.filter((a) => a.type === "annotation" && a.pk);

  const decisions = computeReviewDecisions(submittedAnnotations, existingGt, dimensions, annotationIds);

  let acceptCount = 0;
  let rejectCount = 0;
  for (const accepted of decisions.values()) {
    if (accepted) acceptCount++;
    else rejectCount++;
  }

  const annotationCount = acceptCount + rejectCount;

  confirm({
    title: "Auto-review Annotations" as unknown as string,
    body: (
      <DialogBody
        annotationCount={annotationCount}
        acceptCount={acceptCount}
        rejectCount={rejectCount}
      />
    ),
    okText: `Review ${annotationCount} Annotation${annotationCount !== 1 ? "s" : ""}`,
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
        console.info(
          `[Auto-review] Review for annotation ${annotationPk}: ${accepted ? "accepted" : "rejected"}`,
        );
      }
    } catch (err) {
      console.warn(`[Auto-review] Error creating review for annotation ${annotationPk}:`, err);
    }
  });

  await Promise.all(reviewPromises);
}
