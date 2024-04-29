import { type FC, memo, useCallback, useState } from "react";
import type { HeidiTipsProps } from "./types";
import { HeidiTip } from "./HeidiTip";
import { dismissTip, getRandomTip, isTipDismissed } from "./utils";

export const HeidiTips: FC<HeidiTipsProps> = memo(({ collection }) => {
  const [tip, setTip] = useState(getRandomTip(collection));
  const dismiss = useCallback(() => {
    dismissTip(collection);
    setTip(null);
  }, []);

  return tip && <HeidiTip tip={tip} onDismiss={dismiss} />;
});
