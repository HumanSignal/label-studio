import { cn } from "../../utils/bem";
import "./Space.scss";

export const Space = ({ direction = "horizontal", size, className, style, children, spread, stretch, align }) => {
  return (
    <div
      className={cn("space-ls").mod({ direction, size, spread, stretch, align }).mix(className).toClassName()}
      style={style}
    >
      {children}
    </div>
  );
};
