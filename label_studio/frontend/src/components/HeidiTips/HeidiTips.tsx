import { FC } from "react";
import { Tip, HeidiTipsProps } from './types';
import { HeidiTip } from "./HeidiTip"

function getRandomTip(tips: Tip[]): Tip {
  const length = tips.length - 1;
  const randomIndex = Math.floor(Math.random() * length + 1)
  const item = tips[randomIndex];

  return item;
}

export const HeidiTips: FC<HeidiTipsProps> = ({
  tips
}) => {
  const tip = getRandomTip(tips);
  return <HeidiTip tip={tip} />;
}
