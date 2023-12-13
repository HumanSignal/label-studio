import React from 'react';
import { types } from 'mobx-state-tree';
import { observer } from 'mobx-react';
import { Collapse } from 'antd';

import ProcessAttrsMixin from '../../mixins/ProcessAttrs';
import Registry from '../../core/Registry';

import Types from '../../core/Types';
import Tree from '../../core/Tree';

const { Panel } = Collapse;

/**
 * Collapse tag, a content area which can be collapsed and expanded.
 * @example
 * <Collapse>
 *   <Panel value="Panel Header">
 *     <View><Header value="Hello world" /></View>
 *   </Panel>
 * </Collapse>
 * @name Collapse
 * @param {boolean} [accordion=true]  - Works as an accordion
 * @param {string} [bordered=false]   - Shows border
 */
const PanelModel = types.model({
  type: 'panel',

  _value: types.optional(types.string, ''),
  value: types.optional(types.string, ''),

  children: Types.unionArray([
    'view',
    'header',
    'labels',
    'label',
    'table',
    'taxonomy',
    'choices',
    'choice',
    'rating',
    'ranker',
    'cube',
    'rectangle',
    'ellipse',
    'polygon',
    'keypoint',
    'brush',
    'cubelabels',
    'rectanglelabels',
    'ellipselabels',
    'polygonlabels',
    'keypointlabels',
    'brushlabels',
    'hypertextlabels',
    'text',
    'audio',
    'image',
    'hypertext',
    'audioplus',
    'list',
    'dialog',
    'textarea',
    'pairwise',
    'style',
    'label',
    'relations',
    'filter',
    'timeseries',
    'timeserieslabels',
    'paragraphs',
    'paragraphlabels',
    'object3d',
  ]),
});

const Model = types.model({
  type: 'collapse',

  size: types.optional(types.string, '4'),
  style: types.maybeNull(types.string),

  _value: types.optional(types.string, ''),
  value: types.optional(types.string, ''),

  bordered: types.optional(types.boolean, false),
  accordion: types.optional(types.boolean, true),

  children: Types.unionArray(['panel']),
});

const CollapseModel = types.compose('CollapseModel', Model, ProcessAttrsMixin);

const HtxCollapse = observer(({ item }) => {
  return (
    <Collapse bordered={item.bordered} accordion={item.accordion}>
      {item.children.filter(i => i.type === 'panel').map(i => (
        <Panel key={i._value} header={i._value}>{Tree.renderChildren(i, item.annotation)}</Panel>
      ))}
    </Collapse>
  );
});

Registry.addTag('panel', types.compose('PanelModel', PanelModel, ProcessAttrsMixin), () => {});
Registry.addTag('collapse', CollapseModel, HtxCollapse);

export { HtxCollapse, CollapseModel };
