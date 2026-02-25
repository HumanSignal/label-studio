import { forwardRef } from "react";
import { IconSpark } from "../../assets/icons";
import { Badge, type BadgeProps } from "../badge/badge";

export type EnterpriseBadgeProps = Omit<BadgeProps, "variant" | "icon"> & {
  /** Icon to show. Defaults to IconSpark. Pass null for text-only (no icon). */
  icon?: React.ReactNode | null;
};

/**
 * Enterprise badge: a thin wrapper around Badge that always uses variant="gradient"
 * and defaults to IconSpark. All other Badge props (style, shape, size, children, etc.) are passed through.
 */
export const EnterpriseBadge = forwardRef<HTMLDivElement, EnterpriseBadgeProps>(
  ({ icon = <IconSpark />, ...props }, ref) => {
    return (
      <Badge ref={ref} variant="gradient" icon={icon} {...props} />
    );
  },
);

EnterpriseBadge.displayName = "EnterpriseBadge";
