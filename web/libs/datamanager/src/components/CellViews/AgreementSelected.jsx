import { useSDK } from "../../providers/SDKProvider";
import { isDefined } from "../../utils/utils";
import { useState, useEffect } from "react";

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

export const AgreementSelected = (cell) => {
  const { value, original: task } = cell;

  const score = (
    <span className={agreementScoreTextColor(value)}>{isDefined(value) ? `${formatNumber(value)}%` : ""}</span>
  );

  return <div className="flex items-center">{score}</div>;
};

AgreementSelected.userSelectable = false;

AgreementSelected.HeaderCell = ({ agreementFilters, onSave, onClose }) => {
  const sdk = useSDK();
  const [content, setContent] = useState(null);

  useEffect(() => {
    sdk.invoke("AgreementSelectedHeaderClick", { agreementFilters, onSave, onClose }, (jsx) => setContent(jsx));
  }, []);

  return content;
};

AgreementSelected.style = {
  minWidth: 210,
};
