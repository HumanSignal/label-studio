import { FC, memo, useState } from "react";
import { HeidiTipsProps } from './types';
import { HeidiTip } from "./HeidiTip"
import { dismissTip, getRandomTip } from "./utils";

export const HeidiTips: FC<HeidiTipsProps> = memo(({
  collection
}) => {
  const [result, setResult] = useState(getRandomTip(collection));

  return result && (
    <HeidiTip
      tip={result.tip}
      onDismiss={() => {
        dismissTip(collection, result.index)
        setResult(null);
      }}
    />
  );
});
