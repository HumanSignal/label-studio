"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { IconClose } from "@humansignal/icons";

import { cn } from "@humansignal/shad/utils";
import { Button } from "../../../lib/button/button";

const Sheet = DialogPrimitive.Root;

const SheetTrigger = DialogPrimitive.Trigger;

const SheetClose = DialogPrimitive.Close;

const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

type SheetContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
  closeOnClickOutside?: boolean;
};

const SheetContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  ({ side = "right", className, children, showCloseButton = true, closeOnClickOutside = true, ...props }, ref) => {
    return (
      <SheetPortal>
        <SheetOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed z-50 flex flex-col bg-neutral-surface shadow-lg border-neutral-border transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 focus:outline-none",
            side === "top" &&
              "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
            side === "bottom" &&
              "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            side === "left" &&
              "left-0 inset-y-0 h-full border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
            side === "right" &&
              "right-0 inset-y-0 h-full border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            className,
          )}
          onInteractOutside={closeOnClickOutside ? undefined : (e) => e.preventDefault()}
          tabIndex={-1}
          {...props}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close asChild>
              <Button
                look="string"
                size="small"
                className="absolute right-3 !p-0"
                style={{ top: "12px" }}
                leading={<IconClose />}
                aria-label="Close"
                data-testid="drawer-close-button"
              />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = DialogPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-tight text-center", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-tight", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-neutral-content", className)} {...props} />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-neutral-content-subtle", className)} {...props} />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
