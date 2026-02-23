/**
 * Commit Ground Truth confirmation dialog.
 *
 * Opens a modal showing a summary of the ground truth resolution
 * before the reviewer commits. Creates a new annotation with
 * ground_truth=true.
 *
 * Auto-review (accept/reject based on GT match) is handled separately
 * by auto-review-dialog.tsx.
 */

import { confirm } from "@humansignal/ui/lib/modal";
import { IconWarning } from "@humansignal/icons";
import type { AnnotatorInfo, DimensionInfo, GroundTruthCell, RawResult, SummaryAnnotation } from "./types";
import type { GroundTruthSummary } from "./use-ground-truth";

// ---------------------------------------------------------------------------
// Payload type
// ---------------------------------------------------------------------------

export interface GroundTruthPayload {
  taskId: number | string;
  cells: GroundTruthCell[];
  summary: GroundTruthSummary;
  reviewer: { id: number; email: string; displayName: string } | null;
  method: string;
  annotations: SummaryAnnotation[];
  dimensions: DimensionInfo[];
  annotators: AnnotatorInfo[];
}

// ---------------------------------------------------------------------------
// Build ground truth result from a template annotation
// ---------------------------------------------------------------------------

/**
 * Build the annotation `result` array for the ground truth annotation.
 *
 * Strategy: deep-clone the first annotation's result, then for every
 * resolved ground truth cell, find result items where `from_name`
 * matches the dimension's name and replace the value.
 */
function buildGroundTruthResult(
  annotations: SummaryAnnotation[],
  cells: GroundTruthCell[],
  dimensions: DimensionInfo[],
): RawResult[] {
  const templateAnnotation = annotations.find((a) => a.type === "annotation");
  if (!templateAnnotation) return [];

  const templateResult = templateAnnotation.result;
  if (!Array.isArray(templateResult) || templateResult.length === 0) return [];

  const result: RawResult[] = JSON.parse(JSON.stringify(templateResult));

  const dimMap = new Map<number, DimensionInfo>();
  for (const dim of dimensions) {
    dimMap.set(dim.dimensionId, dim);
  }

  for (const cell of cells) {
    const dim = dimMap.get(cell.dimensionId);
    if (!dim || !dim.isCategorical) continue;

    const fromName = dim.name;
    const tagType = dim.controlTag.toLowerCase();

    for (const item of result) {
      if (item.from_name !== fromName) continue;

      if (tagType === "choices" || tagType === "choice") {
        item.value = { ...item.value, choices: [String(cell.value)] };
      } else if (tagType === "taxonomy") {
        item.value = { ...item.value, taxonomy: [[String(cell.value)]] };
      } else if (tagType === "rating") {
        item.value = { ...item.value, rating: Number(cell.value) };
      } else if (tagType === "number") {
        item.value = { ...item.value, number: Number(cell.value) };
      } else {
        item.value = { ...item.value, [tagType]: cell.value };
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Dialog body component
// ---------------------------------------------------------------------------

interface DialogBodyProps {
  summary: GroundTruthSummary;
  reviewerName: string;
}

const DialogBody = ({ summary, reviewerName }: DialogBodyProps) => (
  <div className="space-y-base">
    {/* Resolution summary */}
    <div className="rounded-small border border-neutral-border p-base bg-neutral-surface-subtle">
      <div className="text-label-small font-semibold text-neutral-content mb-tight">
        {summary.total} dimensions resolved:
      </div>
      <ul className="space-y-tighter text-label-small text-neutral-content">
        {summary.autoUnanimous > 0 && (
          <li className="flex items-center gap-tight">
            <span className="w-2 h-2 rounded-full bg-positive-content inline-block flex-shrink-0" />
            {summary.autoUnanimous} auto-accepted (unanimous)
          </li>
        )}
        {summary.autoMajority > 0 && (
          <li className="flex items-center gap-tight">
            <span className="w-2 h-2 rounded-full bg-warning-content inline-block flex-shrink-0" />
            {summary.autoMajority} auto-accepted (majority)
          </li>
        )}
        {summary.manual > 0 && (
          <li className="flex items-center gap-tight">
            <span className="w-2 h-2 rounded-full bg-primary-content inline-block flex-shrink-0" />
            {summary.manual} manually adjudicated
          </li>
        )}
      </ul>
    </div>

    {/* Meta info */}
    <div className="text-label-small text-neutral-content-subtle space-y-tighter">
      <p className="flex items-center gap-tight">
        <IconWarning width={16} height={16} className="text-warning-content flex-shrink-0" />
        A new annotation will be created and marked as ground truth.
      </p>
      <div className="flex items-center gap-tight">
        <span className="font-semibold text-neutral-content">Annotator:</span>
        <span>{reviewerName}</span>
      </div>
      <div className="flex items-center gap-tight">
        <span className="font-semibold text-neutral-content">Method:</span>
        <span>Consensus-based with manual review</span>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Open the confirmation dialog
// ---------------------------------------------------------------------------

interface OpenCommitDialogOptions {
  taskId: number | string;
  cells: Map<number, GroundTruthCell>;
  summary: GroundTruthSummary;
  annotations: SummaryAnnotation[];
  dimensions: DimensionInfo[];
  annotators: AnnotatorInfo[];
  onCommit: (payload: GroundTruthPayload) => void;
}

export function openCommitGroundTruthDialog({
  taskId,
  cells,
  summary,
  annotations,
  dimensions,
  annotators,
  onCommit,
}: OpenCommitDialogOptions): void {
  const currentUser = window.APP_SETTINGS?.user;
  const reviewer = currentUser
    ? {
        id: currentUser.id,
        email: currentUser.email ?? "",
        displayName:
          [currentUser.first_name, currentUser.last_name].filter(Boolean).join(" ") ||
          currentUser.email ||
          `User ${currentUser.id}`,
      }
    : null;

  const reviewerName = reviewer?.displayName ?? "Unknown";

  const buildPayload = (): GroundTruthPayload => ({
    taskId,
    cells: [...cells.values()],
    summary,
    reviewer,
    method: "consensus_with_manual_review",
    annotations,
    dimensions,
    annotators,
  });

  confirm({
    title: "Create Ground Truth" as unknown as string,
    body: (
      <DialogBody
        summary={summary}
        reviewerName={reviewerName}
      />
    ),
    okText: "Create Ground Truth",
    cancelText: "Cancel",
    onOk: () => {
      onCommit(buildPayload());
    },
  });
}

// ---------------------------------------------------------------------------
// Commit ground truth (API call)
// ---------------------------------------------------------------------------

/**
 * Create a ground truth annotation.
 * POST /api/tasks/{taskId}/annotations/ with ground_truth=true
 */
export async function commitGroundTruth(
  payload: GroundTruthPayload,
  onSuccess: (newAnnotationId: number) => void,
): Promise<void> {
  const { taskId, cells, annotations, dimensions } = payload;

  const groundTruthResult = buildGroundTruthResult(annotations, cells, dimensions);

  if (groundTruthResult.length === 0) {
    console.error("[Ground Truth] Failed to build result: no template annotation found or empty result.");
    throw new Error("Could not build ground truth annotation. No template annotation available.");
  }

  const annotationBody = {
    result: groundTruthResult,
    ground_truth: true,
    lead_time: 0,
    started_at: new Date().toISOString(),
  };

  const annotationResponse = await fetch(`/api/tasks/${taskId}/annotations/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(annotationBody),
  });

  if (!annotationResponse.ok) {
    const errorText = await annotationResponse.text().catch(() => "Unknown error");
    console.error("[Ground Truth] Failed to create annotation:", annotationResponse.status, errorText);
    throw new Error(`Failed to create ground truth annotation (${annotationResponse.status}).`);
  }

  const newAnnotation = await annotationResponse.json();
  console.info("[Ground Truth] Created ground truth annotation:", newAnnotation.id);

  onSuccess(newAnnotation.id);
}
