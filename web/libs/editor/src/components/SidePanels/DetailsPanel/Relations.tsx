import {
  IconEyeClosed,
  IconEyeOpened,
  IconMenu,
  IconRelationBi,
  IconRelationLeft,
  IconRelationRight,
  IconTrash,
} from "@humansignal/icons";
import { Button, Select } from "@humansignal/ui";
import { observer } from "mobx-react";
import { type FC, useCallback, useMemo, useState } from "react";
import { cn } from "../../../utils/bem";
import { wrapArray } from "../../../utils/utilities";
import { RegionItem } from "./RegionItem";
import "./Relations.scss";

const RealtionsComponent: FC<any> = ({ relationStore }) => {
  const relations = relationStore.orderedRelations;

  return (
    <div className={cn("relations").toClassName()}>
      <RelationsList relations={relations} />
    </div>
  );
};

interface RelationsListProps {
  relations: any[];
}

const RelationsList: FC<RelationsListProps> = observer(({ relations }) => {
  return (
    <>
      {relations.map((rel) => {
        return <RelationItem key={rel.id} relation={rel} />;
      })}
    </>
  );
});

const RelationItem: FC<{ relation: any }> = observer(({ relation }) => {
  const [hovered, setHovered] = useState(false);

  const onMouseEnter = useCallback(() => {
    if (!!relation.node1 && !!relation.node2) {
      setHovered(true);
      relation.toggleHighlight();
      relation.setSelfHighlight(true);
    }
  }, []);

  const onMouseLeave = useCallback(() => {
    if (!!relation.node1 && !!relation.node2) {
      setHovered(false);
      relation.toggleHighlight();
      relation.setSelfHighlight(false);
    }
  }, []);

  const directionIcon = useMemo(() => {
    const { direction } = relation;

    switch (direction) {
      case "left":
        return <IconRelationLeft data-direction={relation.direction} />;
      case "right":
        return <IconRelationRight data-direction={relation.direction} />;
      case "bi":
        return <IconRelationBi data-direction={relation.direction} />;
      default:
        return null;
    }
  }, [relation.direction]);

  // const;

  return (
    <div
      className={cn("relations").elem("item").mod({ hidden: !relation.visible }).toClassName()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={cn("relations").elem("content").toClassName()}>
        <div className={cn("relations").elem("icon").toClassName()} onClick={relation.rotateDirection}>
          <div className={cn("relations").elem("direction").toClassName()}>{directionIcon}</div>
        </div>
        <div className={cn("relations").elem("nodes").toClassName()}>
          <RegionItem compact withActions={false} withIds={false} region={relation.node1} />
          <RegionItem compact withActions={false} withIds={false} region={relation.node2} />
        </div>
        <div className={cn("relations").elem("actions").toClassName()}>
          <div className={cn("relations").elem("action").toClassName()}>
            {(hovered || relation.showMeta) && relation.hasRelations && (
              <Button
                primary={relation.showMeta}
                aria-label={`${relation.showMeta ? "Hide" : "Show"} Relation Labels`}
                type={relation.showMeta ? undefined : "text"}
                onClick={relation.toggleMeta}
                style={{ padding: 0 }}
              >
                <IconMenu />
              </Button>
            )}
          </div>
          <div className={cn("relations").elem("action").toClassName()}>
            {(hovered || !relation.visible) && (
              <Button
                variant="neutral"
                look="string"
                size="small"
                tooltip="Toggle Visibility"
                onClick={relation.toggleVisibility}
                aria-label={`${relation.visible ? "Hide" : "Show"} Relation`}
              >
                {relation.visible ? (
                  <IconEyeOpened style={{ width: 20, height: 20 }} />
                ) : (
                  <IconEyeClosed style={{ width: 20, height: 20 }} />
                )}
              </Button>
            )}
          </div>
          <div className={cn("relations").elem("action").toClassName()}>
            {hovered && (
              <Button
                variant="negative"
                look="string"
                size="small"
                aria-label="Delete Relation"
                tooltip="Delete Relation"
                onClick={() => {
                  relation.node1.setHighlight(false);
                  relation.node2.setHighlight(false);
                  relation.parent.deleteRelation(relation);
                }}
              >
                <IconTrash />
              </Button>
            )}
          </div>
        </div>
      </div>
      {relation.showMeta && <RelationMeta relation={relation} />}
    </div>
  );
});

const RelationMeta: FC<any> = observer(({ relation }) => {
  const { selectedValues, control } = relation;
  const { children, choice } = control;

  const selectionMode = useMemo(() => {
    return choice === "multiple";
  }, [choice]);

  const onChange = useCallback(
    (val: any) => {
      const values: any[] = wrapArray(val);

      relation.setRelations(values);
    },
    [relation],
  );
  const options = useMemo(
    () =>
      children.map((c: any) => ({
        value: c.value,
        style: { background: c.background },
      })),
    [children],
  );

  return (
    <div className={cn("relation-meta").toClassName()}>
      <Select
        multiple={selectionMode}
        style={{ width: "100%" }}
        placeholder="Select labels"
        value={selectedValues}
        onChange={onChange}
        options={options}
      />
    </div>
  );
});

export const Relations = observer(RealtionsComponent);
