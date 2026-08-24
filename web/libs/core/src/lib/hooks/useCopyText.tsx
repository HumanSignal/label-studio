import { useCallback, useState } from "react";
import { copyText, isDefined } from "../utils/helpers";

export const useCopyText = ({ defaultText = "", timeout = 1200 }: { defaultText?: string; timeout?: number } = {}) => {
  const [copied, setCopied] = useState(false);

  const copyTextCallback = useCallback(
    (text?: string) => {
      // Always returns a resolved boolean (helpers.ts swallows clipboard
      // rejections), so we can safely use it without leaking unhandled
      // promise rejections into the host page console.
      void copyText(isDefined(text) ? text : defaultText).then((ok) => {
        if (!ok) return;
        setCopied(true);
        setTimeout(() => setCopied(false), timeout);
      });
    },
    [defaultText, timeout],
  );

  return [copyTextCallback, copied] as const;
};
