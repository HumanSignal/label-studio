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
  const combinedStyles: CSSProperties = {
    ...style,
    ...(colors?.background && { background: colors.background }),
    ...(colors?.border && { borderColor: colors.border }),
    ...(colors?.color && { color: colors.color }),
    ...(thickBorder && colors?.border && { borderLeft: `3px solid ${colors.border}` }),
  };

  return (
    <span
      className={cnm(
        "inline-flex items-center whitespace-nowrap rounded-4 px-2 py-0.5",
        "text-xs font-medium border",
        !colors?.background && "bg-neutral-surface-subtle",
        !colors?.border && "border-neutral-border",
        !colors?.color && "text-neutral-content",
        className,
      )}
      style={combinedStyles}
    >
      {prefix && (
        <>
          <span className="font-semibold mr-1.5">{prefix}</span>
          {children && <span className="opacity-30 mr-1.5">|</span>}
        </>
      )}
      {children}
    </span>
  );
};
