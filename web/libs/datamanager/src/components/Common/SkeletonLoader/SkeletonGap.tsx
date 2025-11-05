import { cn } from "../../../utils/bem";

export const SkeletonGap = ({ height = "4px" }: { height?: string }) => {
  return <div className={cn("skeletonLoader").elem("gap").toClassName()} style={{ "--height": height } as any} />;
};
