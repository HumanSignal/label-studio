/**
 * Agreement participant selection stored on Data Manager views (`agreement_selected`).
 * Mirrors backend default `DEFAULT_V2_SELECTION` (all annotators, no models, not ground-truth match).
 */

/**
 * @typedef {{ ground_truth: boolean, annotators: { all: boolean, ids: string[] }, models: { all: boolean, ids: string[] } }} NormalizedAgreementSelection
 */

/** Shown at the end of the agreement calculation indicator tooltip (plain and rich). */
export const AGREEMENT_CALCULATION_INDICATOR_CTA = "Click to configure";

/** @type {NormalizedAgreementSelection} */
export const DEFAULT_AGREEMENT_SELECTED_V2 = Object.freeze({
  ground_truth: false,
  annotators: { all: true, ids: [] },
  models: { all: false, ids: [] },
});

/**
 * @param {unknown} raw
 * @returns {NormalizedAgreementSelection}
 */
export function normalizeAgreementSelected(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const annotIds = Array.isArray(r.annotators?.ids) ? r.annotators.ids.map(String) : [];
  const modelIds = Array.isArray(r.models?.ids) ? r.models.ids.map(String) : [];
  return {
    ground_truth: r.ground_truth === true,
    annotators: {
      all: r.annotators?.all !== false,
      ids: [...annotIds].sort(),
    },
    models: {
      all: r.models?.all === true,
      ids: [...modelIds].sort(),
    },
  };
}

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function isAgreementSelectionAtDefaultV2(raw) {
  const n = normalizeAgreementSelected(raw);
  return (
    n.ground_truth === DEFAULT_AGREEMENT_SELECTED_V2.ground_truth &&
    n.annotators.all === DEFAULT_AGREEMENT_SELECTED_V2.annotators.all &&
    n.annotators.ids.length === 0 &&
    n.models.all === DEFAULT_AGREEMENT_SELECTED_V2.models.all &&
    n.models.ids.length === 0
  );
}

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function isAgreementCalculationNonDefault(raw) {
  return !isAgreementSelectionAtDefaultV2(raw);
}

/**
 * @param {boolean} agreementFeatureFlagsActive
 * @param {unknown} raw
 */
export function shouldShowAgreementCalculationIndicator(agreementFeatureFlagsActive, raw) {
  return agreementFeatureFlagsActive && isAgreementCalculationNonDefault(raw);
}

/**
 * How many annotators participate in the selection.
 * When `all` is true, `ids` are exclusions. When `all` is false, `ids` are inclusions.
 * @param {NormalizedAgreementSelection} f
 */
export function agreementAnnotatorParticipationCount(f, totalAnnotators) {
  const total = Number(totalAnnotators) || 0;
  if (f.annotators.all) {
    return Math.max(0, total - f.annotators.ids.length);
  }
  return f.annotators.ids.length;
}

/**
 * @param {NormalizedAgreementSelection} f
 */
export function agreementModelParticipationCount(f, totalModels) {
  const total = Number(totalModels) || 0;
  if (f.models.all) {
    return Math.max(0, total - f.models.ids.length);
  }
  return f.models.ids.length;
}

/**
 * Whether the selection represents all annotators (no exclusions, or unknown total with default-all shape).
 * @param {NormalizedAgreementSelection} f
 * @param {number} totalAnnotators
 */
export function agreementAnnotatorsIsAllSelected(f, totalAnnotators) {
  if (!f.annotators.all) return false;
  if (f.annotators.ids.length === 0) return true;
  const total = Number(totalAnnotators) || 0;
  if (total <= 0) return false;
  return agreementAnnotatorParticipationCount(f, total) === total;
}

/**
 * @param {NormalizedAgreementSelection} f
 * @param {number} totalModels
 */
export function agreementModelsIsAllSelected(f, totalModels) {
  if (!f.models.all) return false;
  if (f.models.ids.length === 0) return true;
  const total = Number(totalModels) || 0;
  if (total <= 0) return false;
  return agreementModelParticipationCount(f, total) === total;
}

/**
 * Plain-text summary for native `title` / screen readers when rich summary is unavailable.
 * @param {NormalizedAgreementSelection} f
 * @param {{ totalAnnotators?: number, totalModels?: number, groundTruthParticipantLabel?: string }} opts
 */
export function buildAgreementCalculationPlainSummary(f, opts = {}) {
  const totalAnnotators = opts.totalAnnotators ?? 0;
  const totalModels = opts.totalModels ?? 0;
  const gtLabel = opts.groundTruthParticipantLabel;

  if (f.ground_truth) {
    const lines = ["Ground Truth Match"];
    if (gtLabel) {
      lines.push(`Comparing against ${gtLabel}`);
    } else {
      lines.push("Comparing against selected participant");
    }
    return `${lines.join("\n")}\n\n${AGREEMENT_CALCULATION_INDICATOR_CTA}`;
  }

  const lines = ["Annotators and Models"];
  const detailLines = [];
  if (agreementAnnotatorsIsAllSelected(f, totalAnnotators)) {
    detailLines.push("- All Annotators");
  } else {
    const ac = agreementAnnotatorParticipationCount(f, totalAnnotators);
    if (ac > 0) detailLines.push(`- ${ac} Annotators`);
  }
  if (agreementModelsIsAllSelected(f, totalModels)) {
    detailLines.push("- All Models");
  } else {
    const mc = agreementModelParticipationCount(f, totalModels);
    if (mc > 0) detailLines.push(`- ${mc} Model Versions`);
  }
  if (detailLines.length) {
    lines.push("Comparing:");
    lines.push(...detailLines);
  }
  return `${lines.join("\n")}\n\n${AGREEMENT_CALCULATION_INDICATOR_CTA}`;
}
