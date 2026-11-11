import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./avatar-badge.module.css";

export type AvatarBadgeAccent =
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
export type AvatarBadgeVariant = "primary" | "positive" | "negative" | "warning" | "neutral" | AvatarBadgeAccent;

export interface AvatarBadgeProps {
  /** What the badge means; read by screen readers, since colour alone does not say it. */
  label: string;
  /** A state colour, or an accent colour for statuses without a sentiment (default primary). */
  variant?: AvatarBadgeVariant;
  /** A small square that can hold an icon, or a plain dot (default square). */
  shape?: "square" | "dot";
  /** Icon inside a square badge, e.g. a Phosphor `CheckIcon`. */
  icon?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

/** A status marker for an avatar corner: pass it to `Avatar`'s `badge` prop. */
export const AvatarBadge = ({
  label,
  variant = "primary",
  shape = "square",
  icon,
  className,
  "data-testid": dataTestId,
}: AvatarBadgeProps) => (
  <span
    role="img"
    aria-label={label}
    className={clsx(styles.badge, styles[shape], className)}
    data-variant={variant}
    data-testid={dataTestId}
  >
    {shape === "square" && icon}
  </span>
);
