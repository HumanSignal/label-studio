import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@humansignal/shad/utils";
import { cva } from "class-variance-authority";

type TabsContextType = {
  variant: "default";
};

const TabsContext = React.createContext<TabsContextType>({
  variant: "default",
});

const Tabs = ({
  variant = "default",
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & {
  variant?: "default";
}) => {
  return (
    <TabsContext.Provider value={{ variant }}>
      <TabsPrimitive.Root {...props} />
    </TabsContext.Provider>
  );
};
const tabsListVariants = cva("inline-flex justify-center items-center h-10 bg-neutral-surface p-1 gap-1", {
  variants: {
    variant: {
      default: "border border-neutral-border rounded-smaller",
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
  "inline-flex justify-center items-center h-8 px-tight text-body-regular font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "rounded-smaller data-[state=active]:bg-primary-background data-[state=active]:text-primary-content data-[state=active]:shadow-sm data-[state=inactive]:text-neutral-content-subtle hover:text-neutral-content",
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

const tabsContentVariants = cva("mt-2", {
  variants: {
    variant: {
      default: "",
    },
  },
});

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & {
    variant?: "default";
  }
>(({ className, ...props }, ref) => {
  const { variant } = React.useContext(TabsContext);
  return <TabsPrimitive.Content ref={ref} className={cn(tabsContentVariants({ variant }), className)} {...props} />;
});
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
