import React from 'react';
import { inject, observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import Ranker from '../../components/Ranker/Ranker';
import Registry from '../../core/Registry';
import { AnnotationMixin } from '../../mixins/AnnotationMixin';
import ProcessAttrsMixin from '../../mixins/ProcessAttrs';
import { parseValue } from '../../utils/data';
import Base from './Base';

/**
 * The `List` tag is used to display a list of similar items like articles, search results, etc. Task data referred in `value` parameter should be an array of objects with `id`, `title`, and `body` fields.
 * It's much more lightweight than group of other tags like Text. And you can attach classification to provide additional data about this list.
 * Can be used with `Ranker` tag to rank items or pick relevant items from a list.
 * Items can be styled in `Style` tag by using `.htx-ranker-item` class.
 * @example
 * <!-- Visual appearance can be changed via Style tag with these classnames -->
 * <View>
 *   <Style>
 *     .htx-ranker-column { background: cornflowerblue; }
 *     .htx-ranker-item { background: lightgoldenrodyellow; }
 *   </Style>
 *   <List name="results" value="$items" title="Search Results" />
 * </View>
 * @example
 * <!-- Example data for List tag -->
 * {
 *   "items": [
 *     { "id": "blog", "title": "10 tips to write a better function", "body": "There is nothing worse than being left in the lurch when it comes to writing a function!" },
 *     { "id": "mdn", "title": "Arrow function expressions", "body": "An arrow function expression is a compact alternative to a traditional function" },
 *     { "id": "wiki", "title": "Arrow (computer science)", "body": "In computer science, arrows or bolts are a type class..." },
 *   ]
 * }
 * @name List
 * @meta_title List Tag displays items of the same type, like articles, search results, etc.
 * @meta_description Customize Label Studio by displaying similar items from task data for machine learning and data science projects.
 * @param {string} name         Name of the element
 * @param {string} value        Data field containing a JSON with array of objects (id, title, body) to rank
 * @param {string} [title]      Title of the list
 */
const Model = types
  .model({
    type: 'list',
    value: types.maybeNull(types.string),
    _value: types.frozen([]),
    title: types.optional(types.string, ''),
  })
  .views(self => ({
    get ranker() {
      return self.annotation.toNames.get(self.name)?.filter(t => t.type === 'ranker');
    },
    // index of all items from _value
    get items() {
      return Object.fromEntries(self._value.map(item => [item.id, item]));
    },
  }))
  .views(self => ({
    get dataSource() {
      return {
        items: self.items,
        columns: [{ id: self.name, title: self.title }],
        itemIds: { [self.name]: Object.keys(self.items) },
      };
    },
    get result() {
      return self.annotation?.results.find(r => r.from_name === self);
    },
  }))
  .actions(self => ({
    updateValue(store) {
      const value = parseValue(self.value, store.task.dataObj);

      if (!Array.isArray(value)) return;

      // ids should be strings
      self._value = value.map(item => ({ ...item, id: String(item.id) }));
    },
  }));

const ListModel = types.compose('ListModel', Base, ProcessAttrsMixin, AnnotationMixin, Model);

const HtxList = inject('store')(
  observer(({ item }) => {
    const data = item.dataSource;

    if (!data) return null;
    // Ranker tag will display all items in interactive mode
    if (item.ranker) return null;

    return (
      <React.StrictMode>
        <Ranker inputData={data} readonly />
      </React.StrictMode>
    );
  }),
);

Registry.addTag('list', ListModel, HtxList);
Registry.addObjectType(ListModel);

export { HtxList, ListModel };
