import { forwardRef, useRef, useEffect, useState } from "react";
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
  /** Badge variant (default: "primary") */
  variant?: BadgeProps["variant"];
  /** Badge shape (default: "square") */
  shape?: BadgeProps["shape"];
  /** Badge style (default: "filled") */
  style?: BadgeProps["style"];
  /** Badge size (default: "medium") */
  size?: BadgeProps["size"];
  /** Additional CSS class for the container */
  className?: string;
  /** Test ID for testing */
  "data-testid"?: string;
  /** Whether to truncate badges that overflow (default: true) */
  truncate?: boolean;
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
 *   variant="primary"
 *   shape="square"
 * />
 * ```
 */
export const BadgeGroup = forwardRef<HTMLDivElement, BadgeGroupProps>(
  (
    {
      items,
      variant = "primary",
      shape = "square",
      style,
      size,
      className,
      "data-testid": dataTestId,
      truncate = true,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mergedRef = ref || containerRef;
    const [recalcTrigger, setRecalcTrigger] = useState(0);

    // Force recalculation when truncate changes to true (from false)
    useEffect(() => {
      if (truncate) {
        // Trigger recalculation by incrementing the trigger
        setRecalcTrigger((prev) => prev + 1);
      }
    }, [truncate]);

    // Use custom hook to calculate badge overflow only when truncate is enabled
    const visibleBadgeCount = useBadgeOverflow({
      enabled: truncate && items.length > 0,
      containerRef: containerRef,
      itemCount: items.length,
      recalcTrigger,
    });

    if (items.length === 0) {
      return null;
    }

    return (
      <div
        ref={mergedRef}
        className={clsx(styles.container, !truncate && styles.wrap, className)}
        data-testid={dataTestId}
      >
        {items.map((item, index) => {
          const shouldHide = truncate && visibleBadgeCount !== null && index >= visibleBadgeCount;

          return (
            <Badge
              key={item.id}
              variant={variant}
              shape={shape}
              style={style}
              size={size}
              className={shouldHide ? "invisible absolute" : undefined}
            >
              {item.label}
            </Badge>
          );
        })}
        {/* Show +n badge if truncate is enabled and there are hidden badges */}
        {truncate && visibleBadgeCount !== null && visibleBadgeCount < items.length && (
          <Badge variant={variant} shape={shape} style={style} size={size} data-overflow-badge="true">
            +{items.length - visibleBadgeCount}
          </Badge>
        )}
      </div>
    );
  },
);

BadgeGroup.displayName = "BadgeGroup";
