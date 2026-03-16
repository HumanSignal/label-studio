import type { CSSProperties } from "react";
import styles from "./spinner.module.css";
import { cn } from "@humansignal/shad/utils";

export type SpinnerProps = {
  className?: string;
  style?: CSSProperties;
  size?: number;
  stopped?: boolean;
};

export const Spinner = ({ className, style, size = 32, stopped = false }: SpinnerProps) => {
  const fullClassName = cn(styles.spinner, className);
  const bodyClassName = cn(styles.body, stopped ? styles.stopped : "");

  const sizeWithUnit = typeof size === "number" ? `${size}px` : size;

  return (
    <div className={fullClassName} style={{ ...(style ?? {}), "--spinner-size": sizeWithUnit }}>
      <div className={bodyClassName}>
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
};
