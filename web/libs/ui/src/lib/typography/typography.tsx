import type React from "react";
import { forwardRef, useState, useEffect, useRef } from "react";
import { cnm } from "../../utils/utils";
import styles from "./typography.module.scss";

// Size constants
const SIZES = {
  LARGE: "large",
  MEDIUM: "medium",
  SMALL: "small",
  SMALLER: "smaller",
  SMALLEST: "smallest",
} as const;

type Sizes = {
  display: typeof SIZES.LARGE | typeof SIZES.MEDIUM | typeof SIZES.SMALL;
  headline: typeof SIZES.LARGE | typeof SIZES.MEDIUM | typeof SIZES.SMALL;
  title: typeof SIZES.LARGE | typeof SIZES.MEDIUM | typeof SIZES.SMALL;
  label: typeof SIZES.MEDIUM | typeof SIZES.SMALL | typeof SIZES.SMALLER | typeof SIZES.SMALLEST;
  body: typeof SIZES.MEDIUM | typeof SIZES.SMALL | typeof SIZES.SMALLER | typeof SIZES.SMALLEST;
};

type Variant = keyof Sizes;

const config = {
  display: {
    tag: { [SIZES.LARGE]: "h1", [SIZES.MEDIUM]: "h1", [SIZES.SMALL]: "h1" },
  },
  headline: {
    tag: { [SIZES.LARGE]: "h2", [SIZES.MEDIUM]: "h2", [SIZES.SMALL]: "h2" },
  },
  title: {
    tag: { [SIZES.LARGE]: "h3", [SIZES.MEDIUM]: "h4", [SIZES.SMALL]: "h5" },
  },
  label: {
    tag: { [SIZES.MEDIUM]: "p", [SIZES.SMALL]: "p", [SIZES.SMALLER]: "p", [SIZES.SMALLEST]: "p" },
  },
  body: {
    tag: { [SIZES.MEDIUM]: "p", [SIZES.SMALL]: "p", [SIZES.SMALLER]: "p", [SIZES.SMALLEST]: "p" },
  },
} as const satisfies {
  [V in Variant]: {
    tag: Record<Sizes[V], keyof JSX.IntrinsicElements>;
  };
};

type TypographyProps<V extends Variant = Variant> = {
  variant?: V;
  size?: Sizes[V];
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  fontStyle?: "normal" | "italic";
  style?: React.CSSProperties;
  children?: React.ReactNode;
  truncateLines?: number;
  expandable?: boolean;
  expandLabel?: string;
  collapseLabel?: string;
  expandToggleClassName?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "style" | "className" | "children">;

const DEFAULT_TAG = "p";
const DEFAULT_CLASS = "typography-body-medium";

const Typography = forwardRef<HTMLElement, TypographyProps>(
  (
    {
      variant = "body",
      size = SIZES.MEDIUM,
      as,
      className,
      children,
      fontStyle = "normal",
      style,
      truncateLines,
      expandable = true,
      expandLabel = "Show more",
      collapseLabel = "Show less",
      expandToggleClassName,
      ...rest
    },
    ref,
  ) => {
    const variantConfig = config[variant];
    const tagMap = variantConfig?.tag;
    const tag = tagMap && size in tagMap ? tagMap[size as keyof typeof tagMap] : DEFAULT_TAG;
    const isValid = variant in config && tagMap && size in tagMap;
    const baseClass = isValid ? `typography-${variant}-${size}` : DEFAULT_CLASS;
    const Tag = (as || tag) as React.ElementType;

    const hasTruncation = truncateLines !== undefined && truncateLines > 0;

    // Only set up truncation logic if truncateLines is provided
    const [isExpanded, setIsExpanded] = useState(false);
    const [isClamped, setIsClamped] = useState(false);
    const contentRef = useRef<HTMLElement | null>(null);

    // Use internal ref for truncation, forwarded ref otherwise
    const elementRef = hasTruncation ? contentRef : (ref as React.Ref<HTMLElement>);

    // Check if content needs clamping using ResizeObserver
    useEffect(() => {
      if (!hasTruncation) return;

      const el = contentRef.current;
      if (!el) return;

      const compute = () => {
        const wasExpanded = isExpanded;
        // Temporarily collapse to check if clamping is needed
        if (wasExpanded) el.dataset.tmpCollapse = "1";
        const needsClamp = el.scrollHeight > el.clientHeight + 1;
        setIsClamped(needsClamp);
        if (wasExpanded) el.dataset.tmpCollapse = "";
      };

      compute();
      const ro = new ResizeObserver(() => compute());
      ro.observe(el);
      const onResize = () => compute();
      window.addEventListener("resize", onResize);

      return () => {
        ro.disconnect();
        window.removeEventListener("resize", onResize);
      };
    }, [hasTruncation, children, isExpanded]);

    // Apply inline styles for line-clamping when needed
    const clampStyles =
      hasTruncation && !isExpanded
        ? {
            display: "-webkit-box",
            WebkitLineClamp: truncateLines,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
            ...style,
          }
        : style;

    return (
      <>
        <Tag
          ref={elementRef}
          className={cnm(styles[baseClass], fontStyle === "italic" && "italic", className)}
          style={clampStyles}
          {...(hasTruncation && {
            "data-tmp-collapse": !isExpanded ? undefined : "",
            "aria-expanded": isExpanded,
          })}
          {...rest}
        >
          {children}
        </Tag>
        {hasTruncation && expandable && (isClamped || isExpanded) && (
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className={cnm(
              styles[baseClass],
              "text-primary-content hover:text-primary-content-hover block mt-1",
              expandToggleClassName,
            )}
            aria-expanded={isExpanded}
          >
            {isExpanded ? collapseLabel : expandLabel}
          </button>
        )}
      </>
    );
  },
);

Typography.displayName = "Typography";

export { Typography, SIZES };
