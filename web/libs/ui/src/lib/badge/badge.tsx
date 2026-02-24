import { forwardRef } from "react";
import { IconSpark } from "../../assets/icons";
import { cn } from "../../utils/utils";
import styles from "./badge.module.scss";

// Variant mapping: semantic names -> accent colors
const VARIANT_MAP: Record<string, string> = {
  primary: "grape",
  info: "grape",
  neutral: "sand",
  secondary: "sand",
  default: "sand",
  negative: "persimmon",
  destructive: "persimmon",
  error: "persimmon",
  positive: "kale",
  success: "kale",
  warning: "canteloupe",
  caution: "canteloupe",
  beta: "plum",
  enterprise: "gradient", // backwards compatibility alias
};

// Supported accent colors
const ACCENT_COLORS = [
  "grape",
  "blueberry",
  "kale",
  "kiwi",
  "mango",
  "canteloupe",
  "persimmon",
  "plum",
  "fig",
  "sand",
] as const;

// Supported variants (semantic + accent colors + gradient)
export type BadgeVariant =
  | "primary"
  | "info"
  | "neutral"
  | "secondary"
  | "default"
  | "negative"
  | "destructive"
  | "error"
  | "positive"
  | "success"
  | "warning"
  | "caution"
  | "beta"
  | "enterprise"
  | "gradient"
  | (typeof ACCENT_COLORS)[number];

export type BadgeStyle = "filled" | "outline" | "ghost" | "solid";
export type BadgeShape = "rounded" | "square" | "squared";
export type BadgeSize = "medium" | "small" | "compact" | "default"; // "default" is deprecated, use "medium"; "compact" is deprecated, use "small"

export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "style"> {
  variant?: BadgeVariant;
  style?: BadgeStyle;
  shape?: BadgeShape;
  size?: BadgeSize;
  children?: React.ReactNode;
  // Allow inline CSS styles via a separate prop
  cssStyle?: React.CSSProperties;
}

function normalizeVariant(variant: string): string {
  return VARIANT_MAP[variant] || variant;
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  (
    { variant = "grape", style = "filled", shape = "square", size = "medium", children, className, cssStyle, ...props },
    ref,
  ) => {
    const normalizedVariant = normalizeVariant(variant);
    // Map deprecated sizes for backwards compatibility
    const normalizedSize = size === "compact" ? "small" : size === "default" ? "medium" : size;
    const isGradient = normalizedVariant === "gradient";
    const hasChildren = children != null && children !== "";
    const isIconOnly = isGradient && !hasChildren;

    // For gradient variant, always include icon
    const shouldShowIcon = isGradient;

    return (
      <div
        ref={ref}
        className={cn(
          styles.badge,
          styles[`variant-${normalizedVariant}`],
          styles[`style-${style}`],
          styles[`shape-${shape === "square" ? "squared" : shape}`],
          normalizedSize !== "medium" && styles[`size-${normalizedSize}`],
          isIconOnly && styles["icon-only"],
          className,
        )}
        style={cssStyle}
        {...props}
      >
        {isGradient ? (
          <div className={styles["badge-content"]}>
            {shouldShowIcon && <IconSpark className={styles.icon} />}
            {hasChildren && children}
          </div>
        ) : (
          children
        )}
      </div>
    );
  },
);

Badge.displayName = "Badge";
