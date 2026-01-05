import { useSDK } from "../../../providers/SDKProvider";
import { isDefined } from "../../../utils/utils";
import { useState } from "react";
import { Popover } from "@humansignal/ui";

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
  const isDimensionAgreementColumn = colPath.startsWith("dimension_agreement__");
  const isAgreementPopoverEnabled = basePopoverEnabled && !isDimensionAgreementColumn;

  const handleClick = isAgreementPopoverEnabled
    ? (e) => {
        e.preventDefault();
        e.stopPropagation();
        sdk.invoke("agreementCellClick", { task }, (jsx) => setContent(jsx));
      }
    : undefined;

  const score = (
    <span className={agreementScoreTextColor(value)}>{isDefined(value) ? `${formatNumber(value)}%` : ""}</span>
  );

  return (
    <div className="flex items-center" onClick={handleClick}>
      {isAgreementPopoverEnabled ? <Popover trigger={score}>{content}</Popover> : score}
    </div>
  );
};

Agreement.userSelectable = false;
