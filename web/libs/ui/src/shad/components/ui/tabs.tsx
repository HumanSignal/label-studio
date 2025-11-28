import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@humansignal/shad/utils";
import { cva } from "class-variance-authority";

type TabsContextType = {
  variant: "default" | "flat";
};

const TabsContext = React.createContext<TabsContextType>({
  variant: "default",
});

const Tabs = ({
  variant = "default",
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & {
  variant?: "default" | "flat";
}) => {
  return (
    <TabsContext.Provider value={{ variant }}>
      <TabsPrimitive.Root {...props} />
    </TabsContext.Provider>
  );
};
const tabsListVariants = cva("inline-flex items-center", {
  variants: {
    variant: {
      default: "justify-center h-10 bg-neutral-surface p-1 gap-1 border border-neutral-border rounded-smaller",
      flat: "w-full h-auto border-b border-neutral-border",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const { variant } = React.useContext(TabsContext);
  return <TabsPrimitive.List ref={ref} className={cn(tabsListVariants({ variant }), className)} {...props} />;
});
TabsList.displayName = TabsPrimitive.List.displayName;

const tabsTriggerVariants = cva(
  "inline-flex justify-center items-center text-body-regular font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "h-8 px-tight rounded-smaller data-[state=active]:bg-primary-background data-[state=active]:text-primary-content data-[state=active]:shadow-sm data-[state=inactive]:text-neutral-content-subtle data-[state=inactive]:hover:text-neutral-content",
        flat: "py-tight px-base -mb-px border-b-2 border-transparent data-[state=active]:border-primary-border data-[state=active]:text-primary-content data-[state=inactive]:text-neutral-content-subtle data-[state=inactive]:hover:text-neutral-content",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const { variant } = React.useContext(TabsContext);
  return <TabsPrimitive.Trigger ref={ref} className={cn(tabsTriggerVariants({ variant }), className)} {...props} />;
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const tabsContentVariants = cva("", {
  variants: {
    variant: {
      default: "mt-2",
      flat: "mt-wide",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => {
  const { variant } = React.useContext(TabsContext);
  return <TabsPrimitive.Content ref={ref} className={cn(tabsContentVariants({ variant }), className)} {...props} />;
});
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
