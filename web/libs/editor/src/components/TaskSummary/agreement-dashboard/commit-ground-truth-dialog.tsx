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
 * Maps a lowercased control tag type to the key used inside the annotation
 * `result[].value` object. Tag types not listed here fall through to use
 * the tag type itself as the key (the else branch).
 */
const TAG_TYPE_VALUE_KEYS: Record<string, string> = {
  choices: "choices",
  choice: "choices",
  taxonomy: "taxonomy",
  rating: "rating",
  number: "number",
};

/**
 * Value wrappers per tag type. "choices" wraps in an array, "taxonomy"
 * wraps in a nested array, numeric types coerce to Number.
 * For multiselect, rawValue may be an array of primitives (choices) or paths (taxonomy).
 */
function wrapValueForTagType(
  tagType: string,
  rawValue: string | number | boolean | null | (string | number | boolean)[],
): unknown {
  const key = TAG_TYPE_VALUE_KEYS[tagType] ?? tagType;
  const isArray = Array.isArray(rawValue);

  switch (key) {
    case "choices":
      return isArray ? rawValue.map(String) : [String(rawValue)];
    case "taxonomy":
      if (isArray) {
        const first = rawValue[0];
        return typeof first === "object" && first !== null && Array.isArray(first)
          ? (rawValue as string[][])
          : (rawValue as (string | number | boolean)[]).map((v) => [String(v)]);
      }
      return [[String(rawValue)]];
    case "rating":
    case "number":
      return isArray ? Number((rawValue as (string | number | boolean)[])[0]) : Number(rawValue);
    default:
      return rawValue;
  }
}

/**
 * Build the annotation `result` array for the ground truth annotation.
 *
 * Strategy: deep-clone the first real annotation's result (as a structural
 * template), then for every resolved ground truth cell, find result items
 * whose `from_name` matches the dimension's name and overwrite their value
 * with the GT cell's value wrapped for the correct tag type.
 *
 * @param annotations - All annotations from the summary API (used to pick a template).
 * @param cells       - Resolved ground truth cells to apply.
 * @param dimensions  - Dimension metadata (maps cell.dimensionId -> controlTag/name).
 * @returns A new `result` array suitable for POST /api/tasks/{id}/annotations/.
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

  const dimensionById = new Map<number, DimensionInfo>();
  for (const dim of dimensions) {
    dimensionById.set(dim.dimensionId, dim);
  }

  for (const cell of cells) {
    if (cell.value === null || cell.value === undefined) continue;
    const dim = dimensionById.get(cell.dimensionId);
    if (!dim || !dim.isCategorical) continue;

    const fromName = dim.name;
    const tagType = dim.controlTag.toLowerCase();
    const valueKey = TAG_TYPE_VALUE_KEYS[tagType] ?? tagType;
    const wrappedValue = wrapValueForTagType(tagType, cell.value);

    for (const item of result) {
      if (item.from_name !== fromName) continue;
      item.value = { ...item.value, [valueKey]: wrappedValue };
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Dialog body component
// ---------------------------------------------------------------------------

interface DialogBodyProps {
  reviewerName: string;
}

const DialogBody = ({ reviewerName }: DialogBodyProps) => (
  <div className="text-label-small text-neutral-content-subtle space-y-tighter">
    <p className="flex items-center gap-tight">
      <IconWarning width={16} height={16} className="text-warning-content flex-shrink-0" />A new annotation will be
      created and marked as ground truth.
    </p>
    <div className="flex items-center gap-tight">
      <span className="font-semibold text-neutral-content">Annotator:</span>
      <span>{reviewerName}</span>
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
    title: "Create Ground Truth",
    body: <DialogBody reviewerName={reviewerName} />,
    okText: "Confirm",
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
