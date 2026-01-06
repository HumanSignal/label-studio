import type * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
  SheetClose,
} from "../../shad/components/ui/sheet";
import { cn } from "@humansignal/shad/utils";
import { cnm } from "../../utils/utils";

export interface DrawerProps {
  /**
   * Whether the drawer is open
   */
  open?: boolean;
  /**
   * Callback when the drawer open state changes
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Side from which the drawer slides in
   * @default "right"
   */
  side?: "top" | "right" | "bottom" | "left";
  /**
   * Drawer title
   * If not provided, a hidden "Drawer" title will be rendered for accessibility
   */
  title?: React.ReactNode;
  /**
   * Drawer description
   */
  description?: React.ReactNode;
  /**
   * Footer content (e.g., action buttons)
   */
  footer?: React.ReactNode;
  /**
   * Main content of the drawer
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes for the drawer content
   */
  className?: string;
  /**
   * Additional CSS classes for the drawer header
   */
  headerClassName?: string;
  /**
   * Additional CSS classes for the drawer footer
   */
  footerClassName?: string;
  /**
   * Additional CSS classes for the drawer body wrapper
   */
  bodyClassName?: string;
  /**
   * Whether to show the close button
   * @default true
   */
  showCloseButton?: boolean;
  /**
   * Whether to close the drawer when clicking outside (on the overlay)
   * @default true
   */
  closeOnClickOutside?: boolean;
  /**
   * Custom CSS classes for the SheetContent wrapper
   * This allows full control over the drawer content container styling
   * For left/right sides, default width is "w-1/4" if not specified
   */
  contentClassName?: string;
  /**
   * Custom data-testid for the drawer content
   * @default "drawer"
   */
  dataTestId?: string;
  /**
   * Callback fired when the drawer opens to handle auto-focus behavior
   * Set to `(e) => e.preventDefault()` to prevent auto-focus on the first focusable element
   */
  onOpenAutoFocus?: (event: Event) => void;
  /**
   * Inline styles for the drawer content container.
   * Useful for dynamic positioning calculations (e.g., top offset based on navbar/ribbon height).
   */
  contentStyle?: React.CSSProperties;
}

/**
 * Drawer component
 *
 * A slide-out panel component that appears from the edge of the screen.
 * Built on top of Radix UI Dialog primitives and styled with Tailwind CSS.
 *
 * @example
 * ```tsx
 * <Drawer
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="User Details"
 *   description="View and edit user information"
 * >
 *   <div>Content here</div>
 * </Drawer>
 * ```
 */
export const Drawer = ({
  open,
  onOpenChange,
  side = "right",
  title,
  description,
  footer,
  children,
  className,
  headerClassName,
  footerClassName,
  bodyClassName,
  showCloseButton = true,
  closeOnClickOutside = true,
  contentClassName,
  dataTestId = "drawer",
  onOpenAutoFocus,
  contentStyle,
}: DrawerProps) => {
  const defaultWidth = side === "left" || side === "right" ? "w-1/4" : undefined;
  const computedContentClassName = cnm(
    // Apply default width for left/right sides if contentClassName is not provided
    contentClassName ? undefined : defaultWidth,
    contentClassName, // This can override default width via twMerge
    className,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={true}>
      <SheetContent
        side={side}
        className={computedContentClassName}
        style={contentStyle}
        showCloseButton={closeOnClickOutside === false ? true : showCloseButton}
        closeOnClickOutside={closeOnClickOutside}
        data-slot="drawer-content"
        data-testid={dataTestId}
        onOpenAutoFocus={onOpenAutoFocus}
      >
        <SheetHeader
          className={cn(
            "p-base border-b border-neutral-border",
            headerClassName,
            !title && !description ? "sr-only !m-0 !p-0 !space-y-0 h-0 overflow-hidden" : undefined,
          )}
          data-slot="drawer-header"
          data-testid="drawer-header"
        >
          <SheetTitle data-slot="drawer-title" data-testid="drawer-title" className={cn(!title && "sr-only")}>
            {title || "Drawer"}
          </SheetTitle>
          {description && (
            <SheetDescription data-slot="drawer-description" data-testid="drawer-description">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>
        <div
          className={cn("flex-1 min-h-0 overflow-y-auto", bodyClassName)}
          data-slot="drawer-body"
          data-testid="drawer-body"
        >
          {children}
        </div>
        {footer && (
          <SheetFooter
            className={cn("p-base border-t border-neutral-border", footerClassName)}
            data-slot="drawer-footer"
            data-testid="drawer-footer"
          >
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
};

export { SheetTrigger as DrawerTrigger, SheetClose as DrawerClose, Sheet };
