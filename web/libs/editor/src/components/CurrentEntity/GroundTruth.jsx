import { observer } from "mobx-react";
import { IconStar, IconStarOutline } from "@humansignal/icons";
import { Button, Tooltip } from "@humansignal/ui";
import { BemWithSpecificContext } from "../../utils/bem";
import { FF_DEV_3873, isFF } from "../../utils/feature-flags";
import "./GroundTruth.scss";

const { Block, Elem } = BemWithSpecificContext();

export const GroundTruth = observer(({ entity, disabled = false, size = "md" }) => {
  const title = entity.ground_truth ? "Unset this result as a ground truth" : "Set this result as a ground truth";

  return (
    !entity.skipped &&
    !entity.userGenerate &&
    entity.type !== "prediction" && (
      <Block name="ground-truth" mod={{ disabled, size }}>
        <Tooltip alignment="top-left" title={title}>
          <Button
            size="small"
            look="string"
            className="!p-0"
            onClick={(ev) => {
              ev.preventDefault();
              entity.setGroundTruth(!entity.ground_truth);
            }}
          >
            <Elem
              name="indicator"
              tag={isFF(FF_DEV_3873) && !entity.ground_truth ? IconStarOutline : IconStar}
              mod={{ active: entity.ground_truth, dark: isFF(FF_DEV_3873) }}
            />
          </Button>
        </Tooltip>
      </Block>
    )
  );
});
