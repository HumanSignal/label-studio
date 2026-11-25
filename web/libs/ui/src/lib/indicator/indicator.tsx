import clsx from "clsx";
import { isValidElement, type ReactNode } from "react";
import { formatCount } from "./format-count";
import styles from "./indicator.module.css";

export type IndicatorAccent =
  | "grape"
  | "blueberry"
  | "kale"
  | "kiwi"
  | "mango"
  | "canteloupe"
  | "persimmon"
  | "plum"
  | "fig"
  | "sand";
export type IndicatorVariant = "primary" | "positive" | "negative" | "warning" | "neutral" | IndicatorAccent;
export type IndicatorShape = "square" | "rounded" | "pill" | "dot";
export type IndicatorPosition = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

export type IndicatorMarkProps = {
  /** What the indicator means, read by screen readers: a dot or a number alone says nothing. */
  label: string;
  /** A count (shortened from a thousand up, e.g. 1.2k), an icon, or nothing for a dot. */
  content?: number | ReactNode;
  /** A state colour, or an accent for statuses without a sentiment (default primary). */
  variant?: IndicatorVariant;
  /** Default: dot without content, square around an icon, rounded around a count. */
  shape?: IndicatorShape;
  /** The corner it sits in (default topRight). */
  position?: IndicatorPosition;
  /** circular for round hosts such as avatars, so the mark sits on the curve (default rectangular). */
  overlap?: "rectangular" | "circular";
  className?: string;
  "data-testid"?: string;
};

export type IndicatorProps = IndicatorMarkProps & {
  /** The element the indicator sits on: an avatar, an icon or a button. */
  children: ReactNode;
  /** Hides the indicator and keeps the host, e.g. when the count drops to zero. */
  invisible?: boolean;
};

function contentKind(content: IndicatorMarkProps["content"]) {
  if (typeof content === "number") return "count";
  if (isValidElement(content)) return "icon";
  return "none";
}

/** The mark on its own, positioned against the nearest positioned ancestor. Prefer `Indicator`. */
export const IndicatorMark = ({
  label,
  content,
  variant = "primary",
  shape,
  position = "topRight",
  overlap = "rectangular",
  className,
  "data-testid": dataTestId,
}: IndicatorMarkProps) => {
  const kind = contentKind(content);
  const resolvedShape = shape ?? (kind === "none" ? "dot" : kind === "icon" ? "square" : "rounded");
  const showContent = resolvedShape !== "dot" && kind !== "none";
  return (
    <span
      role="img"
      aria-label={label}
      className={clsx(styles.mark, className)}
      data-slot="indicator"
      data-variant={variant}
      data-shape={resolvedShape}
      data-content={showContent ? kind : "none"}
      data-position={position}
      data-overlap={overlap}
      data-testid={dataTestId}
    >
      {showContent && (kind === "count" ? formatCount(content as number) : content)}
    </span>
  );
};

/** A status dot, icon or count on the corner of an avatar, an icon or a button. */
export const Indicator = ({ children, invisible = false, ...mark }: IndicatorProps) => (
  <span className={styles.root}>
    {children}
    {!invisible && <IndicatorMark {...mark} />}
  </span>
);
