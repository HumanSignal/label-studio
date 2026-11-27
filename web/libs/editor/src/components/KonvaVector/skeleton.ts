/**
 * Resolve the effective skeleton mode for a vector control.
 *
 * Skeleton mode lets a vector branch into open paths. SAM2 (interactive ML),
 * however, always produces a closed mask, so allowing skeleton mode while a
 * SAM2 backend is bound to the control makes no sense — the result must always
 * be a plain non-skeleton closed shape. When interactive ML is active we
 * therefore ignore the control's `skeleton` attribute (BROS-1434).
 *
 * Shared by the image (`VectorRegion`) and video (`VideoVector`) renderers so
 * both honour the same rule. Controls without the interactive-ML mixin (e.g.
 * a plain `<Vector>`) never expose `hasInteractiveBackend`, so they fall back
 * to their configured `skeleton` value untouched.
 */
export function isVectorSkeletonEnabled(control: any): boolean {
  const skeleton = control?.skeleton ?? false;
  const samActive = control?.hasInteractiveBackend === true;
  return skeleton && !samActive;
}
