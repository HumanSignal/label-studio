import { createContext, forwardRef, useContext, type HTMLAttributes, type ReactNode } from "react";
import { cnm } from "../../utils/utils";
import styles from "./card.module.css";

export type CardSize = "compact" | "regular";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** `regular` (24px padding, headline title) is the default; `compact` has 16px padding and a title-large title. */
  size?: CardSize;
  /** Shorthand: passing `title` or `description` renders the header and wraps the children in the content. */
  title?: ReactNode;
  description?: ReactNode;
  flushHeader?: boolean;
  flushContent?: boolean;
  headerClassName?: string;
  contentClassName?: string;
}

type PartProps = HTMLAttributes<HTMLDivElement>;

const CardSizeContext = createContext<CardSize>("regular");

// Numeric spacing (p-6 = 24px, p-4 = 16px) so twMerge lets a call site's padding class replace it.
const HEADER_PADDING: Record<CardSize, string> = {
  regular: "px-6 pt-6 pb-0",
  compact: "px-4 pt-4 pb-2",
};

const CONTENT_PADDING: Record<CardSize, string> = {
  regular: "p-6",
  compact: "p-4 [[data-slot=card-header]+&]:pt-0",
};

export const CardHeader = forwardRef<HTMLDivElement, PartProps & { flush?: boolean }>(
  ({ className, flush, ...rest }, ref) => {
    const size = useContext(CardSizeContext);
    return (
      <div
        ref={ref}
        data-slot="card-header"
        className={cnm("flex flex-col gap-tightest", flush ? "p-0" : HEADER_PADDING[size], className)}
        {...rest}
      />
    );
  },
);
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLDivElement, PartProps>(({ className, ...rest }, ref) => (
  <div ref={ref} data-slot="card-title" className={cnm(styles.title, className)} {...rest} />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<HTMLDivElement, PartProps>(({ className, ...rest }, ref) => (
  <div ref={ref} data-slot="card-description" className={cnm(styles.description, className)} {...rest} />
));
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, PartProps & { flush?: boolean }>(
  ({ className, flush, ...rest }, ref) => {
    const size = useContext(CardSizeContext);
    return (
      <div
        ref={ref}
        data-slot="card-content"
        className={cnm(flush ? "p-0" : CONTENT_PADDING[size], className)}
        {...rest}
      />
    );
  },
);
CardContent.displayName = "CardContent";

const CardRoot = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      size = "regular",
      title,
      description,
      flushHeader = false,
      flushContent = false,
      headerClassName,
      contentClassName,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const shorthand = title !== undefined || description !== undefined;
    const hasHeader = Boolean(title || description);
    return (
      <CardSizeContext.Provider value={size}>
        <div
          ref={ref}
          data-slot="card"
          data-size={size}
          className={cnm(
            "min-w-0 rounded-small border border-neutral-border bg-neutral-background text-neutral-content",
            styles.card,
            className,
          )}
          {...rest}
        >
          {shorthand ? (
            <>
              {hasHeader && (
                <CardHeader flush={flushHeader} className={headerClassName}>
                  {title && <CardTitle className="flex justify-between">{title}</CardTitle>}
                  {description && <CardDescription>{description}</CardDescription>}
                </CardHeader>
              )}
              <CardContent flush={flushContent} className={cnm(hasHeader && !flushContent && "pt-0", contentClassName)}>
                {children}
              </CardContent>
            </>
          ) : (
            children
          )}
        </div>
      </CardSizeContext.Provider>
    );
  },
);
CardRoot.displayName = "Card";

/**
 * A bordered surface grouping related content. Use `title` / `description` for the simple case, or compose
 * `Card.Header`, `Card.Title`, `Card.Description` and `Card.Content`. Footer-like content goes in the content.
 */
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
});
