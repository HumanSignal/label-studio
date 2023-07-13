import React, { Fragment } from 'react';
import { observer } from 'mobx-react';
import { Badge, Form, Input } from 'antd';
import { CompressOutlined, DeleteOutlined, LinkOutlined, PlusOutlined } from '@ant-design/icons';
import { Typography } from 'antd';

import { NodeDebug, NodeMinimal } from '../Node/Node';
import Hint from '../Hint/Hint';
import styles from './Entity.module.scss';
import { Tooltip } from '../../common/Tooltip/Tooltip';
import { Button } from '../../common/Button/Button';
import { Tag } from '../../common/Tag/Tag';
import { Space } from '../../common/Space/Space';
import { Block, Elem } from '../../utils/bem';
import './Entity.styl';
import { PER_REGION_MODES } from '../../mixins/PerRegion';
import { Hotkey } from '../../core/Hotkey';
import { IconWarning } from '../../assets/icons';


const { Paragraph, Text } = Typography;

const renderLabels = element => {
  return element.selectedLabels?.length ? (
    <Text key={element.pid} className={styles.labels}>
      Labels:&nbsp;
      {element.selectedLabels.map(label => {
        const bgColor = label.background || '#000000';

        return (
          <Tag key={label.id} color={bgColor} solid>
            {label.value}
          </Tag>
        );
      })}
    </Text>
  ) : null;
};

const renderResult = result => {
  if (result.type.endsWith('labels')) {
    return renderLabels(result);
  } else if (result.type === 'rating') {
    return <Paragraph>Rating: {result.mainValue}</Paragraph>;
  } else if (result.type === 'textarea' && !(result.from_name.perregion && result.from_name.displaymode === PER_REGION_MODES.REGION_LIST)) {
    return (
      <Paragraph className={styles.row}>
        <Text>Text: </Text>
        <Text mark className={styles.long}>
          {result.mainValue.join('\n')}
        </Text>
      </Paragraph>
    );
  } else if (result.type === 'choices') {
    return <Paragraph>Choices: {result.mainValue.join(', ')}</Paragraph>;
  }

  return null;
};

export default observer(({ store, annotation }) => {
  const { highlightedNode: node, selectedRegions: nodes, selectionSize } = annotation;
  const [editMode, setEditMode] = React.useState(false);

  const entityButtons = [];
  const hasEditableNodes = !!nodes.find(node => !node.isReadOnly());
  const hasEditableRegions = !!nodes.find(node => !node.isReadOnly() && !node.classification);

  const Node = window.HTX_DEBUG ? NodeDebug : NodeMinimal;

  if (hasEditableRegions) {
    entityButtons.push(
      <Hotkey.Tooltip key="relations" placement="topLeft" name="region:relation">
        <Button
          aria-label="Create Relation"
          className={styles.button}
          onClick={() => {
            annotation.startRelationMode(node);
          }}
          disabled={!node}
        >
          <LinkOutlined />

          {store.settings.enableHotkeys && store.settings.enableTooltips && <Hint>[ alt + r ]</Hint>}
        </Button>
      </Hotkey.Tooltip>,
    );

    entityButtons.push(
      <Tooltip key="meta" placement="topLeft" title="Add Meta Information">
        <Button
          className={styles.button}
          onClick={() => {
            setEditMode(true);
          }}
          disabled={!node}
        >
          <PlusOutlined />
        </Button>
      </Tooltip>,
    );
  }

  entityButtons.push(
    <Hotkey.Tooltip key="unselect" placement="topLeft" name="region:unselect">
      <Button
        className={styles.button}
        type="dashed"
        onClick={() => {
          annotation.unselectAll();
        }}
      >
        <CompressOutlined />
        <Hotkey.Hint name="region:unselect"/>
      </Button>
    </Hotkey.Tooltip>,
  );

  return (
    <Block name="entity">
      <Elem name="info" tag={Space} spread>
        <Elem name="node">
          {node ? (
            <>
              <Node node={node} />
              {' '}
              (ID: {node.id})
            </>
          ) : `${selectionSize} Region${(selectionSize > 1) ? 's are' : ' is'} selected` }
        </Elem>
        {!hasEditableNodes && <Badge count={'readonly'} style={{ backgroundColor: '#ccc' }} />}
      </Elem>
      <div className={styles.statesblk + ' ls-entity-states'}>
        {node?.score && (
          <Fragment>
            <Text>
              Score: <Text underline>{node.score}</Text>
            </Text>
          </Fragment>
        )}

        {node?.meta?.text && (
          <Text>
            Meta: <Text code>{node.meta.text}</Text>
            &nbsp;
            <DeleteOutlined
              type="delete"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                node.deleteMetaInfo();
              }}
            />
          </Text>
        )}

        <Fragment>{node?.results.map(renderResult)}</Fragment>
      </div>

      {node?.isDrawing && (
        <Elem name="warning">
          <IconWarning />
          <Elem name="warning-text">Incomplete {node.type.replace('region', '')}</Elem>
        </Elem>
      )}

      <div className={styles.block + ' ls-entity-buttons'}>
        <Space spread>
          <Space>
            {entityButtons}
          </Space>

          {hasEditableNodes && (
            <Hotkey.Tooltip placement="topLeft" name="region:delete">
              <Button
                look="danger"
                className={styles.button}
                onClick={() => {
                  annotation.deleteSelectedRegions();
                }}
              >
                <DeleteOutlined />

                <Hotkey.Hint name="region:delete"/>
              </Button>
            </Hotkey.Tooltip>
          )}
        </Space>
        {/* <Tooltip placement="topLeft" title="Hide: [h]"> */}
        {/*   <Button */}
        {/*     className={styles.button} */}
        {/*     onClick={() => { */}
        {/*         node.toggleHidden(); */}
        {/*         //node.unselectRegion(); */}
        {/*         //node.selectRegion(); */}
        {/*         // annotation.startRelationMode(node); */}
        {/*     }} */}
        {/*   > */}
        {/*     { node.hidden ? <EyeOutlined /> : <EyeInvisibleOutlined /> } */}
        {/*     {store.settings.enableHotkeys && store.settings.enableTooltips && <Hint>[ h ]</Hint>} */}
        {/*   </Button> */}
        {/* </Tooltip> */}
      </div>

      {editMode && (
        <Form
          style={{ marginTop: '0.5em', marginBottom: '0.5em' }}
          onFinish={() => {
            node.setMetaInfo(node.normInput);
            setEditMode(false);
          }}
        >
          <Input
            autoFocus
            onChange={ev => {
              const { value } = ev.target;

              node.setNormInput(value);
            }}
            style={{ marginBottom: '0.5em' }}
            placeholder="Meta Information"
          />

          <Button type="primary" htmlType="submit" style={{ marginRight: '0.5em' }}>
            Add
          </Button>

          <Button
            type="danger"
            htmlType="reset"
            onClick={ev => {
              setEditMode(false);

              ev.preventDefault();
              return false;
            }}
          >
            Cancel
          </Button>
        </Form>
      )}
    </Block>
  );
});
