export interface NormalizedAgreementSelection {
  ground_truth: boolean;
  annotators: {
    all: boolean;
    ids: string[];
  };
  models: {
    all: boolean;
    ids: string[];
  };
}

export const DEFAULT_AGREEMENT_SELECTED_V2: Readonly<NormalizedAgreementSelection>;

/** Shown at the end of the agreement calculation indicator tooltip. */
export const AGREEMENT_CALCULATION_INDICATOR_CTA: string;

export function normalizeAgreementSelected(raw: unknown): NormalizedAgreementSelection;

export function isAgreementSelectionAtDefaultV2(raw: unknown): boolean;

export function isAgreementCalculationNonDefault(raw: unknown): boolean;

export function shouldShowAgreementCalculationIndicator(agreementFeatureFlagsActive: boolean, raw: unknown): boolean;

export function agreementAnnotatorParticipationCount(f: NormalizedAgreementSelection, totalAnnotators: number): number;

export function agreementModelParticipationCount(f: NormalizedAgreementSelection, totalModels: number): number;

export function agreementAnnotatorsIsAllSelected(f: NormalizedAgreementSelection, totalAnnotators: number): boolean;

export function agreementModelsIsAllSelected(f: NormalizedAgreementSelection, totalModels: number): boolean;

export function buildAgreementCalculationPlainSummary(
  f: NormalizedAgreementSelection,
  opts?: {
    totalAnnotators?: number;
    totalModels?: number;
    groundTruthParticipantLabel?: string;
  },
): string;
