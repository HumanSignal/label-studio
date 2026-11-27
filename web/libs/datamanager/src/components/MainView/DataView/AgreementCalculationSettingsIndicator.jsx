import { isAgreementCalculationNonDefault, normalizeAgreementSelected } from "../../../utils/agreementSelected";

/**
 * Blue dot before the agreement column tag when calculation differs from backend defaults.
 * Tooltip copy for custom settings is shown on the agreement header button (`Agreement.HeaderCell`).
 */
export function AgreementCalculationSettingsIndicator({ agreementFilters }) {
  const normalized = normalizeAgreementSelected(agreementFilters);
  if (!isAgreementCalculationNonDefault(normalized)) {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      className="inline-block h-2 w-2 shrink-0 rounded-full bg-primary-icon -ml-tight mr-tighter"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    />
  );
}
