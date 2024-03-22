import { Block } from "../../utils/bem";
import "./Description.styl";

export const Description = ({ children, className, size = "medium", noOffset = false, ...rest }) => {
  return (
    <Block name="description" mod={{ size, noOffset }} mix={className} {...rest}>
      {children}
    </Block>
  );
};
