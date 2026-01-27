import { forwardRef, useRef } from "react";
import { Badge, type BadgeProps } from "../badge/badge";
import { useBadgeOverflow } from "./useBadgeOverflow";
import styles from "./badge-group.module.scss";
import clsx from "clsx";

export interface BadgeGroupItem {
  id: string | number;
  label: string;
}

export interface BadgeGroupProps {
  /** Array of items to display as badges */
  items: BadgeGroupItem[];
  /** Badge variant (default: "info") */
  variant?: BadgeProps["variant"];
  /** Badge shape (default: "squared") */
  shape?: BadgeProps["shape"];
  /** Additional CSS class for the container */
  className?: string;
  /** Test ID for testing */
  "data-testid"?: string;
}

/**
 * BadgeGroup - Displays a collection of badges with automatic overflow handling
 *
 * Automatically calculates how many badges fit in the available width and shows
 * a "+n" badge for any overflowing items. Fully self-contained and reusable.
 *
 * @example
 * ```tsx
 * <BadgeGroup
 *   items={[
 *     { id: 1, label: "Tag 1" },
 *     { id: 2, label: "Tag 2" }
 *   ]}
 *   variant="info"
 *   shape="squared"
 * />
 * ```
 */
export const BadgeGroup = forwardRef<HTMLDivElement, BadgeGroupProps>(
  ({ items, variant = "info", shape = "squared", className, "data-testid": dataTestId }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Use custom hook to calculate badge overflow
    const visibleBadgeCount = useBadgeOverflow({
      enabled: items.length > 0,
      containerRef,
      itemCount: items.length,
    });

    if (items.length === 0) {
      return null;
    }

    return (
      <div ref={ref || containerRef} className={clsx(styles.container, className)} data-testid={dataTestId}>
        {items.map((item, index) => {
          const shouldHide = visibleBadgeCount !== null && index >= visibleBadgeCount;

          return (
            <Badge
              key={item.id}
              variant={variant}
              shape={shape}
              style={shouldHide ? { visibility: "hidden", position: "absolute" } : undefined}
            >
              {item.label}
            </Badge>
          );
        })}
        {/* Show +n badge if there are hidden badges */}
        {visibleBadgeCount !== null && visibleBadgeCount < items.length && (
          <Badge variant={variant} shape={shape} data-overflow-badge="true">
            +{items.length - visibleBadgeCount}
          </Badge>
        )}
      </div>
    );
  },
);

BadgeGroup.displayName = "BadgeGroup";
