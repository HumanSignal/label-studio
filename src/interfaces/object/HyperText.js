import React, { Component } from "react";
import { observer, inject } from "mobx-react";
import { types, getType, getRoot, getParentOfType } from "mobx-state-tree";

import { cloneNode } from "../../core/Helpers";
import Registry from "../../core/Registry";
import { guidGenerator, restoreNewsnapshot } from "../../core/Helpers";

import * as xpath from "xpath-range";

import RegionsMixin from "../mixins/Regions";

import { runTemplate } from "../../core/Template";

import InfoModal from "../../components/Infomodal/Infomodal";
import { LabelsModel } from "../control/Labels";

import { highlightRange, splitBoundaries } from "../../utils/html";

import { HyperTextRegionModel } from "./HyperTextRegion";
import Utils from "../../utils";

/**
 * HyperText tag shows an HyperText markup that can be labeled
 * @example
 * <HyperText name="text-1" value="$text"></HyperText>
 * @name HyperText
 * @param {string} name of the element
 * @param {string} value of the element
 * @param {string} [encoding=string|base64] provide the html as an escaped string or base64 encoded string
 */
const TagAttrs = types.model("HyperTextModel", {
  name: types.maybeNull(types.string),
  // text: types.maybeNull(types.optional(types.string, "Please set \"value\" attribute of Text")),
  value: types.maybeNull(types.string),

  /**
   * If we allow selecting parts of words of we select whole word only
   */
  adjustselection: types.optional(types.boolean, true),
  selectionenabled: types.optional(types.boolean, true),

  encoding: types.optional(types.string, "string"),
});

const Model = types
  .model("HyperTextModel", {
    id: types.optional(types.identifier, guidGenerator),
    type: "hypertext",
    regions: types.array(HyperTextRegionModel),
    _value: types.optional(types.string, ""),
    _update: types.optional(types.number, 1),
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
    needsUpdate() {
      self._update = self._update + 1;
    },

    findRegion(start, startOffset, end, endOffset) {
      const immutableRange = self.regions.find(r => {
        return r.start === start && r.end === end && r.startOffset === startOffset && r.endOffset === endOffset;
      });
      return immutableRange;
    },

    updateValue(store) {
      self._value = runTemplate(self.value, store.task.dataObj);
    },

    _addRange(p) {
      const r = HyperTextRegionModel.create({
        startOffset: p.startOffset,
        endOffset: p.endOffset,
        start: p.start,
        end: p.end,
        text: p.text,
        states: p.states,
      });

      r._range = p._range;

      self.regions.push(r);
      self.completion.addRegion(r);

      return r;
    },

    addRange(range) {
      const states = self.activeStates();
      if (states.length == 0) return;

      const clonedStates = states
        ? states.map(s => {
            return cloneNode(s);
          })
        : null;

      const r = self._addRange({ ...range, states: clonedStates });

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
      const { start, startOffset, end, endOffset, text } = obj.value;

      if (fromModel.type === "textarea" || fromModel.type === "choices") {
        self.completion.names.get(obj.from_name).fromStateJSON(obj);
        return;
      }

      const states = restoreNewsnapshot(fromModel);
      const tree = {
        pid: obj.id,
        startOffset: startOffset,
        endOffset: endOffset,
        start: start,
        end: end,
        text: text,
        normalization: obj.normalization,
        states: [states],
      };

      states.fromStateJSON(obj);

      self._addRange(tree);

      self.needsUpdate();
    },
  }));

const HyperTextModel = types.compose("HyperTextModel", RegionsMixin, TagAttrs, Model);

class HtxHyperTextView extends Component {
  render() {
    const self = this;
    const { item, store } = this.props;

    if (!item._value) return null;

    // if (! store.task.dataObj) return null;

    return <HtxHyperTextPieceView store={store} item={item} />;
  }
}

class HyperTextPieceView extends Component {
  constructor(props) {
    super(props);
    this.myRef = React.createRef();
  }

  captureDocumentSelection() {
    var i,
      len,
      ranges = [],
      rangesToIgnore = [],
      selection = window.getSelection();

    var self = this;

    if (selection.isCollapsed) {
      return [];
    }

    for (i = 0; i < selection.rangeCount; i++) {
      var r = selection.getRangeAt(i);

      try {
        var normedRange = xpath.fromRange(r, self.myRef.current);
        splitBoundaries(r);

        normedRange._range = r;
        normedRange.text = selection.toString();

        // If the new range falls fully outside our this.element, we should
        // add it back to the document but not return it from this method.
        if (normedRange === null) {
          rangesToIgnore.push(r);
        } else {
          ranges.push(normedRange);
        }
      } catch (err) {}
    }

    // BrowserRange#normalize() modifies the DOM structure and deselects the
    // underlying text as a result. So here we remove the selected ranges and
    // reapply the new ones.
    selection.removeAllRanges();

    return ranges;
  }

  onMouseUp(ev) {
    var selectedRanges = this.captureDocumentSelection();

    const states = this.props.item.activeStates();
    if (states.length === 0) return;

    if (selectedRanges.length === 0) {
      return;
    }

    const htxRange = this.props.item.addRange(selectedRanges[0]);

    let labelColor = htxRange.states.map(s => {
      return s.getSelectedColor();
    });

    if (labelColor.length !== 0) {
      labelColor = Utils.Colors.convertToRGBA(labelColor[0], 0.3);
    }

    const spans = highlightRange(
      htxRange,
      "htx-highlight",
      { backgroundColor: labelColor },
      htxRange.states.map(s => s.getSelectedNames()),
    );
    htxRange._spans = spans;
  }

  _handleUpdate() {
    const root = this.myRef.current;

    this.props.item.regions.forEach(function(r) {
      try {
        const range = xpath.toRange(r.start, r.startOffset, r.end, r.endOffset, root);

        splitBoundaries(range);

        r._range = range;

        let labelColor = r.states.map(s => {
          return s.getSelectedColor();
        });

        if (labelColor.length !== 0) {
          labelColor = Utils.Colors.convertToRGBA(labelColor[0], 0.3);
        }

        const spans = highlightRange(
          r,
          "htx-highlight",
          { backgroundColor: labelColor },
          r.states.map(s => s.getSelectedNames()),
        );
        r._spans = spans;
      } catch (err) {
        console.log(r);
      }
    });

    Array.from(this.myRef.current.getElementsByTagName("a")).forEach(a => {
      a.addEventListener("click", function(ev) {
        ev.preventDefault();
        return false;
      });
    });
  }

  componentDidUpdate() {
    this._handleUpdate();
  }

  componentDidMount() {
    this._handleUpdate();
  }

  render() {
    const self = this;
    const { item, store } = this.props;

    let val = runTemplate(item.value, store.task.dataObj);
    if (item.encoding == "base64") val = atob(val);

    return (
      <div
        ref={this.myRef}
        data-update={item._update}
        style={{ overflow: "auto" }}
        onMouseUp={this.onMouseUp.bind(this)}
        dangerouslySetInnerHTML={{ __html: val }}
      />
    );
  }
}

const HtxHyperText = inject("store")(observer(HtxHyperTextView));
const HtxHyperTextPieceView = inject("store")(observer(HyperTextPieceView));

Registry.addTag("hypertext", HyperTextModel, HtxHyperText);

export { HyperTextModel, HtxHyperText };
