import { Elem } from "../../../utils/bem";

export const SkeletonLine = ({
  lineCount = 1,
  width = "60%",
  height = "16px",
}: { lineCount?: number; width?: string; height?: string }) => {
  const rows = [];

  for (let i = 0; i < lineCount; i++) {
    rows.push(<Elem name="line" key={i} style={{ "--line-width": width, "--line-height": height }} />);
  }
  return <>{rows}</>;
};
