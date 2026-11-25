import { type RefObject, useLayoutEffect, useRef, useState } from "react";

type Options = {
  enabled: boolean;
  containerRef: RefObject<HTMLElement>;
  /** Measures the count at its widest, e.g. "+12"; hidden from view and from assistive tech. */
  countRef: RefObject<HTMLElement>;
  itemCount: number;
  /** Horizontal gap between children, in px. */
  gap: number;
  /** Visible count before the first measurement, so first paint and jsdom are stable. */
  initialVisible: number;
  /** Upper bound on visible items, whatever the width. */
  max?: number;
};

/**
 * How many of a container's inline children fit next to a "+N" count. Children marked `data-inline-item` are
 * measured; at least one always shows (it truncates with an ellipsis). Recalculates on resize and child changes.
 * Returns null when everything fits.
 */
export function useInlineOverflow({
  enabled,
  containerRef,
  countRef,
  itemCount,
  gap,
  initialVisible,
  max,
}: Options): number | null {
  const cap = max === undefined ? itemCount : Math.min(max, itemCount);
  const initial = enabled && cap < itemCount ? cap : enabled && itemCount > initialVisible ? initialVisible : null;
  const [visible, setVisible] = useState<number | null>(initial);
  const last = useRef<number | null>(initial);

  useLayoutEffect(() => {
    if (!enabled) {
      last.current = null;
      setVisible(null);
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    let frame = 0;
    const measure = () => {
      const items = Array.from(container.querySelectorAll<HTMLElement>(":scope > [data-inline-item]"));
      const available = container.clientWidth;
      if (!items.length) return;
      // jsdom and hidden containers report 0: keep the initial count instead of collapsing to one.
      if (available === 0) return;
      const countWidth = countRef.current?.offsetWidth ?? 0;
      let used = 0;
      let fit = 0;
      for (let i = 0; i < Math.min(items.length, cap); i++) {
        const width = items[i].scrollWidth;
        const next = used + (i ? gap : 0) + width;
        const needsCount = i < itemCount - 1;
        if (next + (needsCount ? gap + countWidth : 0) > available) break;
        used = next;
        fit++;
      }
      const result = fit >= itemCount ? null : Math.max(1, fit);
      if (result !== last.current) {
        last.current = result;
        setVisible(result);
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    schedule();
    const resize = new ResizeObserver(schedule);
    resize.observe(container);
    const mutations = new MutationObserver(schedule);
    mutations.observe(container, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
    };
  }, [enabled, containerRef, countRef, itemCount, gap, cap]);

  if (!enabled) return null;
  if (visible === null) return cap < itemCount ? cap : null;
  return Math.min(visible, cap);
}
