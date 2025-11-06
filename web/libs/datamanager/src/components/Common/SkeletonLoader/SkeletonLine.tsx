import { cn } from "../../../utils/bem";

export const SkeletonLine = ({
  lineCount = 1,
  width = "60%",
  height = "16px",
}: { lineCount?: number; width?: string; height?: string }) => {
  const rows = [];

  for (let i = 0; i < lineCount; i++) {
    rows.push(
      <div
        className={cn("skeletonLoader").elem("line").toClassName()}
        key={i}
        style={{ "--line-width": width, "--line-height": height } as any}
      />,
    );
  }
  return <>{rows}</>;
};
