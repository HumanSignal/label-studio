import { CheckCircleIcon, IconClose, IconSpark, InfoIcon, WarningIcon, XCircleIcon, XIcon } from "@humansignal/icons";
import React, { forwardRef, type ReactNode, useMemo } from "react";
import { cn } from "../../utils/utils";
import { Button } from "../button/button";
import { Typography } from "../typography/typography";
import styles from "./message.module.css";

// Variant configuration
const variants = {
  primary: styles["variant-primary"],
  neutral: styles["variant-neutral"],
  negative: styles["variant-negative"],
  positive: styles["variant-positive"],
  warning: styles["variant-warning"],
  enterprise: styles["variant-enterprise"],
} as const;

// Look configuration
const looks = {
  card: styles["look-card"],
  ghost: styles["look-ghost"],
} as const;

// Size configuration
const sizes = {
  medium: styles["size-medium"],
  small: styles["size-small"],
} as const;

export type MessageVariant = keyof typeof variants | "info" | "success" | "error";
export type MessageLook = keyof typeof looks;
export type MessageSize = keyof typeof sizes;

export interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Visual variant of the message
   * - primary: Default info/informational variant (blue)
   * - neutral: Neutral gray variant
   * - negative: Error/danger variant (red)
   * - positive: Success variant (green)
   * - warning: Warning/caution variant (orange/yellow)
   * - enterprise: Exclusively for gated/enterprise-only feature callouts.
   *               Uses the enterprise gradient palette (canteloupe → persimmon → plum)
   *               and defaults to IconSpark. Do not use for general informational messages.
   *
   * Aliases for backward compatibility:
   * - info → primary
   * - error → negative
   * - success → positive
   */
  variant?: MessageVariant;

  /**
   * Visual look of the message
   * - card: Default look with background, border and padding (default)
   * - ghost: Minimal look without background, border or padding — just the icon and content
   */
  look?: MessageLook;

  /**
   * Size of the message
   * - medium: Default size with standard padding and 24px icon (default)
   * - small: Compact size with reduced padding and 20px icon.
   *          Use only when vertical space is limited.
   */
  size?: MessageSize;

  /**
   * Icon element to display. If not provided, a default icon based on variant will be used.
   */
  icon?: ReactNode;

  /**
   * Size of the icon in pixels. If not provided, defaults based on size prop (medium: 20, small: 18).
   */
  iconSize?: number;

  /**
   * Optional title displayed above the main content.
   * Can be a string or ReactNode for rich content like bold text.
   */
  title?: ReactNode;

  /**
   * Main content of the message
   */
  children: ReactNode;

  /**
   * Whether the message can be closed by the user
   */
  closable?: boolean;

  /**
   * Callback function when the close button is clicked
   */
  onClose?: () => void;

  /**
   * Custom wrapper class name
   */
  className?: string;

  /**
   * Test ID for testing
   */
  "data-testid"?: string;

  /**
   * ARIA label for the message.
   * If not provided, the component automatically uses aria-labelledby
   * to reference the title element for accessibility.
   */
  "aria-label"?: string;
}

/**
 * Message Component
 *
 * A reusable component for displaying inline messages, notifications, and alerts throughout the application.
 * Supports different variants, looks, and customizable content including icons, text, actions, and extra content.
 *
 * Features:
 * - Six primary variants: primary, neutral, negative, positive, warning, enterprise
 * - Backward compatibility aliases: info, success, error
 * - Two looks: card (default with background/border) and ghost (minimal, no card wrapper)
 * - Optional closable functionality
 * - Flexible content areas for actions and extra elements
 * - Full accessibility support with ARIA attributes
 *
 * @example
 * Basic usage:
 * ```tsx
 * <Message variant="warning">
 *   Your session will expire in 5 minutes.
 * </Message>
 * ```
 *
 * @example
 * Ghost look (no card wrapper):
 * ```tsx
 * <Message variant="primary" look="ghost">
 *   Inline informational text without a card background.
 * </Message>
 * ```
 *
 * @example
 * Closable with custom icon:
 * ```tsx
 * <Message
 *   variant="negative"
 *   closable
 *   onClose={handleClose}
 *   icon={<IconError />}
 *   iconSize={24}
 * >
 *   An error occurred while processing your request.
 * </Message>
 * ```
 */
export const Message = forwardRef<HTMLDivElement, MessageProps>(
  (
    {
      variant = "primary",
      look = "card",
      size = "medium",
      icon,
      iconSize,
      title,
      children,
      closable = false,
      onClose,
      className,
      "data-testid": testId,
      "aria-label": ariaLabel,
      ...rest
    },
    ref,
  ) => {
    // Normalize variant aliases to primary variants
    const normalizedVariant = useMemo(() => {
      const aliasMap: Record<string, keyof typeof variants> = {
        info: "primary",
        error: "negative",
        success: "positive",
      };
      return aliasMap[variant] || (variant as keyof typeof variants);
    }, [variant]);

    // Get default icon based on variant
    const defaultIcon = useMemo(() => {
      switch (normalizedVariant) {
        case "primary":
          return <InfoIcon />;
        case "warning":
          return <WarningIcon />;
        case "positive":
          return <CheckCircleIcon />;
        case "negative":
          return <XCircleIcon />;
        case "neutral":
          return <InfoIcon />;
        case "enterprise":
          return <IconSpark />;
        default:
          return <InfoIcon />;
      }
    }, [normalizedVariant]);

    const iconElement = icon || defaultIcon;

    // Determine icon size based on size prop if not explicitly provided
    const finalIconSize = iconSize ?? (size === "small" ? 20 : 24);

    // Clone the icon to ensure consistent sizing
    const iconWithSize = React.isValidElement(iconElement)
      ? React.cloneElement(iconElement as React.ReactElement, {
          width: finalIconSize,
          height: finalIconSize,
        })
      : iconElement;

    // Generate unique IDs for accessibility
    const titleElementId = useMemo(() => `message-title-${Math.random().toString(36).slice(2, 11)}`, []);
    const contentElementId = useMemo(() => `message-content-${Math.random().toString(36).slice(2, 11)}`, []);

    return (
      <div
        ref={ref}
        className={cn("message", styles.base, sizes[size], variants[normalizedVariant], looks[look], className)}
        data-testid={testId}
        role="alert"
        aria-live="polite"
        aria-label={ariaLabel}
        aria-labelledby={!ariaLabel && title ? titleElementId : undefined}
        aria-describedby={contentElementId}
        {...rest}
      >
        {/* Icon Container */}
        <div className={cn("message__icon", styles.icon)}>{iconWithSize}</div>

        {/* Content Container */}
        <div className={cn("message__content", styles.content)}>
          {/* Title */}
          {title && (
            <Typography
              variant="label"
              size="medium"
              className={cn("message__title", styles.title)}
              id={titleElementId}
            >
              {title}
            </Typography>
          )}

          {/* Main Content */}
          <div className={cn("message__body", styles.body)} id={contentElementId}>
            {children}
          </div>
        </div>

        {/* Close Button */}
        {closable && (
          <Button
            variant="neutral"
            look="string"
            size="smaller"
            className={cn("message__close", styles.close)}
            onClick={onClose}
            tooltip="Dismiss"
            aria-label="Dismiss message"
            data-testid="message-dismiss-button"
            leading={<XIcon />}
          />
        )}
      </div>
    );
  },
);

Message.displayName = "Message";
