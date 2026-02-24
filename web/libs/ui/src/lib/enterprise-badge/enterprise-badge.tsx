import type { FC } from "react";
import { IconSpark } from "../../assets/icons";
import { Badge } from "../badge/badge";

/**
 * @deprecated EnterpriseBadge is deprecated. Use Badge with variant="gradient" instead.
 *
 * Migration guide:
 * - <EnterpriseBadge /> → <Badge variant="gradient" icon={<IconSpark />}>Enterprise</Badge>
 * - <EnterpriseBadge ghost /> → <Badge variant="gradient" icon={<IconSpark />} style="ghost">Enterprise</Badge>
 * - <EnterpriseBadge filled /> → <Badge variant="gradient" icon={<IconSpark />} style="filled">Enterprise</Badge>
 * - <EnterpriseBadge compact /> → <Badge variant="gradient" icon={<IconSpark />} size="small" /> (icon-only)
 */
export interface EnterpriseBadgeProps {
  className?: string;
  filled?: boolean;
  compact?: boolean;
  ghost?: boolean;
}

/**
 * @deprecated EnterpriseBadge is deprecated. Use Badge with variant="gradient" instead.
 */
export const EnterpriseBadge: FC<EnterpriseBadgeProps> = ({ className, filled, compact, ghost }) => {
  // Map props to Badge props
  const style = filled ? "filled" : ghost ? "ghost" : "filled";
  const size = compact ? "small" : "default"; // Map compact to small

  // If compact and no children, show icon-only
  if (compact) {
    return <Badge variant="gradient" icon={<IconSpark />} style={style} size={size} className={className} />;
  }

  return (
    <Badge variant="gradient" icon={<IconSpark />} style={style} size={size} className={className}>
      Enterprise
    </Badge>
  );
};

export default EnterpriseBadge;
