import { cn } from "../../../utils/bem";
import "./Badge.scss";

export const Badge = ({ children, size, className, color, style }) => {
  return (
    <div
      className={cn("badge-dm").mod({ size }).mix(className).toClassName()}
      style={{ ...(style ?? {}), backgroundColor: color }}
    >
      {children}
    </div>
  );
};
