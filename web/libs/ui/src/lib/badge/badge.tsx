import { forwardRef, useEffect, useRef, useState } from "react";
import { IconClose } from "@humansignal/icons";
import { cn } from "../../utils/utils";
import { Tooltip } from "../Tooltip/Tooltip";
import styles from "./badge.module.css";

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

export type BadgeLook = "filled" | "outline" | "ghost" | "solid";
export type BadgeShape = "rounded" | "square" | "squared";
export type BadgeSize = "large" | "medium" | "small" | "compact" | "default"; // "default" is deprecated, use "medium"; "compact" is deprecated, use "small"

export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "style"> {
  variant?: BadgeVariant;
  look?: BadgeLook;
  shape?: BadgeShape;
  size?: BadgeSize;
  children?: React.ReactNode;
  // Allow inline CSS styles via a separate prop
  cssStyle?: React.CSSProperties;
  /** When provided, renders before children. For gradient (Enterprise) badges, pass e.g. icon={<IconSpark />} to show the spark icon. */
  icon?: React.ReactNode;
  /** When provided, renders after children (before the close button when `onClose` is set). */
  trailingIcon?: React.ReactNode;
  /** When provided, renders a close button and fires when clicked. */
  onClose?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Accessible name for the close button. Defaults to `Remove {children}` when children is plain text. */
  closeLabel?: string;
  /** Caps the text at this width, adds ellipsis truncation, and shows a tooltip only when text is actually clipped. */
  maxWidth?: number | string;
}

function normalizeVariant(variant: string): string {
  return VARIANT_MAP[variant] || variant;
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      variant = "grape",
      look = "filled",
      shape = "square",
      size = "medium",
      children,
      className,
      cssStyle,
      icon,
      trailingIcon,
      onClose,
      closeLabel,
      maxWidth,
      ...props
    },
    ref,
  ) => {
    const normalizedVariant = normalizeVariant(variant);
    // Map deprecated sizes for backwards compatibility
    const normalizedSize = size === "compact" ? "small" : size === "default" ? "medium" : size;
    const isGradient = normalizedVariant === "gradient";
    const hasChildren = children != null && children !== "";
    const hasIcon = icon != null;
    const hasTrailingIcon = trailingIcon != null;
    const isIconOnly = isGradient && hasIcon && !hasChildren && !hasTrailingIcon;

    const textRef = useRef<HTMLSpanElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);
    const [truncationTooltipTitle, setTruncationTooltipTitle] = useState("");

    useEffect(() => {
      if (!maxWidth) return;
      const el = textRef.current;
      if (el) {
        setIsTruncated(el.scrollWidth > el.offsetWidth);
        setTruncationTooltipTitle((el.textContent ?? "").trim());
      }
    }, [maxWidth, children]);

    const textContent =
      maxWidth != null ? (
        <Tooltip title={truncationTooltipTitle} disabled={!isTruncated}>
          {/* Tooltip clones this div and may override its ref — that's fine, we don't need it */}
          <div className="min-w-0">
            {/* Our measurement ref lives here, safely outside Tooltip's cloneElement reach */}
            <span ref={textRef} className={styles.label} style={{ maxWidth }}>
              {children}
            </span>
          </div>
        </Tooltip>
      ) : (
        children
      );

    return (
      <div
        ref={ref}
        className={cn(
          styles.badge,
          styles[`variant-${normalizedVariant}`],
          styles[`look-${look}`],
          styles[`shape-${shape === "square" ? "squared" : shape}`],
          normalizedSize !== "medium" && styles[`size-${normalizedSize}`],
          isIconOnly && styles["icon-only"],
          hasTrailingIcon && styles["has-trailing-icon"],
          className,
        )}
        style={cssStyle}
        {...props}
      >
        {isGradient ? (
          <div className={styles["badge-content"]}>
            {hasIcon && <span className={styles.icon}>{icon}</span>}
            {hasChildren && <span className={styles["badge-text"]}>{children}</span>}
            {hasTrailingIcon && <span className={styles.iconTrailing}>{trailingIcon}</span>}
          </div>
        ) : (
          <>
            {hasIcon && <span className={styles.icon}>{icon}</span>}
            {textContent}
            {hasTrailingIcon && <span className={styles.iconTrailing}>{trailingIcon}</span>}
            {onClose && (
              <button
                type="button"
                className={styles.closeButton}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose(e);
                }}
                aria-label={closeLabel ?? (typeof children === "string" ? `Remove ${children}` : "Remove")}
              >
                <IconClose />
              </button>
            )}
          </>
        )}
      </div>
    );
  },
);

Badge.displayName = "Badge";
