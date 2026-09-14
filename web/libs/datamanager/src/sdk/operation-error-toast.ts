/**
 * Classic Data Manager toasts a generic "not updated, try again / contact support"
 * for every failed annotation write. Expected 403s tagged with display_context
 * (for example a redistributed rejection) already explain themselves in `detail`
 * and should not ask the annotator to retry.
 */
export const ANNOTATION_REDISTRIBUTED = "ANNOTATION_REDISTRIBUTED";

type ErrorResponse = {
  detail?: unknown;
  display_context?: { reason?: unknown };
};

export const redistributedAnnotationDetail = (
  status: number | undefined,
  response: ErrorResponse | null | undefined,
): string | null => {
  if (status !== 403 || response?.display_context?.reason !== ANNOTATION_REDISTRIBUTED) {
    return null;
  }
  const detail = response.detail;
  if (typeof detail !== "string") return null;
  const trimmed = detail.trim();
  return trimmed ? trimmed : null;
};
