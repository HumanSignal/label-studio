import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@humansignal/shad/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("inline-flex items-center w-full h-auto border-b border-neutral-border", className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex justify-center items-center text-body-regular font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 py-tight px-base -mb-px border-b-2 border-transparent data-[state=active]:border-primary-border data-[state=active]:text-primary-content data-[state=inactive]:text-neutral-content-subtle data-[state=inactive]:hover:text-neutral-content",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  // Inactive panels stay mounted with `hidden`; drop the top margin so they reserve no space.
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-wide data-[state=inactive]:mt-0 [hidden]:mt-0", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
