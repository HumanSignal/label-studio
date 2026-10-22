import { forwardRef, type HTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { CaretRightIcon } from "@humansignal/icons";
import { cn } from "../../utils/utils";
import { Typography } from "../typography/typography";
import styles from "./column-browser.module.css";

export type ColumnBrowserProps = HTMLAttributes<HTMLDivElement>;

/**
 * Side-by-side columns for drilling into a hierarchy, one column per level.
 * Compose it from `ColumnBrowserColumn` and `ColumnBrowserItem`; the browser owns no state,
 * the caller decides which columns are open and which item is selected in each.
 */
export const ColumnBrowser = forwardRef<HTMLDivElement, ColumnBrowserProps>(({ className, ...rest }, ref) => (
  <div ref={ref} className={cn(styles.root, className)} {...rest} />
));
ColumnBrowser.displayName = "ColumnBrowser";

export interface ColumnBrowserColumnProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Column heading, usually the parent item's label. */
  title: ReactNode;
  /** Shown after the title, typically the number of items. */
  count?: number;
  /** Right-aligned bar under the items, for a column-level action. */
  footer?: ReactNode;
  /** Class for the scrolling items area. */
  bodyClassName?: string;
}

export const ColumnBrowserColumn = forwardRef<HTMLDivElement, ColumnBrowserColumnProps>(
  ({ title, count, footer, bodyClassName, className, children, ...rest }, ref) => (
    <div ref={ref} className={cn(styles.column, className)} {...rest}>
      <div className={styles.header}>
        <Typography variant="label" size="small" className={styles.headerTitle}>
          {title}
        </Typography>
        {count != null && (
          <Typography variant="label" size="small" className={styles.headerCount}>
            {count}
          </Typography>
        )}
      </div>
      <div className={cn(styles.body, bodyClassName)}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  ),
);
ColumnBrowserColumn.displayName = "ColumnBrowserColumn";

export interface ColumnBrowserItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** Highlights the item as the open one in its column. */
  selected?: boolean;
  /** Called on click, Enter or Space. */
  onSelect?: () => void;
  /** Number of children; when set and above zero the item shows a count and a caret. */
  childCount?: number;
  /** Rendered after the label, before the actions: a badge, an icon, a status. */
  trailing?: ReactNode;
  /** Revealed on hover, focus or selection; keep it to a single compact control such as a menu trigger. */
  actions?: ReactNode;
}

export const ColumnBrowserItem = forwardRef<HTMLDivElement, ColumnBrowserItemProps>(
  ({ selected = false, onSelect, childCount, trailing, actions, className, children, onKeyDown, ...rest }, ref) => {
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || event.target !== event.currentTarget) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect?.();
      }
    };

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        className={cn(styles.item, selected && styles.itemSelected, className)}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        {...rest}
      >
        <Typography variant="body" size="small" className={styles.itemLabel}>
          {children}
        </Typography>
        {trailing}
        {actions && <span className={styles.itemActions}>{actions}</span>}
        {childCount != null && childCount > 0 && (
          <Typography variant="label" size="small" className={styles.itemMeta}>
            {childCount}
            <span className={styles.itemCaret}>
              <CaretRightIcon size={16} weight="bold" />
            </span>
          </Typography>
        )}
      </div>
    );
  },
);
ColumnBrowserItem.displayName = "ColumnBrowserItem";
