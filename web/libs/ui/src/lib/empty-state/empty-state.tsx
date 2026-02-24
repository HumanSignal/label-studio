import React, { type ReactNode, forwardRef } from "react";
import { cn } from "../../utils/utils";
import { Typography } from "../typography/typography";
import styles from "./empty-state.module.scss";

// Size configuration
const sizes = {
  large: styles["size-large"],
  medium: styles["size-medium"],
  small: styles["size-small"],
} as const;

// Color variant configuration
const variants = {
  primary: styles["variant-primary"],
  neutral: styles["variant-neutral"],
  negative: styles["variant-negative"],
  positive: styles["variant-positive"],
  warning: styles["variant-warning"],
  gradient: styles["variant-gradient"],
} as const;

const iconSizes = {
  large: { width: 40, height: 40 }, // Data Manager size
  medium: { width: 32, height: 32 }, // Home page - icon fits well in w-12 h-12 container
  small: { width: 24, height: 24 }, // Sidepanel size
} as const;

const titleVariants = {
  large: { variant: "headline" as const, size: "medium" as const }, // Data Manager
  medium: { variant: "headline" as const, size: "small" as const }, // Home page
  small: { variant: "label" as const, size: "medium" as const }, // Sidepanel uses body-medium with font-medium
} as const;

const descriptionVariants = {
  large: { variant: "body" as const, size: "medium" as const }, // Data Manager
  medium: { variant: "body" as const, size: "small" as const }, // Home page
  small: { variant: "body" as const, size: "small" as const }, // Sidepanel uses body-small
} as const;

export type EmptyStateSize = keyof typeof sizes;
export type EmptyStateVariant = keyof typeof variants;

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Size of the empty state
   * - large: 40px icon, headline medium text, wider spacing (Data Manager style)
   * - medium: 32px icon, headline small text, standard spacing (Home page style)
   * - small: 24px icon, body medium text, tighter spacing (Sidepanel style)
   */
  size?: EmptyStateSize;

  /**
   * Color variant of the empty state
   * - primary: Blue theme with primary colors
   * - neutral: Gray theme for neutral states
   * - negative: Red theme for error states
   * - positive: Green theme for success states
   * - warning: Orange/Yellow theme for warning states
   * - gradient: AI gradient theme with special effects
   */
  variant?: EmptyStateVariant;

  /**
   * Icon element to display
   */
  icon: ReactNode;

  /**
   * Main title text
   */
  title: string;

  /**
   * Description text below the title
   */
  description: string;

  /**
   * Action buttons or other interactive elements
   */
  actions?: ReactNode;

  /**
   * Additional content to display between description and actions
   */
  additionalContent?: ReactNode;

  /**
   * Footer content displayed at the bottom
   */
  footer?: ReactNode;

  /**
   * Custom wrapper class name
   */
  className?: string;

  /**
   * Test ID for testing
   */
  "data-testid"?: string;

  /**
   * ARIA label for the empty state.
   * If not provided, the component automatically uses aria-labelledby
   * to reference the title element for accessibility.
   */
  "aria-label"?: string;

  /**
   * Optional ID for the title element (accessibility).
   */
  titleId?: string;

  /**
   * Optional ID for the description element (accessibility).
   */
  descriptionId?: string;
}

/**
 * Empty State Component
 *
 * A reusable component for displaying empty states throughout the application.
 * Supports different sizes and customizable content including icons, text, actions, and footer.
 *
 * Features:
 * - Three sizes: large, medium, small
 * - Six color variants: primary, neutral, negative, positive, warning, gradient
 * - Flexible content areas for actions and additional elements
 * - Full accessibility support with ARIA attributes
 * - Consistent spacing and typography
 *
 * @example
 * Basic usage:
 * ```tsx
 * <EmptyState
 *   size="large"
 *   variant="primary"
 *   icon={<IconUpload />}
 *   title="Import your data"
 *   description="Choose a dataset from your computer to get started"
 *   actions={
 *     <Button onClick={onImport}>Import Data</Button>
 *   }
 * />
 * ```
 *
 * @example
 * Multiple actions:
 * ```tsx
 * <EmptyState
 *   size="medium"
 *   variant="neutral"
 *   icon={<IconDatabase />}
 *   title="No data available"
 *   description="There are no records to display at this time"
 *   actions={
 *     <div>
 *       <Button onClick={onCreate}>
 *         Create New Project
 *       </Button>
 *       <Button variant="secondary" onClick={onImport}>
 *         Import Project
 *       </Button>
 *     </div>
 *   }
 * />
 * ```
 *
 * @example
 * Warning states:
 * ```tsx
 * <EmptyState
 *   size="small"
 *   variant="warning"
 *   icon={<IconAlert />}
 *   title="File format not supported"
 *   description="Please upload a CSV, JSON, or XML file"
 *   actions={
 *     <Button onClick={onSelectFile}>Choose Different File</Button>
 *   }
 * />
 * ```
 *
 * @example
 * Error states with custom aria-label:
 * ```tsx
 * <EmptyState
 *   size="medium"
 *   variant="negative"
 *   icon={<IconError />}
 *   title="Failed to load data"
 *   description="Unable to connect to the server. Please check your internet connection."
 *   aria-label="Error occurred while loading data"
 *   actions={
 *     <Button onClick={onRetry}>
 *       Try Again
 *     </Button>
 *   }
 * />
 * ```
 *
 * Accessibility Notes:
 * - Component automatically generates unique IDs for title and description elements
 * - Uses aria-labelledby to reference the title element for screen readers
 * - Uses aria-describedby to reference the description element for context
 * - Provide aria-label when you need a different accessible name than the title
 * - Perfect accessibility out of the box - no manual configuration needed
 */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      size = "medium",
      variant = "primary",
      icon,
      title,
      description,
      actions,
      additionalContent,
      footer,
      className,
      titleId: titleIdProp,
      descriptionId: descriptionIdProp,
      "data-testid": testId,
      "aria-label": ariaLabel,
      ...rest
    },
    ref,
  ) => {
    // Clone the icon and ensure it has the correct size for the size
    const iconSize = iconSizes[size];
    const iconWithSize = React.cloneElement(icon as React.ReactElement, {
      width: iconSize.width,
      height: iconSize.height,
    });

    // Get typography configuration for the size
    const titleConfig = titleVariants[size];
    const descriptionConfig = descriptionVariants[size];

    // Use provided IDs or generate unique IDs for accessibility
    const titleElementId = titleIdProp ?? `empty-state-title-${Math.random().toString(36).slice(2, 11)}`;
    const descriptionElementId = descriptionIdProp ?? `empty-state-desc-${Math.random().toString(36).slice(2, 11)}`;

    // Calculate action layout
    const actionLayout = actions
      ? (() => {
          // Filter out null/false values to count actual rendered elements
          const flattenedActions = React.Children.toArray(actions).filter(Boolean);
          const isSingleAction = flattenedActions.length === 1;

          return cn("flex gap-base w-full", isSingleAction ? "justify-center" : "", styles[`actions-${size}`]);
        })()
      : "";

    return (
      <div
        ref={ref}
        className={cn("empty-state", styles.base, sizes[size], variants[variant], className)}
        data-testid={testId}
        aria-label={ariaLabel}
        aria-labelledby={!ariaLabel ? titleElementId : undefined}
        aria-describedby={descriptionElementId}
        {...rest}
      >
        {/* Icon */}
        <div className={cn("empty-state__icon", styles.icon, "flex items-center justify-center rounded-full")}>
          {iconWithSize}
        </div>

        {/* Title and Description - Special layout for small variant */}
        {size === "small" ? (
          <div className={cn("empty-state__text-wrapper", styles["text-wrapper"])}>
            <Typography
              {...titleConfig}
              className={cn("empty-state__title", styles.title, "text-neutral-content")}
              id={titleElementId}
            >
              {title}
            </Typography>

            <Typography
              {...descriptionConfig}
              className={cn("empty-state__description", styles.description, "text-neutral-content-subtler")}
              id={descriptionElementId}
            >
              {description}
            </Typography>
          </div>
        ) : (
          <>
            {/* Standard layout for large and medium */}
            <Typography {...titleConfig} className={cn("empty-state__title", styles.title)} id={titleElementId}>
              {title}
            </Typography>

            <Typography
              {...descriptionConfig}
              className={cn("empty-state__description", styles.description, "text-neutral-content-subtler")}
              id={descriptionElementId}
            >
              {description}
            </Typography>
          </>
        )}

        {/* Additional Content */}
        {additionalContent && (
          <div className={cn("empty-state__additional", styles.additional)}>{additionalContent}</div>
        )}

        {/* Actions */}
        {actions && (
          <div className={cn("empty-state__actions", styles.actions)}>
            <div className={actionLayout}>{actions}</div>
          </div>
        )}

        {/* Footer */}
        {footer && <div className={cn("empty-state__footer", styles.footer)}>{footer}</div>}
      </div>
    );
  },
);

EmptyState.displayName = "EmptyState";
