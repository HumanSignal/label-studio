import React from 'react';
import { observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import Infomodal from '../../../components/Infomodal/Infomodal';
import { Taxonomy } from '../../../components/Taxonomy/Taxonomy';
import { guidGenerator } from '../../../core/Helpers';
import Registry from '../../../core/Registry';
import Types from '../../../core/Types';
import { AnnotationMixin } from '../../../mixins/AnnotationMixin';
import PerRegionMixin from '../../../mixins/PerRegion';
import RequiredMixin from '../../../mixins/Required';
import VisibilityMixin from '../../../mixins/Visibility';
import ControlBase from '../Base';
import DynamicChildrenMixin from '../../../mixins/DynamicChildrenMixin';
import { FF_DEV_2007_DEV_2008, FF_DEV_3617, FF_LSDV_4583, isFF } from '../../../utils/feature-flags';
import { SharedStoreMixin } from '../../../mixins/SharedChoiceStore/mixin';
import { Spin } from 'antd';
import './Taxonomy.styl';
import { ReadOnlyControlMixin } from '../../../mixins/ReadOnlyMixin';
import SelectedChoiceMixin from '../../../mixins/SelectedChoiceMixin';
import ClassificationBase from '../ClassificationBase';
import PerItemMixin from '../../../mixins/PerItem';

/**
 * The `Taxonomy` tag is used to create one or more hierarchical classifications, storing both choice selections and their ancestors in the results. Use for nested classification tasks with the `Choice` tag.
 *
 * Use with the following data types: audio, image, HTML, paragraphs, text, time series, video.
 *
 * [^FF_LSDV_4583]: `fflag_feat_front_lsdv_4583_multi_image_segmentation_short` should be enabled for `perItem` functionality
 *
 * @example
 * <!--Labeling configuration for providing a taxonomy of choices in response to a passage of text -->
 * <View>
 *   <Taxonomy name="media" toName="text">
 *     <Choice value="Online">
 *       <Choice value="UGC" />
 *       <Choice value="Free" />
 *       <Choice value="Paywall">
 *         <Choice value="NY Times" />
 *         <Choice value="The Wall Street Journal" />
 *       </Choice>
 *     </Choice>
 *     <Choice value="Offline" />
 *   </Taxonomy>
 *   <Text name="text" value="You'd never believe what he did to the country" />
 * </View>
 * @name Taxonomy
 * @meta_title Taxonomy Tag for Hierarchical Labels
 * @meta_description Customize Label Studio with the Taxonomy tag and use hierarchical labels for machine learning and data science projects.
 * @param {string} name                   - Name of the element
 * @param {string} toName                 - Name of the element that you want to classify
 * @param {boolean} [leafsOnly=false]     - Allow annotators to select only leaf nodes of taxonomy
 * @param {boolean} [showFullPath=false]  - Whether to show the full path of selected items
 * @param {string} [pathSeparator= / ]    - Separator to show in the full path
 * @param {number} [maxUsages]            - Maximum number of times a choice can be selected per task
 * @param {number} [maxWidth]             - Maximum width for dropdown
 * @param {number} [minWidth]             - Minimum width for dropdown
 * @param {boolean} [required=false]      - Whether taxonomy validation is required
 * @param {string} [requiredMessage]      - Message to show if validation fails
 * @param {string} [placeholder=]         - What to display as prompt on the input
 * @param {boolean} [perRegion]           - Use this tag to classify specific regions instead of the whole object
 * @param {boolean} [perItem]             - Use this tag to classify specific items inside the object instead of the whole object[^FF_LSDV_4583]
 */
const TagAttrs = types.model({
  toname: types.maybeNull(types.string),
  leafsonly: types.optional(types.boolean, false),
  showfullpath: types.optional(types.boolean, false),
  pathseparator: types.optional(types.string, ' / '),
  placeholder: '',
  minwidth: types.maybeNull(types.string),
  maxwidth: types.maybeNull(types.string),
  maxusages: types.maybeNull(types.string),
  ...(isFF(FF_DEV_2007_DEV_2008) ? { value: types.optional(types.string, '') } : {}),
});

function traverse(root) {
  const visitUnique = (nodes, path = []) => {
    const uniq = new Set();
    const result = [];

    for(const child of nodes) {
      if (uniq.has(child.value)) continue;
      uniq.add(child.value);
      result.push(visitNode(child, path));
    }

    return result;
  };

  const visitNode = function(node, parents = []) {
    const label = node.value;
    const hint = node.hint;
    const path = [...parents, node.alias ?? label];
    const depth = parents.length;
    const obj = { label, path, depth, hint };

    if (node.children) {
      obj.children = visitUnique(node.children, path);
    }

    return obj;
  };

  if (!root) return [];
  if (isFF(FF_DEV_2007_DEV_2008) && !Array.isArray(root)) return visitUnique([root]);
  return visitUnique(root);
}

const ChildrenSnapshots = new Map();

const Model = types
  .model({
    pid: types.optional(types.string, guidGenerator),

    type: 'taxonomy',
    [isFF(FF_DEV_3617) ? '_children' : 'children']: Types.unionArray(['choice']),
  })
  .volatile(() => ({
    maxUsagesReached: false,
    selected: [],
    loading: true,
  }))
  .views(self => isFF(FF_DEV_3617) ? ({
    get children() {
      return self._children;
    },
    set children(val) {
      self._children = val;
    },
  }) : ({}))
  .views(self => ({
    get userLabels() {
      return self.annotation.store.userLabels;
    },

    get holdsState() {
      return self.selected.length > 0;
    },

    get valueType() {
      return 'taxonomy';
    },

    get items() {
      const fromConfig = traverse(self.children);
      const fromUsers = self.userLabels?.controls[self.name] ?? [];

      for (const label of fromUsers) {
        let current = { children: fromConfig };
        const { origin, path } = label;
        const lastIndex = path.length - 1;

        for (let depth = 0; depth < lastIndex; depth++) {
          current = current.children?.find(item => item.label === path[depth]);
          if (!current) break;
        }

        if (current) {
          if (!current.children) current.children = [];
          current.children.push({ label: path[lastIndex], path, depth: lastIndex, origin });
        }
      }

      return fromConfig;
    },

    get defaultChildType() {
      return 'choice';
    },

    selectedValues() {
      return self.selected;
    },

    findItemByValueOrAlias(valueOrAlias) {
      // search the tree of items for the given
      // value or alias match
      const findItem = (items) => {
        for (const item of items) {
          const label = item.label;
          const value = item.path[item.path.length - 1];

          item.value = label;
          if (value !== label) {
            item.alias = value;
          }

          if (item.value === valueOrAlias || item.alias === valueOrAlias) {
            return item;
          }
          if (item.children) {
            const found = findItem(item.children, valueOrAlias);

            if (found) return found;
          }
        }
      };

      return findItem(self.items);
    },
  }))
  .actions(self => ({
    afterAttach() {
      const children = ChildrenSnapshots.get(self.name) ?? [];

      if (isFF(FF_DEV_3617) && self.store && children.length !== self.children.length) {
        setTimeout(() => self.updateChildren());
      } else {
        self.loading = false;
      }
    },

    beforeDestroy() {
      ChildrenSnapshots.delete(self.name);
    },

    updateChildren() {
      const children = ChildrenSnapshots.get(self.name) ?? [];

      if (children.length) {
        self._children = children;
        self.children = [...children];
        self.store.unlock();
        ChildrenSnapshots.delete(self.name);
      }

      self.loading = false;
    },

    requiredModal() {
      Infomodal.warning(self.requiredmessage || `Taxonomy "${self.name}" is required.`);
    },

    needsUpdate() {
      if (self.result) self.selected = self.result.mainValue;
      else self.selected = [];
      self.maxUsagesReached = self.selected.length >= self.maxusages;
    },

    updateFromResult() {
      self.needsUpdate();
    },

    onChange(_node, checked) {
      self.selected = checked.map(s => s.path ?? s);
      self.maxUsagesReached = self.selected.length >= self.maxusages;
      self.updateResult();
    },

    onAddLabel(path) {
      self.userLabels?.addLabel(self.name, path);
    },

    onDeleteLabel(path) {
      self.userLabels?.deleteLabel(self.name, path);
    },

  })).actions(self => {
    const Super = {
      validate: self.validate,
    };

    return {
      validate() {
        if (!Super.validate() || (self.maxusages && self.selected.length > self.maxusages)) return false;
      },

      beforeSend() {
        if (self.maxusages && self.selected.length > self.maxusages)
          Infomodal.warning(`The number of options selected (${self.selected.length}) exceed the maximum allowed (${self.maxusages}). To proceed, first unselect excess options for:\r\n • Taxonomy (${self.name})`);
      },
    };
  })
  .preProcessSnapshot((sn) => {
    if (isFF(FF_DEV_3617)) {
      const children = sn._children ?? sn.children;

      if (children && !ChildrenSnapshots.has(sn.name)) {
        ChildrenSnapshots.set(sn.name, children);
      }

      delete sn._children;
      delete sn.children;
    }

    return sn;
  });

const TaxonomyModel = types.compose('TaxonomyModel',
  ControlBase,
  ClassificationBase,
  TagAttrs,
  ...(isFF(FF_DEV_2007_DEV_2008) ? [DynamicChildrenMixin] : []),
  AnnotationMixin,
  RequiredMixin,
  Model,
  ...(isFF(FF_DEV_3617) ? [SharedStoreMixin] : []),
  PerRegionMixin,
  ...(isFF(FF_LSDV_4583) ? [PerItemMixin] : []),
  ReadOnlyControlMixin,
  SelectedChoiceMixin,
  VisibilityMixin,
);

const HtxTaxonomy = observer(({ item }) => {
  const style = { marginTop: '1em', marginBottom: '1em' };
  const visibleStyle = item.perRegionVisible() && item.isVisible ? {} : { display: 'none' };
  const options = {
    showFullPath: item.showfullpath,
    leafsOnly: item.leafsonly,
    pathSeparator: item.pathseparator,
    maxUsages: item.maxusages,
    maxWidth: item.maxwidth,
    minWidth: item.minwidth,
    placeholder: item.placeholder,
  };

  return (
    <div className="taxonomy" style={{ ...style, ...visibleStyle }}>
      {(item.loading && isFF(FF_DEV_3617)) ? (
        <div className="lsf-taxonomy">
          <Spin size="small"/>
        </div>
      ) : (
        <Taxonomy
          items={item.items}
          selected={item.selected}
          onChange={item.onChange}
          onAddLabel={item.userLabels && item.onAddLabel}
          onDeleteLabel={item.userLabels && item.onDeleteLabel}
          options={options}
          isEditable={!item.isReadOnly()}
        />
      )}
    </div>
  );
});

Registry.addTag('taxonomy', TaxonomyModel, HtxTaxonomy);

export { HtxTaxonomy, TaxonomyModel, TagAttrs };
