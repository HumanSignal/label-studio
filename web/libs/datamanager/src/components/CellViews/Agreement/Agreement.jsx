import { useSDK } from "../../../providers/SDKProvider";
import { isDefined } from "../../../utils/utils";
import { useState } from "react";
import { Button, Popover, Tooltip } from "@humansignal/ui";
import { IconInfoOutline } from "@humansignal/icons";
import {
  isActive,
  FF_AGREEMENT_FILTERED,
  FF_UTC_428_CONSENSUS_CONTROL_TAG_AGREEMENT,
} from "@humansignal/core/lib/utils/feature-flags";
import {
  buildAgreementCalculationPlainSummary,
  normalizeAgreementSelected,
  shouldShowAgreementCalculationIndicator,
} from "../../../utils/agreementSelected";

const LOW_AGREEMENT_SCORE = 33;
const MEDIUM_AGREEMENT_SCORE = 66;

export const agreementScoreTextColor = (percentage) => {
  if (!isDefined(percentage)) return "text-neutral-content";
  if (percentage < LOW_AGREEMENT_SCORE) return "text-negative-content";
  if (percentage < MEDIUM_AGREEMENT_SCORE) return "text-warning-content";

  return "text-positive-content";
};

const formatNumber = (num) => {
  const number = Number(num);

  if (num % 1 === 0) {
    return number;
  }
  return number.toFixed(2);
};

export const Agreement = (cell) => {
  const { value, original: task } = cell;
  const sdk = useSDK();
  const [content, setContent] = useState(null);
  const basePopoverEnabled = window.APP_SETTINGS.billing?.enterprise;

  const colId =
    (cell && cell.column && typeof cell.column.id === "string" && cell.column.id) ||
    (cell &&
      cell.column &&
      cell.column.original &&
      typeof cell.column.original.alias === "string" &&
      cell.column.original.alias) ||
    "";

  const colPath = String(colId).split(":").pop() || "";

  const isDimensionAgreementColumn = colPath.startsWith("dimension_agreement_");
  const dimensionId = isDimensionAgreementColumn ? Number(colPath.replace("dimension_agreement_", "")) : undefined;
  const isAgreementPopoverEnabled = !!basePopoverEnabled;

  const consensusCap = Number(window.APP_SETTINGS?.consensus_agreement_participant_threshold ?? 20);
  let methodology = "";
  try {
    methodology = String(getRoot(task).project?.agreement_methodology ?? "").toLowerCase();
  } catch {
    methodology = String(sdk?.project?.agreement_methodology ?? "").toLowerCase();
  }
  const participantTotal = Number(task?.total_annotations ?? 0) + Number(task?.total_predictions ?? 0);
  const consensusSkipped = methodology === "consensus" && participantTotal > consensusCap;

  const handleClick = isAgreementPopoverEnabled
    ? (e) => {
        e.preventDefault();
        e.stopPropagation();
        sdk.invoke("agreementCellClick", { task, dimensionId }, (jsx) => setContent(jsx));
      }
    : undefined;

  const score = consensusSkipped ? (
    <Tooltip
      title={`Consensus is not computed for tasks with more than ${consensusCap} annotations and predictions combined`}
    >
      <span className="inline-flex items-center text-neutral-content-subtler">
        <IconInfoOutline />
      </span>
    </Tooltip>
  ) : (
    <span className={agreementScoreTextColor(value)}>{isDefined(value) ? `${formatNumber(value)}%` : ""}</span>
  );

  return (
    <div className="flex items-center" onClick={consensusSkipped ? undefined : handleClick}>
      {consensusSkipped ? score : isAgreementPopoverEnabled ? <Popover trigger={score}>{content}</Popover> : score}
    </div>
  );
};

Agreement.userSelectable = false;

const AGREEMENT_HEADER_DEFAULT_TOOLTIP = "Adjust calculation and display of all agreement columns";

Agreement.HeaderCell = ({ agreementFilters, onSave, children }) => {
  const sdk = useSDK();
  const AgreementSettingsSummary = sdk?.AgreementSettingsSummary ?? null;

  const agreementFeatureFlagsActive =
    isActive(FF_AGREEMENT_FILTERED) && isActive(FF_UTC_428_CONSENSUS_CONTROL_TAG_AGREEMENT);
  const normalized = normalizeAgreementSelected(agreementFilters);
  const showCustomSummary = shouldShowAgreementCalculationIndicator(agreementFeatureFlagsActive, agreementFilters);

  const customTooltipTitle = showCustomSummary ? (
    AgreementSettingsSummary ? (
      <AgreementSettingsSummary filters={normalized} />
    ) : (
      <div className="max-w-sm whitespace-pre-line p-tight text-body-small text-neutral-content">
        {buildAgreementCalculationPlainSummary(normalized, {})}
      </div>
    )
  ) : null;

  const tooltipTitle = showCustomSummary && customTooltipTitle ? customTooltipTitle : AGREEMENT_HEADER_DEFAULT_TOOLTIP;

  return (
    <Tooltip
      interactive={showCustomSummary}
      theme={showCustomSummary ? "light" : "dark"}
      alignment="bottom-center"
      className={showCustomSummary ? "!max-w-[min(320px,calc(100vw-2rem))]" : undefined}
      title={tooltipTitle}
    >
      <Button
        look="outlined"
        variant="neutral"
        size="small"
        onClick={() => sdk.invoke("AgreementHeaderClick", { agreementFilters, onSave })}
        className="flex w-full cursor-pointer items-center justify-between gap-tight overflow-hidden"
      >
        {children}
      </Button>
    </Tooltip>
  );
};
