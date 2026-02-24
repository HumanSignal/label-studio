import { cn } from "../../../utils/bem";
import "./Space.scss";

export const Space = ({
  direction = "horizontal",
  size,
  className,
  style,
  children,
  spread,
  stretch,
  align,
  ...rest
}) => {
  return (
    <div
      className={cn("space-dm").mod({ direction, size, spread, stretch, align }).mix(className).toClassName()}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
};
