import { Block } from "../../../utils/bem";
import "./Badge.scss";

export const Badge = ({ children, size, className, color, style }) => {
  return (
    <Block name="badge-dm" mod={{ size }} className={className} style={{ ...(style ?? {}), backgroundColor: color }}>
      {children}
    </Block>
  );
};
