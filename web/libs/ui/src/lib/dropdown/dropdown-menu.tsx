import { forwardRef, type KeyboardEvent, type ReactNode, useContext, useEffect, useRef } from "react";
import { cn } from "../../utils/utils";
import { Button, type ButtonProps } from "../button/button";
import { DropdownContext } from "./dropdown-context";

import "./dropdown-menu.prefix.css";

const ENABLED_ITEMS = '[role="menuitem"]:not([aria-disabled="true"])';

export interface DropdownMenuProps {
  /** The menu content: `Dropdown.Item` and `Dropdown.Divider` */
  children: ReactNode;
  /** CSS class name for the menu panel */
  className?: string;
  /** Accessible name of the menu */
  "aria-label"?: string;
  "data-testid"?: string;
}

/**
 * The panel of a menu of actions. Place it as the `content` of a `Dropdown.Trigger`.
 *
 * Moves focus to the first enabled item when it opens. Arrow keys, Home and End move between
 * enabled items; Escape closes the dropdown and returns focus to the trigger.
 */
export const DropdownMenu = ({ children, className, ...rest }: DropdownMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdown = useContext(DropdownContext);

  const getItems = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>(ENABLED_ITEMS) ?? []);

  useEffect(() => {
    if (dropdown) getItems()[0]?.focus({ preventScroll: true });
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      dropdown?.close();
      dropdown?.triggerRef.current?.focus();
      return;
    }

    const items = getItems();
    if (items.length === 0) return;

    const current = items.indexOf(document.activeElement as HTMLElement);
    let next: number;

    switch (event.key) {
      case "ArrowDown":
        next = (current + 1) % items.length;
        break;
      case "ArrowUp":
        next = current <= 0 ? items.length - 1 : current - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = items.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    items[next].focus({ preventScroll: true });
  };

  return (
    <div ref={menuRef} role="menu" className={cn("lsf-dropdown-menu", className)} onKeyDown={handleKeyDown} {...rest}>
      {children}
    </div>
  );
};

export interface DropdownItemProps
  extends Omit<
    ButtonProps,
    | "variant"
    | "look"
    | "size"
    | "align"
    | "icon"
    | "leading"
    | "trailing"
    | "waiting"
    | "waitingClickable"
    | "secondaryOnClick"
    | "onClick"
    | "children"
  > {
  /** The item label */
  children: ReactNode;
  /** Icon shown before the label, in a fixed-width column so labels align with or without an icon */
  icon?: ReactNode;
  /** Muted second line under the label, also the place for a hint on a disabled item */
  description?: ReactNode;
  /** Destructive action, shown in the negative colour */
  danger?: boolean;
  /** Greys the item out and ignores selection */
  disabled?: boolean;
  /** Called when the item is clicked or activated with the keyboard */
  onSelect?: () => void;
  /** Close the dropdown after selection (default true) */
  closeOnSelect?: boolean;
  "data-testid"?: string;
}

/**
 * One action in a `Dropdown.Menu`, built on `Button`. Items are reached with the arrow keys
 * (`tabIndex` -1), so the menu is one tab stop.
 */
export const DropdownItem = forwardRef<HTMLButtonElement, DropdownItemProps>(
  ({ children, icon, description, danger, disabled, onSelect, closeOnSelect = true, className, ...rest }, ref) => {
    const dropdown = useContext(DropdownContext);

    const handleClick = () => {
      if (disabled) return;
      onSelect?.();
      if (closeOnSelect) dropdown?.close();
    };

    return (
      <Button
        {...rest}
        ref={ref}
        type="button"
        role="menuitem"
        tabIndex={-1}
        look="ghost"
        variant={danger ? "negative" : "neutral"}
        size="small"
        align="left"
        disabled={disabled}
        aria-disabled={disabled || undefined}
        // Weight and height overrides of Button live in dropdown-menu.prefix.css (Button does not merge Tailwind classes).
        // The lsf- prefix is what postcss-prefix-lsf adds to every class in a .prefix.css file.
        className={cn("lsf-dropdown-menu__item w-full", className)}
        leading={<span className="lsf-dropdown-menu__icon">{icon}</span>}
        onClick={handleClick}
      >
        <span className="flex min-w-0 flex-col items-start whitespace-normal text-left">
          <span>{children}</span>
          {description ? <span className="text-body-small text-neutral-content-subtlest">{description}</span> : null}
        </span>
      </Button>
    );
  },
);

DropdownItem.displayName = "DropdownItem";

export interface DropdownDividerProps {
  className?: string;
  "data-testid"?: string;
}

/** A thin rule between groups of items in a `Dropdown.Menu`. */
export const DropdownDivider = ({ className, ...rest }: DropdownDividerProps) => (
  // biome-ignore lint/a11y/useFocusableInteractive: a separator is not interactive
  <div role="separator" className={cn("lsf-dropdown-menu__divider", className)} {...rest} />
);
