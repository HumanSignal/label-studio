import { observer } from "mobx-react";
import { cn } from "../../../utils/bem";

export type RegionLabelProps = {
  item: any;
};
export const RegionLabel = observer(({ item }: RegionLabelProps) => {
  const { type } = item ?? {};
  if (!type) {
    return "No Label";
  }
  if (type.includes("label")) {
    return item.value;
  }
  if (type.includes("region") || type.includes("range")) {
    const labelsInResults = item.labelings.map((result: any) => result.selectedLabels || []);

    const labels: any[] = [].concat(...labelsInResults);

    return (
      <div className={cn("labels-list").toClassName()}>
        {labels.map((label, index) => {
          const color = label.background || "#000000";

          return [
            index ? ", " : null,
            // This comes from an Elem tag that was set without a name. The CSS was fixed to make it work,
            // but this is clearly bad CSS usage.
            <div key={label.id} className={cn("labels-list").toClassName()} style={{ color }}>
              {label.value || "No label"}
            </div>,
          ];
        })}
      </div>
    );
  }
  if (type.includes("tool")) {
    return item.value;
  }
});
