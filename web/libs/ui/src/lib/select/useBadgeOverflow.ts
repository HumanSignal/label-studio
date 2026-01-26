import { useLayoutEffect, useRef, useState } from "react";

interface UseBadgeOverflowProps {
  enabled: boolean;
  badgesContainerRef: React.RefObject<HTMLSpanElement>;
  triggerRef: React.RefObject<HTMLDivElement>;
  selectedOptionsCount: number;
}

/**
 * Custom hook to calculate badge overflow and determine how many badges should be visible
 * Returns the number of badges that fit in the available space, or null if all fit
 */
export const useBadgeOverflow = ({
  enabled,
  badgesContainerRef,
  triggerRef,
  selectedOptionsCount,
}: UseBadgeOverflowProps): number | null => {
  const [visibleBadgeCount, setVisibleBadgeCount] = useState<number | null>(null);
  const isCalculatingRef = useRef<boolean>(false);
  const lastVisibleCountRef = useRef<number | null>(null);
  const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      setVisibleBadgeCount(null);
      return;
    }

    const calculateVisibleBadges = () => {
      // Clear any pending calculation timeout
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
        calculationTimeoutRef.current = null;
      }

      // Prevent recursive calculations
      if (isCalculatingRef.current) return;

      const container = badgesContainerRef.current;
      const trigger = triggerRef.current;
      if (!container || !trigger) return;

      // Get all badge elements (excluding the +n badge if it exists)
      const badges = Array.from(container.children).filter(
        (child) => !(child as HTMLElement).dataset.overflowBadge,
      ) as HTMLElement[];

      if (badges.length === 0) return;

      isCalculatingRef.current = true;

      // With visibility:hidden + position:absolute, badges are always measurable
      // No need to temporarily show them

      // Get available width from the badges container itself (most accurate)
      const containerWidth = container.offsetWidth;
      const availableWidth = containerWidth;

      // Calculate cumulative widths
      let cumulativeWidth = 0;
      let visibleCount = 0;
      const gap = 8; // 0.5rem gap between badges

      for (let i = 0; i < badges.length; i++) {
        const badgeWidth = badges[i].offsetWidth;

        if (badgeWidth === 0) {
          // Badges not yet rendered, retry
          isCalculatingRef.current = false;
          requestAnimationFrame(calculateVisibleBadges);
          return;
        }

        const widthWithGap = i === 0 ? badgeWidth : badgeWidth + gap;
        const potentialCumulative = cumulativeWidth + widthWithGap;

        // Reserve space for +n badge (approximately 48px) if there are more badges after this one
        const reservedSpace = i < badges.length - 1 ? 48 : 0;

        // Check if this badge fits (including reserved space for +n badge if needed)
        if (potentialCumulative + reservedSpace <= availableWidth) {
          cumulativeWidth = potentialCumulative;
          visibleCount++;
        } else {
          // This badge doesn't fit
          break;
        }
      }

      // Determine the new visible count
      let newVisibleCount: number | null;
      if (visibleCount === badges.length) {
        newVisibleCount = null;
      } else if (visibleCount === 0) {
        // If no badges fit, show at least 1 badge (it will overflow but that's better than nothing)
        newVisibleCount = 1;
      } else {
        newVisibleCount = visibleCount;
      }

      // Only update state if the value actually changed
      if (newVisibleCount !== lastVisibleCountRef.current) {
        lastVisibleCountRef.current = newVisibleCount;

        // Temporarily disconnect MutationObserver to prevent it from seeing our changes
        const shouldReconnect = mutationObserverRef.current && badgesContainerRef.current;
        if (shouldReconnect) {
          mutationObserverRef.current?.disconnect();
        }

        setVisibleBadgeCount(newVisibleCount);

        // Reconnect after state update
        if (shouldReconnect) {
          requestAnimationFrame(() => {
            if (mutationObserverRef.current && badgesContainerRef.current) {
              mutationObserverRef.current.observe(badgesContainerRef.current, {
                childList: true,
                subtree: false,
              });
            }
          });
        }
      }

      isCalculatingRef.current = false;
    };

    // Use double requestAnimationFrame to ensure badges are fully rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(calculateVisibleBadges);
    });

    // Watch for badge additions/removals (for async data)
    let lastChildCount = badgesContainerRef.current?.children.length || 0;
    mutationObserverRef.current = new MutationObserver((mutations) => {
      // Only react to actual child node additions/removals, not attribute changes
      const hasChildListChange = mutations.some((mutation) => mutation.type === "childList");
      if (!hasChildListChange) return;

      const currentChildCount = badgesContainerRef.current?.children.length || 0;
      // Only recalculate if the number of children actually changed
      if (currentChildCount === lastChildCount) return;

      lastChildCount = currentChildCount;

      // Debounce calculations - only run after mutations have settled
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
      calculationTimeoutRef.current = setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(calculateVisibleBadges);
        });
      }, 100); // 100ms debounce
    });

    if (badgesContainerRef.current) {
      mutationObserverRef.current.observe(badgesContainerRef.current, {
        childList: true,
        subtree: false,
      });
    }

    // Recalculate on resize - observe both trigger and badges container
    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize calculations
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
      calculationTimeoutRef.current = setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(calculateVisibleBadges);
        });
      }, 100); // 100ms debounce
    });

    if (triggerRef.current) {
      resizeObserver.observe(triggerRef.current);
    }
    if (badgesContainerRef.current) {
      resizeObserver.observe(badgesContainerRef.current);
    }

    return () => {
      mutationObserverRef.current?.disconnect();
      resizeObserver.disconnect();
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, [enabled, badgesContainerRef, triggerRef, selectedOptionsCount]);

  return visibleBadgeCount;
};
