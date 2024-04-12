import { Elem } from "../../../utils/bem";

export const SkeletonGap = ({ height = "4px" }: { height?: string }) => {
  return <Elem name="gap" style={{ "--height": height }} />;
};
