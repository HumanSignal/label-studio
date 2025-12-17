import { observer } from "mobx-react";
import { IconStar, IconStarOutline } from "@humansignal/icons";
import { Button, Tooltip } from "@humansignal/ui";
import { cn } from "../../utils/bem";
import { FF_DEV_3873, isFF } from "../../utils/feature-flags";
import "./GroundTruth.scss";

export const GroundTruth = observer(({ entity, disabled = false, size = "md" }) => {
  const title = entity.ground_truth ? "Unset this result as a ground truth" : "Set this result as a ground truth";
  const IndicatorIcon = isFF(FF_DEV_3873) && !entity.ground_truth ? IconStarOutline : IconStar;

  return (
    !entity.skipped &&
    !entity.userGenerate &&
    entity.type !== "prediction" && (
      <div className={cn("ground-truth").mod({ disabled, size }).toClassName()}>
        <Tooltip alignment="top-left" title={title}>
          <Button
            size="small"
            look="string"
            className="!p-0"
            onClick={(ev) => {
              ev.preventDefault();
              entity.setGroundTruth(!entity.ground_truth);
            }}
            data-testid="bottombar-ground-truth-button"
          >
            <IndicatorIcon
              className={cn("ground-truth")
                .elem("indicator")
                .mod({ active: entity.ground_truth, dark: isFF(FF_DEV_3873) })
                .toClassName()}
            />
          </Button>
        </Tooltip>
      </div>
    )
  );
});
