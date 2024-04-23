import { Block } from "../../../utils/bem";
import "./Badge.styl";

export const Badge = ({ children, size, className, color, style }) => {
  return (
    <Block name="badge" mod={{ size }} className={className} style={{ ...(style ?? {}), backgroundColor: color }}>
      {children}
    </Block>
  );
};
