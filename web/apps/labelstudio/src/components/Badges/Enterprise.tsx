import type { FC } from "react";
import { IconSpark } from "../../assets/icons";
import { Block, Elem } from "../../utils/bem";
import "./Enterprise.styl";

export const EnterpriseBadge: FC<{
  filled?: boolean;
}> = ({ filled }) => {
  return (
    <Block name="enterprise-badge" mod={{ filled }}>
      <Elem name="label">
        <Elem name="icon" tag={IconSpark} />
        Enterprise
      </Elem>
    </Block>
  );
};
