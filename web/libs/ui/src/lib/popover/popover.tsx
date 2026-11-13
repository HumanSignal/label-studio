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
  side?: PopoverContentProps["side"];
  /** Attributes and interaction behavior for the portaled content element. */
  contentProps?: Omit<PopoverContentProps, "children" | "className" | "align" | "side" | "sideOffset"> & {
    "data-theme"?: "light" | "dark";
    "data-color-scheme"?: "light" | "dark";
    "data-testid"?: string;
  };
  className?: string;
  /** Accessible name of the portaled dialog content. */
  ariaLabel?: string;
  ariaLabelledBy?: string;
  onOpenAutoFocus?: PopoverContentProps["onOpenAutoFocus"];
  /** Passed to Radix content; use to ignore interactions with portaled UI (e.g. nested dropdowns). */
  onInteractOutside?: PopoverContentProps["onInteractOutside"];
  onPointerDownOutside?: PopoverContentProps["onPointerDownOutside"];
}

const CONTENT_CLASSES =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-99999 origin-(--radix-popover-content-transform-origin) rounded-md outline-hidden min-w-full bg-neutral-background";

export type PopoverPanelProps = PopoverContentProps;

/** The DS-styled content of a {@link Popover}; use it with `Popover.Root` and `Popover.Trigger`. */
const PopoverPanel = ({ className, align = "start", sideOffset = 4, ...props }: PopoverPanelProps) => (
  <PopoverContent
    data-slot="popover-content"
    align={align}
    sideOffset={sideOffset}
    {...props}
    className={twMerge(clsx(CONTENT_CLASSES, styles.popover, className))}
  />
);

const PopoverWrapper = ({
  trigger,
  children,
  align = "start",
  sideOffset = 4,
  side,
  contentProps,
  className,
  ariaLabel,
  ariaLabelledBy,
  onOpenAutoFocus,
  onInteractOutside,
  onPointerDownOutside,
  ...props
}: PopoverProps) => {
  return (
    <ShadPopover {...props}>
      <PopoverTrigger data-slot="popover-trigger" asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverPanel
        {...contentProps}
        side={side}
        aria-label={
          (ariaLabelledBy ?? contentProps?.["aria-labelledby"])
            ? undefined
            : (ariaLabel ?? contentProps?.["aria-label"])
        }
        aria-labelledby={ariaLabelledBy ?? contentProps?.["aria-labelledby"]}
        onOpenAutoFocus={onOpenAutoFocus ?? contentProps?.onOpenAutoFocus}
        align={align}
        sideOffset={sideOffset}
        onInteractOutside={onInteractOutside ?? contentProps?.onInteractOutside}
        onPointerDownOutside={onPointerDownOutside ?? contentProps?.onPointerDownOutside}
        className={className}
      >
        {children}
      </PopoverPanel>
    </ShadPopover>
  );
};

/**
 * Rich content anchored to a trigger. Pass `trigger` for the simple case; for a trigger that has to sit
 * inside other elements (a Tooltip, a badge), compose `Popover.Root`, `Popover.Trigger` and
 * `Popover.Content` instead.
 */
const Popover = Object.assign(PopoverWrapper, {
  Root: ShadPopover,
  Trigger: PopoverTrigger,
  Content: PopoverPanel,
  Anchor: PopoverAnchor,
});

export { PopoverTrigger, PopoverContent, PopoverAnchor, Popover };
