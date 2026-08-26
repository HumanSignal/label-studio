import { useLayoutEffect, useRef, useState } from "react";

interface UseAvatarOverflowProps {
  enabled: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  itemCount: number;
  recalcTrigger?: number;
}

/**
 * Custom hook to calculate avatar overflow and determine how many avatars should be visible.
 * Returns the number of avatars that fit in the available space, or null if all fit.
 *
 * Uses ResizeObserver to detect container width changes and calculates how many
 * 28px avatars with 4px gaps can fit, reserving space for a "+n" overflow badge.
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const visibleCount = useAvatarOverflow({
 *   enabled: true,
 *   containerRef,
 *   itemCount: users.length,
 * });
 * ```
 */
export const useAvatarOverflow = ({
  enabled,
  containerRef,
  itemCount,
  recalcTrigger,
}: UseAvatarOverflowProps): number | null => {
  const [visibleAvatarCount, setVisibleAvatarCount] = useState<number | null>(null);
  const isCalculatingRef = useRef<boolean>(false);
  const lastVisibleCountRef = useRef<number | null>(null);
  const calculationFrameRef = useRef<number | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);

  useLayoutEffect(() => {
    // Reset state when disabled
    if (!enabled) {
      setVisibleAvatarCount(null);
      lastVisibleCountRef.current = null;
      return;
    }

    const calculateVisibleAvatars = () => {
      // Clear any pending calculation frame
      if (calculationFrameRef.current) {
        cancelAnimationFrame(calculationFrameRef.current);
        calculationFrameRef.current = null;
      }

      // Prevent recursive calculations
      if (isCalculatingRef.current) return;

      const container = containerRef.current;
      if (!container) return;

      isCalculatingRef.current = true;

      // Get container width
      const containerWidth = container.offsetWidth;

      if (containerWidth === 0) {
        // Container not yet rendered, retry
        isCalculatingRef.current = false;
        requestAnimationFrame(calculateVisibleAvatars);
        return;
      }

      // Avatar sizing: 28px size + 4px gap = 32px per avatar
      // The badge is rendered as a 28px Userpic item with a 4px gap before it,
      // so it needs the same space as an avatar (itemSpacing)
      const avatarSize = 28;
      const gap = 4;
      const itemSpacing = avatarSize + gap; // 32px per avatar (including preceding gap)

      // Calculate how many avatars fit
      let visibleCount = 0;
      let cumulativeWidth = 0;

      for (let i = 0; i < itemCount; i++) {
        // First avatar takes full space (28px), subsequent ones add gap before them (4px + 28px = 32px)
        const widthNeeded = i === 0 ? avatarSize : itemSpacing;
        const potentialWidth = cumulativeWidth + widthNeeded;

        // Reserve space for badge if there are more items after this one
        // The badge is rendered as a 28px item with a 4px gap, same as itemSpacing
        const needsReserve = i < itemCount - 1;
        const totalNeeded = potentialWidth + (needsReserve ? itemSpacing : 0);

        if (totalNeeded <= containerWidth) {
          cumulativeWidth = potentialWidth;
          visibleCount++;
        } else {
          // This avatar doesn't fit
          break;
        }
      }

      // Determine the new visible count
      let newVisibleCount: number | null;
      if (visibleCount === itemCount) {
        // All avatars fit, no truncation needed
        newVisibleCount = null;
      } else if (visibleCount === 0) {
        // If no avatars fit, show at least 1 (will overflow but better than nothing)
        newVisibleCount = 1;
      } else {
        newVisibleCount = visibleCount;
      }

      // Only update state if the value actually changed
      if (newVisibleCount !== lastVisibleCountRef.current) {
        lastVisibleCountRef.current = newVisibleCount;

        // Temporarily disconnect MutationObserver to prevent it from seeing our changes
        const shouldReconnect = mutationObserverRef.current && containerRef.current;
        if (shouldReconnect) {
          mutationObserverRef.current?.disconnect();
        }

        setVisibleAvatarCount(newVisibleCount);

        // Reconnect after state update
        if (shouldReconnect) {
          requestAnimationFrame(() => {
            if (mutationObserverRef.current && containerRef.current) {
              mutationObserverRef.current.observe(containerRef.current, {
                childList: true,
                subtree: false,
              });
            }
          });
        }
      }

      isCalculatingRef.current = false;
    };

    // Use requestAnimationFrame to debounce and sync with paint cycle
    requestAnimationFrame(calculateVisibleAvatars);

    // Watch for avatar additions/removals (for async data)
    let lastChildCount = containerRef.current?.children.length || 0;
    mutationObserverRef.current = new MutationObserver((mutations) => {
      // Only react to actual child node additions/removals, not attribute changes
      const hasChildListChange = mutations.some((mutation) => mutation.type === "childList");
      if (!hasChildListChange) return;

      const currentChildCount = containerRef.current?.children.length || 0;
      // Only recalculate if the number of children actually changed
      if (currentChildCount === lastChildCount) return;

      lastChildCount = currentChildCount;

      // Debounce using requestAnimationFrame for responsive, paint-synced updates
      if (calculationFrameRef.current) {
        cancelAnimationFrame(calculationFrameRef.current);
      }
      calculationFrameRef.current = requestAnimationFrame(() => {
        calculationFrameRef.current = null;
        calculateVisibleAvatars();
      });
    });

    if (containerRef.current) {
      mutationObserverRef.current.observe(containerRef.current, {
        childList: true,
        subtree: false,
      });
    }

    // Recalculate on resize - observe container only
    const resizeObserver = new ResizeObserver(() => {
      // Debounce using requestAnimationFrame for responsive, paint-synced updates
      if (calculationFrameRef.current) {
        cancelAnimationFrame(calculationFrameRef.current);
      }
      calculationFrameRef.current = requestAnimationFrame(() => {
        calculationFrameRef.current = null;
        calculateVisibleAvatars();
      });
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      mutationObserverRef.current?.disconnect();
      resizeObserver.disconnect();
      if (calculationFrameRef.current) {
        cancelAnimationFrame(calculationFrameRef.current);
      }
    };
  }, [enabled, containerRef, itemCount, recalcTrigger]);

  return visibleAvatarCount;
};
