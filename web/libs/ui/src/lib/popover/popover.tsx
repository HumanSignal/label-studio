import type * as React from "react";
import {
  Popover as ShadPopover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
} from "../../shad/components/ui/popover";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import styles from "./popover.module.css";

type PopoverContentProps = React.ComponentProps<typeof PopoverContent>;

export interface PopoverProps extends React.ComponentProps<typeof ShadPopover> {
  trigger?: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
  /** Passed to Radix content; use to ignore interactions with portaled UI (e.g. nested dropdowns). */
  onInteractOutside?: PopoverContentProps["onInteractOutside"];
  onPointerDownOutside?: PopoverContentProps["onPointerDownOutside"];
}

const Popover = ({
  trigger,
  children,
  align = "start",
  sideOffset = 4,
  className,
  onInteractOutside,
  onPointerDownOutside,
  ...props
}: PopoverProps) => {
  return (
    <ShadPopover {...props}>
      <PopoverTrigger data-slot="popover-trigger" asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={sideOffset}
        data-slot="popover-content"
        onInteractOutside={onInteractOutside}
        onPointerDownOutside={onPointerDownOutside}
        className={twMerge(
          clsx(
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-99999 origin-(--radix-popover-content-transform-origin) rounded-md outline-hidden min-w-full bg-neutral-background",
            styles.popover,
            className,
          ),
        )}
      >
        {children}
      </PopoverContent>
    </ShadPopover>
  );
};

export { PopoverTrigger, PopoverContent, PopoverAnchor, Popover };
