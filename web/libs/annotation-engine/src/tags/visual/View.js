import React from 'react';
import { observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import Registry from '../../core/Registry';
import Tree from '../../core/Tree';
import Types from '../../core/Types';
import VisibilityMixin from '../../mixins/Visibility';
import { AnnotationMixin } from '../../mixins/AnnotationMixin';

/**
 * The `View` element is used to configure the display of blocks, similar to the div tag in HTML.
 * @example
 * <!-- Create two cards that flex to take up 50% of the screen width on the labeling interface -->
 * <View style="display: flex;">
 *   <View style="flex: 50%">
 *     <Header value="Facts:" />
 *     <Text name="text" value="$fact" />
 *   </View>
 *   <View style="flex: 50%; margin-left: 1em">
 *     <Header value="Enter your question:" />
 *     <TextArea name="question" />
 *   </View>
 * </View>
 * @name View
 * @meta_title View Tag for Defining How Blocks are Displayed
 * @meta_description Customize how blocks are displayed on the labeling interface in Label Studio for machine learning and data science projects.
 * @param {block|inline} display
 * @param {string} [style] CSS style string
 * @param {string} [className] - Class name of the CSS style to apply. Use with the Style tag
 * @param {region-selected|choice-selected|no-region-selected} [visibleWhen] Show the contents of a view when condition is true
 * @param {string} [whenTagName] Narrow down visibility by tag name. For regions, use the name of the object tag, for choices, use the name of the choices tag.
 * @param {string} [whenLabelValue] Narrow down visibility by label value
 * @param {string} [whenChoiceValue] Narrow down visibility by choice value
 */
const TagAttrs = types.model({
  classname: types.optional(types.string, ''),
  display: types.optional(types.string, 'block'),
  style: types.maybeNull(types.string),
});

const Model = types
  .model({
    id: types.identifier,
    type: 'view',
    children: Types.unionArray([
      'view',
      'header',
      'labels',
      'label',
      'table',
      'taxonomy',
      'choices',
      'choice',
      'collapse',
      'datetime',
      'number',
      'rating',
      'ranker',
      'rectangle',
      'ellipse',
      'polygon',
      'keypoint',
      'brush',
      'magicwand',
      'rectanglelabels',
      'ellipselabels',
      'polygonlabels',
      'keypointlabels',
      'brushlabels',
      'hypertextlabels',
      'timeserieslabels',
      'text',
      'audio',
      'image',
      'hypertext',
      'richtext',
      'timeseries',
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
      'pagedview',
      'paragraphs',
      'paragraphlabels',
      'video',
      'videorectangle',
      'ranker',
    ]),
  });

const ViewModel = types.compose('ViewModel', TagAttrs, Model, VisibilityMixin, AnnotationMixin);

const HtxView = observer(({ item }) => {
  let style = {};

  if (item.display === 'inline') {
    style = { display: 'inline-block', marginRight: '15px' };
  }

  if (item.style) {
    style = Tree.cssConverter(item.style);
  }

  if (item.isVisible === false) {
    style['display'] = 'none';
  }

  return (
    <div className={item.classname} style={style}>
      {Tree.renderChildren(item, item.annotation)}
    </div>
  );
});

Registry.addTag('view', ViewModel, HtxView);

export { HtxView, ViewModel };
