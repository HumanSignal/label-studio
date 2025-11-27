import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@humansignal/shad/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-neutral-background text-card-foreground",
        destructive:
          "text-negative-content bg-negative-background border-negative-border-subtler [&>svg]:text-current *:data-[slot=alert-description]:text-negative-content/90",
        info: "text-[var(--color-accent-blueberry-dark)] bg-[var(--color-accent-blueberry-subtlest)] border-[var(--color-accent-blueberry-bold)] [&>svg]:text-current *:data-[slot=alert-description]:text-[var(--color-accent-blueberry-dark)]/90",
        gradient:
          "text-[var(--color-accent-persimmon-base)] bg-gradient-to-br from-[var(--color-accent-canteloupe-subtlest)] via-[var(--color-accent-persimmon-subtlest)] to-[var(--color-accent-plum-subtlest)] border-[var(--color-accent-persimmon-border)] [&>svg]:text-current [&>[data-slot=alert-description]]:!block [&>[data-slot=alert-description]]:!col-start-2 [&>[data-slot=alert-description]]:text-sm has-[>svg]:!grid-cols-[16px_1fr] has-[>svg]:!gap-x-3",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-neutral-content col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
