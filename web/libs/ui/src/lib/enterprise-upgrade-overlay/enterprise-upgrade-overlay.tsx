import { forwardRef, type ReactNode } from "react";
import { cn } from "../../utils/utils";
import { Button } from "../button/button";
import { EnterpriseBadge } from "../enterprise-badge/enterprise-badge";
import { Typography } from "../typography/typography";
import styles from "./enterprise-upgrade-overlay.module.scss";

/**
 * EnterpriseUpgradeOverlay Component
 *
 * A reusable overlay component that encourages users to upgrade to Enterprise plan.
 * Displays a centered card with an Enterprise badge, customizable messaging, and action buttons.
 *
 * Features:
 * - Gradient border effect with backdrop blur
 * - Customizable title, description, and button labels
 * - Optional "Learn more" button with configurable URL
 * - Flexible callback handlers for user interactions
 * - Consistent styling with design system
 *
 * @example
 * Basic usage:
 * ```tsx
 * <EnterpriseUpgradeOverlay
 *   title="Unlock Advanced Features"
 *   description="Get access to premium features with our Enterprise plan."
 *   onContactSales={() => console.log('Contact sales clicked')}
 * />
 * ```
 *
 * @example
 * Custom button labels and URL:
 * ```tsx
 * <EnterpriseUpgradeOverlay
 *   title="Get access to Project Dashboards!"
 *   description="Performance analytics are available within the Enterprise plan."
 *   primaryButtonLabel="Talk to Sales"
 *   secondaryButtonLabel="View Pricing"
 *   learnMoreUrl="https://humansignal.com/pricing"
 *   onContactSales={handleContactSales}
 * />
 * ```
 *
 * @example
 * Without "Learn more" button:
 * ```tsx
 * <EnterpriseUpgradeOverlay
 *   title="Premium Feature"
 *   description="This feature is available exclusively in our Enterprise plan."
 *   showLearnMore={false}
 *   onContactSales={handleContactSales}
 * />
 * ```
 */

export interface EnterpriseUpgradeOverlayProps {
  /** Main title displayed in the overlay */
  title?: ReactNode;
  /** Description text or content explaining the feature */
  description?: ReactNode;
  /** Name of the feature being promoted (used in default text) */
  feature?: string;
  /** Optional URL for the "Learn more" button */
  learnMoreUrl?: string;
  /** Optional custom label for the primary CTA button */
  primaryButtonLabel?: string;
  /** Optional custom label for the secondary button */
  secondaryButtonLabel?: string;
  /** Whether to show the "Learn more" button */
  showLearnMore?: boolean;
  /** Callback when contact sales button is clicked */
  onContactSales?: () => void;
  /** Callback when learn more button is clicked */
  onLearnMore?: () => void;
  /** Custom wrapper class name */
  className?: string;
  /** Test ID for testing */
  "data-testid"?: string;
}

export const EnterpriseUpgradeOverlay = forwardRef<HTMLDivElement, EnterpriseUpgradeOverlayProps>(
  (
    {
      title = "Get access to Enterprise Features",
      description = "This feature is available within the Enterprise plan. Contact our sales team to get access to this and more!",
      learnMoreUrl = "https://docs.humansignal.com",
      primaryButtonLabel = "Contact Sales",
      secondaryButtonLabel = "Learn more",
      showLearnMore = true,
      onContactSales,
      onLearnMore,
      className,
      "data-testid": testId,
    },
    ref,
  ) => {
    const handleContactSales = () => {
      onContactSales?.();
    };

    const handleLearnMore = () => {
      if (onLearnMore) {
        onLearnMore();
      } else {
        window.open(learnMoreUrl, "_blank");
      }
    };

    return (
      <div ref={ref} className={cn(styles.overlay, className)} data-testid={testId}>
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.badge}>
              <EnterpriseBadge filled />
            </div>

            <Typography variant="headline" size="medium" className={styles.title}>
              {title}
            </Typography>

            <Typography variant="body" size="medium" className={styles.description}>
              {description}
            </Typography>

            <div className={styles.actions}>
              <Button onClick={handleContactSales} size="medium">
                {primaryButtonLabel}
              </Button>
              {showLearnMore && (
                <Button onClick={handleLearnMore} variant="primary" look="outlined" size="medium">
                  {secondaryButtonLabel}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

EnterpriseUpgradeOverlay.displayName = "EnterpriseUpgradeOverlay";

export default EnterpriseUpgradeOverlay;
