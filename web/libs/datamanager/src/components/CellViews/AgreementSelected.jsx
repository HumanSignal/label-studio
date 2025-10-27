import { useSDK } from "../../providers/SDKProvider";
import { isDefined } from "../../utils/utils";
import { useState, useEffect } from "react";
import { Tooltip } from "@humansignal/ui";
import { IconInfoOutline } from "@humansignal/icons";

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

  const threshold = window.APP_SETTINGS?.agreement_selected_threshold;
  const overThreshold = Number(task?.total_annotations) > Number(threshold);

  const content = overThreshold ? (
    <Tooltip title={`Agreement (Selected) is not computed for tasks with more than ${threshold} annotations`}>
      <span className="inline-flex items-center text-neutral-content-subtler">
        <IconInfoOutline />
      </span>
    </Tooltip>
  ) : (
    <span className={agreementScoreTextColor(value)}>{isDefined(value) ? `${formatNumber(value)}%` : ""}</span>
  );

  return <div className="flex items-center">{content}</div>;
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
