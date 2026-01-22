import { forwardRef } from "react";
import { observer } from "mobx-react";
import { IconBan, IconSparks, IconStar } from "@humansignal/icons";
import { Userpic } from "@humansignal/ui";
import { Space } from "../../common/Space/Space";
import { cn } from "../../utils/bem";
import "./AnnotationTabs.scss";

export const EntityTab = observer(
  forwardRef(
    ({ entity, selected, style, onClick, bordered = true, prediction = false, displayGroundTruth = false }, ref) => {
      const isUnsaved = (entity.userGenerate && !entity.sentUserGenerate) || entity.draftSelected;
      const infoIsHidden = entity.store.hasInterface("annotations:hide-info");

      return (
        <div
          ref={ref}
          data-annotation-id={entity.pk ?? entity.id}
          className={cn("entity-tab").mod({ selected, bordered }).toClassName()}
          style={style}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick?.(entity, prediction);
          }}
        >
          <Space size="small">
            <Userpic
              className={cn("entity-tab").elem("userpic").mod({ prediction }).toClassName()}
              showUsernameTooltip
              username={prediction ? entity.createdBy : null}
              user={infoIsHidden ? {} : (entity.user ?? { email: entity.createdBy })}
            >
              {prediction && <IconSparks style={{ width: 16, height: 16 }} />}
            </Userpic>

            {!infoIsHidden && (
              <div className={cn("entity-tab").elem("identifier").toClassName()}>
                ID {entity.pk ?? entity.id} {isUnsaved && "*"}
              </div>
            )}

            {displayGroundTruth && entity.ground_truth && (
              <IconStar className={cn("entity-tab").elem("ground-truth").toClassName()} />
            )}

            {entity.skipped && <IconBan className={cn("entity-tab").elem("skipped").toClassName()} />}
          </Space>
        </div>
      );
    },
  ),
);
