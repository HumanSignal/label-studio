import type { FC, ReactElement } from "react";
import { Block } from "../../utils/bem";
import "./Caption.styl";

export const Caption: FC<{ children: ReactElement }> = ({ children }) => {
  return (
    <Block name="caption" tag="p">
      {children}
    </Block>
  );
};
