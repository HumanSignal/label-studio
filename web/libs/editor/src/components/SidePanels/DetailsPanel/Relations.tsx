import { observer } from 'mobx-react';
import { FC, useCallback, useMemo, useState } from 'react';
import { IconMenu, IconRelationBi, IconRelationLeft, IconRelationRight, IconTrash } from '../../../assets/icons';
import { IconEyeClosed, IconEyeOpened } from '../../../assets/icons/timeline';
import { Button } from '../../../common/Button/Button';
import { Block, Elem } from '../../../utils/bem';
import { wrapArray } from '../../../utils/utilities';
import { RegionItem } from './RegionItem';
import { Select } from 'antd';
import './Relations.styl';

const RealtionsComponent: FC<any> = ({ relationStore }) => {
  return (
    <Block name="relations">
      <RelationsList relations={relationStore.relations}/>
    </Block>
  );
};

interface RelationsListProps {
  relations: any[];
}

const RelationsList: FC<RelationsListProps> = observer(({ relations }) => {
  return (
    <>
      {relations.map((rel, i) => {
        return (
          <RelationItem key={i} relation={rel} />
        );
      })}
    </>
  );
});

const RelationItem: FC<{relation: any}> = observer(({ relation }) => {
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
      case 'left': return <IconRelationLeft data-direction={relation.direction}/>;
      case 'right': return <IconRelationRight data-direction={relation.direction}/>;
      case 'bi': return <IconRelationBi data-direction={relation.direction}/>;
      default: return null;
    }
  }, [relation.direction]);

  // const;

  return (
    <Elem name="item" mod={{ hidden: !relation.visible }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <Elem name="content">
        <Elem name="icon" onClick={relation.rotateDirection}>
          <Elem name="direction">
            {directionIcon}
          </Elem>
        </Elem>
        <Elem name="nodes">
          <RegionItem
            compact
            withActions={false}
            withIds={false}
            region={relation.node1}
          />
          <RegionItem
            compact
            withActions={false}
            withIds={false}
            region={relation.node2}
          />
        </Elem>
        <Elem name="actions">
          <Elem name="action">
            {(hovered || relation.showMeta) && relation.hasRelations && (
              <Button
                primary={relation.showMeta}
                aria-label={`${relation.showMeta ? 'Hide' : 'Show'} Relation Labels`}
                type={relation.showMeta ? undefined : 'text'}
                onClick={relation.toggleMeta}
                style={{ padding: 0 }}
              >
                <IconMenu/>
              </Button>
            )}
          </Elem>
          <Elem name="action">
            {(hovered || !relation.visible) && (
              <Button type="text" onClick={relation.toggleVisibility} aria-label={`${relation.visible ? 'Hide' : 'Show'} Relation`}>
                {relation.visible ? <IconEyeOpened/> : <IconEyeClosed />}
              </Button>
            )}
          </Elem>
          <Elem name="action">
            {hovered && (
              <Button type="text" danger aria-label="Delete Relation" onClick={() => {
                relation.node1.setHighlight(false);
                relation.node2.setHighlight(false);
                relation.parent.deleteRelation(relation);
              }}>
                <IconTrash/>
              </Button>
            )}
          </Elem>
        </Elem>
      </Elem>
      {relation.showMeta && (
        <RelationMeta relation={relation}/>
      )}
    </Elem>
  );
});

const RelationMeta: FC<any> = observer(({ relation }) => {
  const { selectedValues, control } = relation;
  const { children, choice } = control;

  const selectionMode = useMemo(() => {
    return choice === 'multiple' ? 'multiple' : undefined;
  }, [choice]);

  const onChange = useCallback((val: any) => {
    const values: any[] = wrapArray(val);

    relation.setRelations(values);
  }, [relation]);

  return (
    <Block name="relation-meta">
      <Select
        mode={selectionMode}
        style={{ width: '100%' }}
        placeholder="Select labels"
        value={selectedValues}
        onChange={onChange}
      >
        {children.map((c: any) => (
          <Select.Option key={c.value} value={c.value} style={{ background: c.background }}>
            {c.value}
          </Select.Option>
        ))}
      </Select>
    </Block>
  );
});

export const Relations = observer(RealtionsComponent);
