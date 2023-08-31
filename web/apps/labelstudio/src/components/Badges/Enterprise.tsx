import { FC } from "react";
import { Block, Elem } from "../../utils/bem";
import "./Enterprise.styl";
import { IconSpark } from "../../assets/icons";

export const EnterpriseBadge: FC<{
  filled?: boolean
}> = ({
  filled,
}) => {
  return (
    <Block name="enterprise-badge" mod={{ filled }}>
      <Elem name="label">
        <Elem name="icon" tag={IconSpark} />
          Enterprise
      </Elem>
    </Block>
  );
};
