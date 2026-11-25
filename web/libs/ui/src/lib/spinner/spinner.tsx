import type { CSSProperties } from "react";
import styles from "./spinner.module.css";
import { cn } from "@humansignal/shad/utils";

/** The spinner diameters, in px. `medium` is the default. */
export const SPINNER_SIZES = {
  smallest: 12,
  smaller: 16,
  small: 24,
  medium: 32,
  large: 48,
  larger: 64,
  largest: 96,
} as const;
export type SpinnerSize = keyof typeof SPINNER_SIZES;

export type SpinnerProps = {
  className?: string;
  style?: CSSProperties;
  /** smallest 12, smaller 16, small 24, medium 32 (default), large 48, larger 64, largest 96. */
  size?: SpinnerSize;
  stopped?: boolean;
};

export const Spinner = ({ className, style, size = "medium", stopped = false }: SpinnerProps) => {
  const fullClassName = cn(styles.spinner, className);
  const bodyClassName = cn(styles.body, stopped ? styles.stopped : "");

  return (
    <div
      className={fullClassName}
      style={{ ...(style ?? {}), "--spinner-size": `${SPINNER_SIZES[size] ?? SPINNER_SIZES.medium}px` }}
    >
      <div className={bodyClassName}>
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
};
