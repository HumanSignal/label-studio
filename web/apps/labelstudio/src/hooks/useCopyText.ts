import { useCallback, useState } from "react";
import { copyText, isDefined } from "../utils/helpers";

export const useCopyText = ({ defaultText = "", timeout = 1200 }) => {
  const [copied, setCopied] = useState(false);

  const copyTextCallback = useCallback(
    (text?) => {
      setCopied(true);
      copyText(isDefined(text) ? text : defaultText);
      setTimeout(() => setCopied(false), timeout);
    },
    [defaultText, timeout],
  );

  return [copied, copyTextCallback];
};
