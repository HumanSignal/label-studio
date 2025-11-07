import type { CSSProperties, FC } from "react";

import { cn } from "../../utils/bem";
import "./Space.scss";

export interface SpaceProps {
  direction?: "horizontal" | "vertical";
  size?: "small" | "medium" | "large" | "none";
  style?: CSSProperties;
  spread?: boolean;
  stretch?: boolean;
  align?: "start" | "end";
  collapsed?: boolean;
  truncated?: boolean;
  className?: string;
}

export const Space: FC<SpaceProps> = ({
  direction = "horizontal",
  size,
  className,
  style,
  children,
  spread,
  stretch,
  align,
  collapsed,
  truncated,
  ...rest
}) => {
  return (
    <div
      style={style}
      {...rest}
      className={cn("space")
        .mod({ direction, size, spread, stretch, align, collapsed, truncated })
        .mix(className)
        .toClassName()}
    >
      {children}
    </div>
  );
};
