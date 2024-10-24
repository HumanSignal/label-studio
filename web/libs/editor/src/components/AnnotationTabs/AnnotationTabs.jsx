import { forwardRef } from "react";
import { observer } from "mobx-react";
import { Userpic } from "../../common/Userpic/Userpic";
import { Space } from "../../common/Space/Space";
import { Block, Elem } from "../../utils/bem";
import "./AnnotationTabs.scss";
import { IconBan, LsSparks, LsStar } from "../../assets/icons";

export const EntityTab = observer(
  forwardRef(
    ({ entity, selected, style, onClick, bordered = true, prediction = false, displayGroundTruth = false }, ref) => {
      const isUnsaved = (entity.userGenerate && !entity.sentUserGenerate) || entity.draftSelected;
      const infoIsHidden = entity.store.hasInterface("annotations:hide-info");

      return (
        <Block
          name="entity-tab"
          ref={ref}
          mod={{ selected, bordered }}
          style={style}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick?.(entity, prediction);
          }}
        >
          <Space size="small">
            <Elem
              name="userpic"
              tag={Userpic}
              showUsername
              username={prediction ? entity.createdBy : null}
              user={infoIsHidden ? {} : (entity.user ?? { email: entity.createdBy })}
              mod={{ prediction }}
            >
              {prediction && <LsSparks style={{ width: 16, height: 16 }} />}
            </Elem>

            {!infoIsHidden && (
              <Elem name="identifier">
                ID {entity.pk ?? entity.id} {isUnsaved && "*"}
              </Elem>
            )}

            {displayGroundTruth && entity.ground_truth && <Elem name="ground-truth" tag={LsStar} />}

            {entity.skipped && <Elem name="skipped" tag={IconBan} />}
          </Space>
        </Block>
      );
    },
  ),
);
