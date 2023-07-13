import React from 'react';
import { inject, observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import Ranker from '../../components/Ranker/Ranker';
import Registry from '../../core/Registry';
import Tree from '../../core/Tree';
import Types from '../../core/Types';
import { AnnotationMixin } from '../../mixins/AnnotationMixin';
import { ReadOnlyControlMixin } from '../../mixins/ReadOnlyMixin';
import { guidGenerator } from '../../utils/unique';
import Base from './Base';

// column to display items from original List, when there are no default Bucket
const ORIGINAL_ITEMS_KEY = '_';

/**
 * The `Ranker` tag is used to rank items in a `List` tag or pick relevant items from a `List`, depending on using nested `Bucket` tags.
 * In simple case of `List` + `Ranker` tags the first one becomes interactive and saved result is a dict with the only key of tag's name and with value of array of ids in new order.
 * With `Bucket`s any items from the `List` can be moved to these buckets, and resulting groups will be exported as a dict `{ bucket-name-1: [array of ids in this bucket], ... }`
 * By default all items will sit in `List` and will not be exported, unless they are moved to a bucket. But with `default="true"` parameter you can specify a bucket where all items will be placed by default, so exported result will always have all items from the list, grouped by buckets.
 * Columns and items can be styled in `Style` tag by using respective `.htx-ranker-column` and `.htx-ranker-item` classes. Titles of columns are defined in `title` parameter of `Bucket` tag.
 * Note: When `Bucket`s used without `default` param, the original list will also be stored as "_" named column in results, but that's internal value and this may be changed later.
 * @example
 * <!-- Visual appearance can be changed via Style tag with these predefined classnames -->
 * <View>
 *   <Style>
 *     .htx-ranker-column { background: cornflowerblue; }
 *     .htx-ranker-item { background: lightgoldenrodyellow; }
 *   </Style>
 *   <List name="results" value="$items" title="Search Results" />
 *   <Ranker name="rank" toName="results" />
 * </View>
 * @example
 * <!-- Example data and result for Ranker tag -->
 * {
 *   "items": [
 *     { "id": "blog", "title": "10 tips to write a better function", "body": "There is nothing worse than being left in the lurch when it comes to writing a function!" },
 *     { "id": "mdn", "title": "Arrow function expressions", "body": "An arrow function expression is a compact alternative to a traditional function" },
 *     { "id": "wiki", "title": "Arrow (computer science)", "body": "In computer science, arrows or bolts are a type class..." },
 *   ]
 * }
 * {
 *   "from_name": "rank",
 *   "to_name": "results",
 *   "type": "ranker",
 *   "value": { "ranker": { "rank": ["mdn", "wiki", "blog"] } }
 * }
 * @example
 * <!-- Example of using Buckets with Ranker tag -->
 * <View>
 *   <List name="results" value="$items" title="Search Results" />
 *   <Ranker name="rank" toName="results">
 *     <Bucket name="best" title="Best results" />
 *     <Bucket name="ads" title="Paid results" />
 *   </Ranker>
 * </View>
 * @example
 * <!-- Example result for Ranker tag with Buckets; data is the same -->
 * {
 *   "from_name": "rank",
 *   "to_name": "results",
 *   "type": "ranker",
 *   "value": { "ranker": {
 *     "best": ["mdn"],
 *     "ads": ["blog"]
 *   } }
 * }
 * @name Ranker
 * @meta_title Ranker Tag allows you to rank items in a List or, if Buckets are used, pick relevant items from a List
 * @meta_description Customize Label Studio by sorting results for machine learning and data science projects.
 * @param {string} name    Name of the element
 * @param {string} toName  List tag name to connect to
 */
const Model = types
  .model({
    type: 'ranker',
    toname: types.maybeNull(types.string),

    // @todo allow Views inside: ['bucket', 'view']
    children: Types.unionArray(['bucket']),
  })
  .views(self => ({
    get list() {
      const list = self.annotation.names.get(self.toname);

      return list.type === 'list' ? list : null;
    },
    get buckets() {
      return Tree.filterChildrenOfType(self, 'BucketModel');
    },
    /**
     * rank mode: tag's name
     * pick mode: undefined
     * group mode: name of the Bucket with default=true
     * @returns {string | undefined}
     */
    get defaultBucket() {
      return self.buckets.length > 0
        ? self.buckets.find(b => b.default)?.name
        : self.name;
    },
    get rankOnly() {
      return !self.buckets.length;
    },
    /** @returns {Array<{ id: string, title: string }>} */
    get columns() {
      if (!self.list) return [];
      if (self.rankOnly) return [{ id: self.name, title: self.list.title }];

      const columns = self.buckets.map(b => ({ id: b.name, title: b.title ?? '' }));

      if (!self.defaultBucket) columns.unshift({ id: ORIGINAL_ITEMS_KEY, title: self.list.title });

      return columns;
    },
  }))
  .views(self => ({
    get dataSource() {
      const data = self.list?._value;
      const items = self.list?.items;
      const ids = Object.keys(items);
      const columns = self.columns;
      /** @type {Record<string, string[]>} */
      const columnStubs = Object.fromEntries(self.columns.map(c => [c.id, []]));
      /** @type {Record<string, string[]>} */
      const result = self.result?.value.ranker;
      let itemIds = {};

      if (!data) return [];
      if (!result) {
        itemIds = { ...columnStubs, [self.defaultBucket ?? ORIGINAL_ITEMS_KEY]: ids };
      } else {
        itemIds = { ...columnStubs, ...result };

        // original list is displayed, but there are no such column in result,
        // so create it from results not groupped into buckets;
        // also if there are unknown columns in result they'll go there too.
        if (!self.defaultBucket) {
          const columnNames = self.columns.map(c => c.id);
          // all items in known columns, including original list (_)
          const selected = Object.entries(result)
            .filter(([key]) => columnNames.includes(key))
            .map(([_, values]) => values)
            .flat();
          // all undistributed items or items from unknown columns
          const left = ids.filter(id => !selected.includes(id));

          if (left.length) {
            // there are might be already some items in result
            itemIds[ORIGINAL_ITEMS_KEY] = [...(itemIds[ORIGINAL_ITEMS_KEY] ?? []), ...left];
          }
        }
      }

      return { items, columns, itemIds };
    },
    get result() {
      return self.annotation?.results.find(r => r.from_name === self);
    },
  }))
  .actions(self => ({
    createResult(data) {
      self.annotation.createResult({}, { ranker: data }, self, self.list);
    },

    updateResult(newData) {
      // check if result exists already, since only one instance of it can exist at a time
      if (self.result) {
        self.result.setValue(newData);
      } else {
        self.createResult(newData);
      }
    },

    // Create result on submit if it doesn't exist
    beforeSend() {
      if (!self.list) return;

      // @todo later we will most probably remove _ bucket from exported result
      if (self.result) return;

      const ids = Object.keys(self.list?.items);
      // empty array for every column
      const data = Object.fromEntries(self.columns.map(c => [c.id, []]));

      // List items should also be stored at the beginning for consistency, we add them to result
      data[self.defaultBucket ?? ORIGINAL_ITEMS_KEY] = ids;

      self.createResult(data);
    },
  }));

const RankerModel = types.compose('RankerModel', Base, AnnotationMixin, Model, ReadOnlyControlMixin);

const HtxRanker = inject('store')(
  observer(({ item }) => {
    const data = item.dataSource;

    if (!data) return null;

    return (
      <Ranker inputData={data} handleChange={item.updateResult} readonly={item.isReadOnly()} />
    );
  }),
);

/**
 * Simple container for items in `Ranker` tag. Can be used to group items in `List` tag.
 * @name Bucket
 * @subtag
 * @param {string} name        Name of the column; used as a key in resulting data
 * @param {string} title       Title of the column
 * @param {boolean} [default]  This Bucket will be used to display results from `List` by default; see `Ranker` tag for more details
 */
const BucketModel = types.model('BucketModel', {
  id: types.optional(types.identifier, guidGenerator),
  type: 'bucket',
  name: types.string,
  title: types.maybeNull(types.string),
  default: types.optional(types.boolean, false),
});

const HtxBucket = inject('store')(observer(({ item }) => {
  return <h1>{item.name}</h1>;
}));

Registry.addTag('ranker', RankerModel, HtxRanker);
Registry.addTag('bucket', BucketModel, HtxBucket);
Registry.addObjectType(RankerModel);

export { BucketModel, HtxRanker, RankerModel };
