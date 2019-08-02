import React from "react";
import { observer, inject } from "mobx-react";
import { types, getRoot } from "mobx-state-tree";

import Registry from "../../core/Registry";
import { runTemplate } from "../../core/Template";

/**
 * HyperText element. Render html inside
 * @example
 * <View>
 *  <HyperText value="<p>Hey</p>"></HyperText>
 * <View>
 * @param {string} name
 * @param {string} value
 */
const TagAttrs = types.model({
  value: types.maybeNull(types.string),
  name: types.maybeNull(types.string),
});

function HyperTextActions(self) {
  return {
    fromStateJSON(obj) {
      if (obj.value.choices) {
        self.completion.names.get(obj.from_name).fromStateJSON(obj);
      }

      if (obj.value.text) {
        self.completion.names.get(obj.from_name).fromStateJSON(obj);
      }
    },
  };
}

const Model = types
  .model({
    id: types.identifier,
    type: "HyperText",
  })
  .views(self => ({
    get completion() {
      return getRoot(self).completionStore.selected;
    },
  }))
  .actions(self => HyperTextActions(self));

const HyperTextModel = types.compose(
  "HyperTextModel",
  TagAttrs,
  Model,
);

const HtxHyperTextView = inject("store")(
  observer(({ store, item }) => {
    if (!store.task) return null;

    return <div dangerouslySetInnerHTML={{ __html: runTemplate(item.value, store.task.dataObj) }} />;
  }),
);

Registry.addTag("hypertext", HyperTextModel, HtxHyperTextView);

export { HtxHyperTextView, HyperTextModel };
