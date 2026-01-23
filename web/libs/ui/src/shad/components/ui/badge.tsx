import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cnm } from "@humansignal/shad/utils";

const badgeVariants = cva(
  "inline-flex items-center border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        success: "border-transparent bg-positive-background text-positive-content hover:bg-positive-background/80",
        warning:
          "bg-warning-background border-warning-border-subtlest text-warning-content hover:bg-warning-background/80",
        info: "bg-primary-background border-primary-emphasis text-accent-grape-dark font-normal",
        outline: "text-neutral-content border-neutral-border",
        beta: "bg-accent-plum-subtle text-accent-plum-dark font-medium border-transparent",
      },
      shape: {
        rounded: "rounded-full",
        squared: "rounded-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      shape: "rounded",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, shape, ...props }: BadgeProps) {
  return <div className={cnm(badgeVariants({ variant, shape }), className)} {...props} />;
}

export { Badge, badgeVariants };
