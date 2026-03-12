import { cn } from "../../utils/bem";
import "./Spinner.prefix.css";

export const Spinner = ({ className, style, size = 32, stopped = false }) => {
  const rootClass = cn("spinner-ls");

  const sizeWithUnit = typeof size === "number" ? `${size}px` : size;

  return (
    <div
      className={rootClass.mix(className).toClassName()}
      style={{ ...(style ?? {}), "--spinner-size": sizeWithUnit }}
    >
      <div className={rootClass.elem("body").mod({ stopped }).toClassName()}>
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
};
