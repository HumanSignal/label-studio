import { forwardRef } from "react";
import { IconSpark } from "../../assets/icons";
import { Badge, type BadgeProps } from "../badge/badge";

export type EnterpriseBadgeProps = Omit<BadgeProps, "variant" | "icon"> & {
  /** Icon to show. Defaults to IconSpark. Pass null for text-only (no icon). */
  icon?: React.ReactNode | null;
};

/**
 * Enterprise badge: a thin wrapper around Badge that always uses variant="gradient"
 * and defaults to IconSpark and children "Enterprise". Omit children or pass empty for icon-only.
 */
export const EnterpriseBadge = forwardRef<HTMLDivElement, EnterpriseBadgeProps>(
  ({ icon = <IconSpark />, children, ...props }, ref) => {
    const label = children === undefined ? "Enterprise" : children;
    return (
      <Badge ref={ref} variant="gradient" icon={icon} {...props}>
        {label}
      </Badge>
    );
  },
);

EnterpriseBadge.displayName = "EnterpriseBadge";
