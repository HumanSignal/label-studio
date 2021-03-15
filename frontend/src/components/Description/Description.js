import { Block } from "../../utils/bem";
import './Description.styl';

export const Description = ({children, className, size = 'medium', ...rest}) => {
  return (
    <Block name="description" mod={{size}} mix={className} {...rest}>
      {children}
    </Block>
  );
};
