import type { PropsWithChildren, CSSProperties } from "react";
import { cnm } from "@humansignal/ui";

interface ChipProps extends PropsWithChildren {
  /**
   * Optional prefix content (e.g., count, percentage) that appears before the main content with a divider
   */
  prefix?: React.ReactNode;

  /**
   * Optional color configuration from label_attrs
   */
  colors?: {
    background?: string;
    border?: string;
    color?: string;
  };

  /**
   * Additional inline styles to apply
   */
  style?: CSSProperties;

  /**
   * Whether to show a thick left border (typically for labels)
   */
  thickBorder?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Unified chip component for displaying labels, badges, and tags throughout the Task Summary.
 * Supports various styling options including colors, borders, and prefixes for counts/percentages.
 */
export const Chip = ({ children, prefix, colors, style, thickBorder = false, className }: ChipProps) => {
  // Treat black text color as "use theme default" so it works in both light and dark mode
  const textColor = colors?.color && colors.color !== "rgb(0,0,0)" ? colors.color : undefined;

  const combinedStyles: CSSProperties = {
    ...style,
    ...(colors?.background && { background: colors.background }),
    ...(colors?.border && { borderColor: colors.border }),
    ...(textColor && { color: textColor }),
    ...(thickBorder && colors?.border && { borderLeft: `3px solid ${colors.border}` }),
  };
  const isPercentage = typeof prefix === "string" && prefix.endsWith("%");

  if (!children) return null;

  return (
    <span
      className={cnm(
        "inline-flex items-center whitespace-nowrap rounded-4 px-2 py-0.5",
        "text-xs border",
        !colors?.background && "bg-neutral-surface-active",
        !colors?.border && "border-neutral-border",
        !textColor && "text-neutral-content",
        className,
      )}
      style={combinedStyles}
    >
      {prefix && (
        <>
          <span className="font-semibold">{prefix}</span>
          {isPercentage ? (
            <span className="opacity-50 mx-tighter">|</span>
          ) : (
            <span className="opacity-50 mx-tightest">×</span>
          )}
        </>
      )}
      {children}
    </span>
  );
};
