import { cn } from "@humansignal/shad/utils";
import styles from "./space.module.css";
import type { CSSProperties, PropsWithChildren } from "react";

export type SpaceProps = PropsWithChildren<{
  direction?: "horizontal" | "vertical";
  size?: "small" | "large";
  className?: string;
  style?: CSSProperties;
  spread?: boolean;
  stretch?: boolean;
  align?: "start" | "end";
}>;

export const Space = ({
  direction = "horizontal",
  size,
  className,
  style,
  children,
  spread,
  stretch,
  align,
}: SpaceProps) => {
  const clsToggle = {
    [styles.spread]: spread,
    [styles.stretch]: stretch,
    [styles.sizeSmall]: size === "small",
    [styles.sizeLarge]: size === "large",
  };

  const clsList: string[] = [
    direction === "vertical" ? styles.directionVertical : styles.directionHorizontal,
    align === "end" ? styles.alignEnd : styles.alignStart,
  ];

  return (
    <div className={cn(styles.space, clsToggle, clsList, className)} style={style}>
      {children}
    </div>
  );
};
