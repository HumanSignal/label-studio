import clsx from "clsx";
import { forwardRef, type ReactNode, useEffect, useImperativeHandle, useRef } from "react";
import { Badge, type BadgeProps } from "../badge/badge";
import { formatCount } from "../indicator/format-count";
import styles from "./summary-label.module.css";
import { useInlineOverflow } from "./useInlineOverflow";

export type SummaryLabelItem = {
  id: string | number;
  label: string;
  /** Badge mode: overrides `variant` for this value, e.g. one colour per status. */
  variant?: BadgeProps["variant"];
  /** Badge mode: rendered before the label. */
  icon?: ReactNode;
};

export type SummaryLabelProps = {
  items: SummaryLabelItem[];
  /** Render each value as a Badge instead of text. The count stays text either way. */
  badges?: boolean;
  variant?: BadgeProps["variant"];
  shape?: BadgeProps["shape"];
  look?: BadgeProps["look"];
  size?: BadgeProps["size"];
  /** Badge mode: caps each badge's width, with an ellipsis and a tooltip. */
  badgeMaxWidth?: number | string;
  /** Text mode: between values (default ", "). */
  separator?: string;
  /** The count after the values: "+3" by default, "+1.2k" from a thousand up. */
  countLabel?: (hidden: number) => string;
  /** false shows every value, wrapping (e.g. a "Show all" view). Default true. */
  truncate?: boolean;
  /** Called when values start or stop being hidden behind the count. */
  onTruncationChange?: (truncated: boolean) => void;
  /** Values shown before the first measurement (default 1), so first paint and tests are stable. */
  initialVisible?: number;
  /** Never show more than this many values, whatever the width; the rest are counted, not rendered. */
  max?: number;
  className?: string;
  "data-testid"?: string;
  /** Test id on each value. */
  labelTestId?: string;
  /** Test id on the count. */
  countTestId?: string;
};

export const defaultCountLabel = (hidden: number) => `+${formatCount(hidden)}`;

/**
 * The same summary as plain text, for a sentence or a string prop: "Alpha, Beta +3". Shows `max` values; use
 * `SummaryLabel` wherever the width decides instead.
 */
export function summarizeLabels(
  labels: string[],
  {
    max,
    total = labels.length,
    countLabel = defaultCountLabel,
    separator = ", ",
  }: {
    max: number;
    /** How many values there are when `labels` holds only the first few (default: all of `labels`). */
    total?: number;
    countLabel?: (hidden: number) => string;
    separator?: string;
  },
): string {
  const shown = labels.slice(0, max);
  const hidden = total - shown.length;
  return hidden > 0 ? `${shown.join(separator)} ${countLabel(hidden)}` : shown.join(separator);
}

/**
 * Values that fit, then "+N" for the rest: a comma-separated text summary or a row of badges. More values show
 * as the container widens. What clicking the count does is up to the parent.
 */
export const SummaryLabel = forwardRef<HTMLDivElement, SummaryLabelProps>(
  (
    {
      items,
      badges = false,
      variant = "primary",
      shape,
      look,
      size,
      badgeMaxWidth,
      separator = ", ",
      countLabel = defaultCountLabel,
      truncate = true,
      onTruncationChange,
      initialVisible = 1,
      max,
      className,
      "data-testid": dataTestId,
      labelTestId,
      countTestId,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const countRef = useRef<HTMLSpanElement>(null);
    useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

    const visible = useInlineOverflow({
      enabled: truncate && items.length > 0,
      containerRef,
      countRef,
      itemCount: items.length,
      gap: badges ? 4 : 0,
      initialVisible,
      max,
    });
    const shown = visible ?? items.length;
    const hidden = items.length - shown;
    // Values past `max` can never show, so they are not rendered (long lists stay light, locators see only real values).
    const rendered = max === undefined ? items : items.slice(0, Math.min(max, items.length));

    const reported = useRef<boolean | null>(null);
    useEffect(() => {
      if (!onTruncationChange || !items.length) return;
      const truncated = hidden > 0;
      if (reported.current !== truncated) {
        reported.current = truncated;
        onTruncationChange(truncated);
      }
    }, [hidden, items.length, onTruncationChange]);

    if (!items.length) return null;

    // 8px before the count in both modes; in badge mode the 4px flex gap supplies half of it.
    const countGap = badges ? "pl-tighter" : "pl-tight";
    return (
      <div
        ref={containerRef}
        className={clsx(styles.root, badges ? "gap-tightest" : null, !truncate && styles.wrap, className)}
        data-slot="summary-label"
        data-truncated={hidden > 0 || undefined}
        data-testid={dataTestId}
        title={items.map((item) => item.label).join(separator)}
      >
        {rendered.map((item, index) => {
          const isHidden = index >= shown;
          const isLast = index === shown - 1;
          const className = clsx(styles.item, isLast && truncate && styles.last, isHidden && styles.hidden);
          return badges ? (
            <Badge
              key={item.id}
              data-inline-item=""
              aria-hidden={isHidden || undefined}
              variant={item.variant ?? variant}
              icon={item.icon}
              shape={shape}
              look={look}
              size={size}
              maxWidth={badgeMaxWidth}
              className={className}
              data-testid={labelTestId}
            >
              {item.label}
            </Badge>
          ) : (
            <span
              key={item.id}
              data-inline-item=""
              aria-hidden={isHidden || undefined}
              className={className}
              data-testid={labelTestId}
            >
              {item.label}
              {index < shown - 1 || (isHidden && index < items.length - 1) ? separator : null}
            </span>
          );
        })}
        {hidden > 0 && (
          <span className={clsx(styles.count, countGap)} data-testid={countTestId}>
            {countLabel(hidden)}
          </span>
        )}
        <span ref={countRef} aria-hidden className={clsx(styles.count, styles.measure, countGap)}>
          {countLabel(items.length)}
        </span>
      </div>
    );
  },
);

SummaryLabel.displayName = "SummaryLabel";
