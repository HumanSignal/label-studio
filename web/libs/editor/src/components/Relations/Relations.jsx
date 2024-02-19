import React from 'react';
import { Button, List, Select } from 'antd';
import { getRoot, isValidReference } from 'mobx-state-tree';
import { observer } from 'mobx-react';
import { ArrowLeftOutlined, ArrowRightOutlined, DeleteOutlined, MoreOutlined, SwapOutlined } from '@ant-design/icons';

import styles from './Relations.module.scss';
import { NodeMinimal } from '../Node/Node';
import { wrapArray } from '../../utils/utilities';
import globalStyles from '../../styles/global.module.scss';

import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { Block, Elem } from '../../utils/bem';
import './Relations.styl';

const { Option } = Select;

const RelationMeta = observer(({ rl }) => {
  const r = rl.relations;
  const selected = r.getSelected().map(v => v.value);

  return (
    <div style={{ marginTop: '10px' }}>
      <h4 className={styles.header}>LABELS</h4>
      <Select
        mode={r.choice === 'multiple' ? 'multiple' : ''}
        style={{ width: '100%' }}
        placeholder="Please select"
        defaultValue={selected}
        onChange={(val) => {
          const values = wrapArray(val);

          r.unselectAll();
          values.forEach(v => r.findRelation(v).setSelected(true));
        }}
      >
        {r.children.map(c => (
          <Option key={c.value} style={{ background: c.background }}>
            {c.value}
          </Option>
        ))}
      </Select>
    </div>
  );
});

/**
 * Relation Component
 *
 * Shows the relationship between two selected items
 */
const Relation = observer(({ rl }) => {
  if (!isValidReference(() => rl.node1) || !isValidReference(() => rl.node2)) {
    return null;
  }

  const iconMap = {
    left: <ArrowLeftOutlined />,
    right: <ArrowRightOutlined />,
    bi: <SwapOutlined />,
  };

  return (
    <div>
      <div className={styles.section__blocks}>
        <div>
          <NodeMinimal node={rl.node1} />
        </div>
        <Button onClick={() => rl.rotateDirection()} size="small" className={styles.relationbtn}>
          {iconMap[rl.direction]}
        </Button>
        <div>
          <NodeMinimal node={rl.node2} />
        </div>
      </div>
    </div>
  );
});

const ListItem = observer(({ item }) => {
  const node = getRoot(item).annotationStore.selected.highlightedNode;
  const isSelected = node === item.node1 || node === item.node2;

  return (
    <List.Item
      className={isSelected && styles.selected}
      key={item.id}
      actions={[]}
      onMouseEnter={() => {
        item.toggleHighlight();
        item.setSelfHighlight(true);
      }}
      onMouseLeave={() => {
        item.toggleHighlight();
        item.setSelfHighlight(false);
      }}
    >
      <div className={styles.item}>
        <div>
          <Relation rl={item} />
        </div>
        <div>
          {item.hasRelations && (
            <Button
              size="small"
              onClick={() => {
                item.toggleMeta();
              }}
              className={styles.button}
            >
              <MoreOutlined />
            </Button>
          )}
          &nbsp;
          <Button
            size="small"
            className={styles.button}
            onClick={() => {
              item.node1.setHighlight(false);
              item.node2.setHighlight(false);
              item.parent.deleteRelation(item);
              return false;
            }}
            danger
          >
            <DeleteOutlined />
          </Button>
        </div>
      </div>
      {item.showMeta && <RelationMeta rl={item} />}
    </List.Item>
  );
});

const RelationsComponent = ({ store }) => {
  const annotation = store.annotationStore.selected;
  const { relations } = annotation.relationStore;
  const hasRelations = relations.length > 0;
  const relationsUIVisible = annotation.relationStore.showConnections;

  return (
    <Block name="relations">
      {/* override LS styles' height */}
      <Elem name="header">
        <Elem name="title">Relations ({relations.length})</Elem>
        {hasRelations && (
          <Button
            size="small"
            type="link"
            icon={relationsUIVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => annotation.relationStore.toggleConnections()}
            className={[relationsUIVisible ? styles.uihidden : styles.uivisible, globalStyles.link]}
          />
        )}
      </Elem>

      <Elem name="content">
        {hasRelations ? (
          <List
            size="small"
            bordered
            itemLayout="vertical"
            className={styles.list}
            dataSource={annotation.relationStore.relations}
            renderItem={item => <ListItem item={item} />}
          />
        ) : (
          <p>No Relations added yet</p>
        )}
      </Elem>
    </Block>
  );
};

export const Relations = observer(RelationsComponent);

export default Relations;
