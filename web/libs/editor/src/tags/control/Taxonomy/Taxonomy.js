import React from 'react';
import { observer } from 'mobx-react';
import { flow, types } from 'mobx-state-tree';
import { Spin } from 'antd';

import Infomodal from '../../../components/Infomodal/Infomodal';
import { NewTaxonomy } from '../../../components/NewTaxonomy/NewTaxonomy';
import { Taxonomy } from '../../../components/Taxonomy/Taxonomy';
import { guidGenerator } from '../../../core/Helpers';
import Registry from '../../../core/Registry';
import Types from '../../../core/Types';
import { AnnotationMixin } from '../../../mixins/AnnotationMixin';
import DynamicChildrenMixin from '../../../mixins/DynamicChildrenMixin';
import PerItemMixin from '../../../mixins/PerItem';
import PerRegionMixin from '../../../mixins/PerRegion';
import { ReadOnlyControlMixin } from '../../../mixins/ReadOnlyMixin';
import RequiredMixin from '../../../mixins/Required';
import SelectedChoiceMixin from '../../../mixins/SelectedChoiceMixin';
import { SharedStoreMixin } from '../../../mixins/SharedChoiceStore/mixin';
import VisibilityMixin from '../../../mixins/Visibility';
import { parseValue } from '../../../utils/data';
import { FF_DEV_2007_DEV_2008, FF_DEV_3617, FF_LSDV_4583, FF_TAXONOMY_ASYNC, FF_TAXONOMY_LABELING, isFF } from '../../../utils/feature-flags';
import ControlBase from '../Base';
import ClassificationBase from '../ClassificationBase';

import styles from './Taxonomy.styl';

/**
 * The `Taxonomy` tag is used to create one or more hierarchical classifications, storing both choice selections and their ancestors in the results. Use for nested classification tasks with the `Choice` tag.
 *
 * Use with the following data types: audio, image, HTML, paragraphs, text, time series, video.
 *
 * [^FF_LSDV_4583]: `fflag_feat_front_lsdv_4583_multi_image_segmentation_short` should be enabled for `perItem` functionality
 * [^FF_TAXONOMY_ASYNC]: `fflag_feat_front_lsdv_5451_async_taxonomy_110823_short` should be enabled to load items from `apiUrl` asynchronously
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
 * @param {string} [apiUrl]               - URL to fetch taxonomy from remote source; API should accept optional array `path` param: `apiUrl?path[]=root&path[]=child1` to return only nested children of `child1` node[^FF_TAXONOMY_ASYNC]
 * @param {boolean} [leafsOnly=false]     - Allow annotators to select only leaf nodes of taxonomy
 * @param {boolean} [showFullPath=false]  - Whether to show the full path of selected items
 * @param {string} [pathSeparator= / ]    - Separator to show in the full path (default is " / ")
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
  labeling: types.optional(types.boolean, false),
  leafsonly: types.optional(types.boolean, false),
  showfullpath: types.optional(types.boolean, false),
  pathseparator: types.optional(types.string, ' / '),
  apiurl: types.maybeNull(types.string),
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

    for (const child of nodes) {
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

/**
 * Taxonomy as a labeling tool should work with results in a different way, similar to per-regions.
 * But it won't create a new result on change if there are none, these items will be used to create labeled region by user.
 */
const TaxonomyLabelingResult = types
  .model({})
  .views(self => ({
    get result() {
      // @todo make it without duplication of ClassificationBase code
      if (!self.isLabeling && !self.perregion) {
        if (self.peritem) {
          return self._perItemResult;
        }
        return self.annotation.results.find(r => r.from_name === self);
      }

      // per-region Taxonomy and Taxonomy as a labeling tool share the same way to find a result,
      // they just display items for current region, attached directly or in result.
      const area = self.annotation.highlightedNode;

      if (!area) return null;

      return self.annotation.results.find(r => r.from_name === self && r.area === area);
    },
  }))
  .actions(self => {
    const Super = {
      updateResult: self.updateResult,
    };

    return {
      updateResult() {
        if (!self.isLabeling) return Super.updateResult();
        if (self.result) {
          self.result.area.setValue(self);
        }
      },
    };
  });

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
    _api: '', // will be filled after the first load in updateValue()
    _items: [], // items loaded via API
  }))
  .views(self => isFF(FF_DEV_3617) ? ({
    get children() {
      return self._children;
    },
    set children(val) {
      self._children = val;
    },
    get isLabeling() {
      return isFF(FF_TAXONOMY_LABELING) && self.labeling;
    },
  }) : ({}))
  .views(self => ({
    get userLabels() {
      return self.annotation.store.userLabels;
    },

    get holdsState() {
      return self.selected.length > 0;
    },

    get isSelected() {
      return self.holdsState;
    },

    get hasValue() {
      return self.holdsState;
    },

    get valueType() {
      return 'taxonomy';
    },

    get isLoadedByApi() {
      return isFF(FF_TAXONOMY_ASYNC) && !!self.apiurl;
    },

    get items() {
      if (self.isLoadedByApi) return self._items;

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

          // @todo why do we change items??
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
      // we are not mixing items from API with other kinds of items
      if (self.isLoadedByApi) return;

      const children = ChildrenSnapshots.get(self.name) ?? [];

      if (isFF(FF_DEV_3617) && self.store && children.length !== self.children.length) {
        setTimeout(() => self.updateChildren());
      } else {
        self.loading = false;
      }
    },

    /**
     * Load items from `apiUrl` and set them indirectly to `items` (via `_items`)
     * @param {string[]} path to load nested items by this path
     */
    loadItems: flow(function * (path) {
      if (!self._api) return;

      self.loading = true;

      let item = { children: self.items };

      if (path) {
        for (const level of path) {
          item = item.children?.find(ch => ch.path.at(-1) === level);
          if (!item) {
            self.loading = false;
            return;
          }
        }
      }

      // build url with `path` as array (path ['A', 'BC'] => path=A&path=BC)
      const url = new URL(self._api);

      path?.forEach(p => url.searchParams.append('path', p));

      try {
        const res = yield fetch(url);
        const dataRaw = yield res.json();
        // @todo temporary to support deprecated API response format (just array, no items)
        const data = dataRaw.items ?? dataRaw;
        const prefix = path ?? [];
        // @todo use aliases
        // const items = data.map(({ alias, isLeaf, value }) => ({ label: value, path: [...prefix, alias ?? value], depth: 0, isLeaf }));
        const items = data.map(({ isLeaf, value }) => ({ label: value, path: [...prefix, value], depth: 0, isLeaf }));

        if (path) {
          item.children = items;
          self._items = [...self._items];
        } else {
          self._items = items;
        }
      } catch (err) {
        console.error(err);
        Infomodal.error(`Failed to load taxonomy "${self.name}" from "${self.apiurl}" by path "${path}".`);
      }

      self.loading = false;
    }),

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

    unselectAll() {
      if (isFF(FF_TAXONOMY_LABELING) && self.isLabeling) self.selected = [];
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
  .actions(self => {
    const Super = {
      updateValue: self.updateValue,
    };

    return {
      /**
       * Usual method to parse values from task and init data.
       * Will store correct api url and load items from it.
       * Also used for Dynamic Children.
       */
      updateValue: flow(function * (store) {
        if (!self.isLoadedByApi) return Super.updateValue?.(store);

        self._api = parseValue(self.apiurl, store.task.dataObj);

        yield self.loadItems();
      }),
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
  ...(isFF(FF_TAXONOMY_LABELING) ? [TaxonomyLabelingResult] : []),
  ReadOnlyControlMixin,
  SelectedChoiceMixin,
  VisibilityMixin,
);

const HtxTaxonomy = observer(({ item }) => {
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
    // @todo use BEM class names + literal "taxonomy" for external styling
    <div className={[styles.taxonomy, 'taxonomy'].join(' ')} style={{ ...visibleStyle }}>
      {isFF(FF_TAXONOMY_ASYNC) ? (
        <NewTaxonomy
          items={item.items}
          selected={item.selected}
          onChange={item.onChange}
          onLoadData={item.loadItems}
          onAddLabel={item.userLabels && item.onAddLabel}
          onDeleteLabel={item.userLabels && item.onDeleteLabel}
          options={options}
          isEditable={!item.isReadOnly()}
        />
      ) : (
        item.loading && isFF(FF_DEV_3617) ? (
          <div className={styles.taxonomy__loading}>
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
        )
      )}
    </div>
  );
});

Registry.addTag('taxonomy', TaxonomyModel, HtxTaxonomy);

export { HtxTaxonomy, TaxonomyModel, TagAttrs };
