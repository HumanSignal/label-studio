import React, { Component } from "react";
import { observer, inject } from "mobx-react";
import { types, getType, getRoot } from "mobx-state-tree";

import { cloneNode } from "../../core/Helpers";
import Registry from "../../core/Registry";
import { guidGenerator, restoreNewsnapshot } from "../../core/Helpers";
import TextHighlight from "../../components/TextHighlight/TextHighlight";
import { runTemplate } from "../../core/Template";
import { TextRegionModel, HtxTextRegion } from "./TextRegion";

/**
 * Text tag shows a text that can be labeled
 * @example
 * <Text name="text-1" value="$text"></Text>
 * @name Text
 * @param {string} name of the element
 * @param {string} value of the element
 * @param {boolean} selelectWithoutLabel controls if text can be selected without any labels selected
 */
const TagAttrs = types.model("TextModel", {
  name: types.maybeNull(types.string),
  // text: types.maybeNull(types.optional(types.string, "Please set \"value\" attribute of Text")),
  value: types.maybeNull(types.string),
  selelectwithoutlabel: types.optional(types.boolean, false),

  hidden: types.optional(types.enumeration(["true", "false"]), "false"),
  /**
   * If we allow selecting parts of words of we select whole word only
   */
  adjustselection: types.optional(types.boolean, true),
  selectionenabled: types.optional(types.boolean, true),
});

const Model = types
  .model("TextModel", {
    id: types.optional(types.identifier, guidGenerator),
    type: "text",
    regions: types.array(TextRegionModel),

    _value: types.optional(types.string, ""),
  })
  .views(self => ({
    get hasStates() {
      const states = self.states();
      return states && states.length > 0;
    },

    get completion() {
      return getRoot(self).completionStore.selected;
    },

    states() {
      return self.completion.toNames.get(self.name);
    },

    activeStates() {
      const states = self.states();
      return states
        ? states.filter(s => s.isSelected && (getType(s).name === "LabelsModel" || getType(s).name === "RatingModel"))
        : null;
    },
  }))
  .actions(self => ({
    remove() {
      // if (self.generated) {
      //     const m = Registry.getModelByTag('textarea');
      //     const ta = getParentOfType(self, m);
      //     ta.deleteText(self);
      // }
    },

    findRegion(start, end) {
      const immutableRange = self.regions.find(r => r.start === start && r.end === end);
      return immutableRange;
    },

    updateValue(store) {
      self._value = runTemplate(self.value, store.task.dataObj);
    },

    _addRegion(params) {
      const r = TextRegionModel.create(params);

      self.regions.push(r);
      self.completion.addRegion(r);

      return r;
    },

    addRegion(range) {
      const states = self.activeStates();
      const clonedStates = states
        ? states.map(s => {
            return cloneNode(s);
          })
        : null;

      /**
       * Selelect without label
       * Default: false
       */
      if (!self.selelectwithoutlabel && !clonedStates.length) return null;

      const r = self._addRegion({
        start: range.start,
        end: range.end,
        text: range.text,
        states: clonedStates, // tl.cloneActiveStates()
      });

      states &&
        states.forEach(s => {
          return s.unselectAll();
        });

      return r;
    },

    /**
     * Return JSON
     */
    toStateJSON() {
      const objectsToReturn = self.regions.map(r => r.toStateJSON());
      return objectsToReturn;
    },

    /**
     *
     * @param {*} obj
     * @param {*} fromModel
     */
    fromStateJSON(obj, fromModel) {
      let r;

      if (fromModel.type === "textarea" || fromModel.type === "choices") {
        self.completion.names.get(obj.from_name).fromStateJSON(obj);
        return;
      }

      const tree = {
        pid: obj.id,
        start: obj.value.start,
        end: obj.value.end,
        text: obj.value.text,
        normalization: obj.normalization,
      };

      if (obj.from_name === obj.to_name) {
        r = self._addRegion(tree);
      } else {
        const region = self.findRegion(obj.value.start, obj.value.end);
        const m = restoreNewsnapshot(fromModel);

        // update state
        m.fromStateJSON(obj);

        if (!region) {
          tree.states = [m];
          r = self._addRegion(tree);
        } else {
          region.states.push(m);
        }
      }

      return r;
    },
  }));

const TextModel = types.compose(
  "TextModel",
  TagAttrs,
  Model,
);

class HtxTextView extends Component {
  renderRegion(letterGroup, range, textCharIndex, onMouseOverHighlightedWord) {
    return (
      <HtxTextRegion
        key={range.id}
        store={this.props.store}
        item={this.props.item}
        letterGroup={letterGroup}
        range={range}
        selected={range.selected}
        textCharIndex={textCharIndex}
        onMouseOverHighlightedWord={onMouseOverHighlightedWord}
      />
    );
  }

  render() {
    const self = this;

    const { item } = this.props;
    const style = {};
    if (item.hidden === "true") style["display"] = "none";

    return (
      <div style={style}>
        <TextHighlight
          id={item.id}
          key={item.id}
          text={item._value}
          enabled={item.selectionenabled}
          ranges={item.regions}
          adjustSelection={item.adjustselection}
          rangeRenderer={self.renderRegion.bind(this)}
          onTextHighlighted={range => {
            item.addRegion(range);
          }}
        />
      </div>
    );
  }
}

const HtxText = inject("store")(observer(HtxTextView));

Registry.addTag("text", TextModel, HtxText);

export { TextModel, HtxText };
