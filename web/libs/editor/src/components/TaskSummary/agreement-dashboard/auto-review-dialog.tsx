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
}

const DialogBody = ({ annotatorDecisions, acceptCount, rejectCount }: DialogBodyProps) => (
  <div className="space-y-base">
    <p className="text-label-small text-neutral-content-subtle">
      Matching annotations accepted, non-matching rejected.
    </p>

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

    <div className="rounded-small bg-positive-background p-tight text-label-small text-neutral-content">
      Creates{" "}
      <strong>
        {annotatorDecisions.length} review{annotatorDecisions.length !== 1 ? "s" : ""}
      </strong>
      : <span className="text-positive-content">{acceptCount} accepted</span>,{" "}
      <span className="text-negative-content">{rejectCount} rejected</span>
    </div>

    <p className="flex items-center gap-tight text-label-small text-neutral-content-subtle">
      <IconWarning width={16} height={16} className="text-warning-content flex-shrink-0" />
      This action cannot be undone.
    </p>
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
  onCommit: () => void;
}

export function openAutoReviewDialog({
  existingGt,
  annotations,
  dimensions,
  annotationIds,
  annotators,
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
  const annotatorDecisions: AnnotatorDecision[] = [];

  for (const [pk, accepted] of decisions.entries()) {
    if (accepted) acceptCount++;
    else rejectCount++;
    const annotator = pkToAnnotator.get(pk);
    annotatorDecisions.push({
      displayName: annotator?.displayName ?? `Annotation #${pk}`,
      user: annotator?.user ?? null,
      accepted,
    });
  }

  confirm({
    title: "Review annotations against ground truth",
    body: <DialogBody annotatorDecisions={annotatorDecisions} acceptCount={acceptCount} rejectCount={rejectCount} />,
    okText: "Apply reviews",
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
