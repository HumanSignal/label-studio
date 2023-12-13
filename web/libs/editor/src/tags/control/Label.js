import { inject, observer } from 'mobx-react';
import { getType, types } from 'mobx-state-tree';
import ColorScheme from 'pleasejs';
import React from 'react';

import { Tooltip } from '../../common/Tooltip/Tooltip';
import InfoModal from '../../components/Infomodal/Infomodal';
import { Label } from '../../components/Label/Label';
import Constants from '../../core/Constants';
import { customTypes } from '../../core/CustomTypes';
import { guidGenerator } from '../../core/Helpers';
import Registry from '../../core/Registry';
import Types from '../../core/Types';
import { AnnotationMixin } from '../../mixins/AnnotationMixin';
import ProcessAttrsMixin from '../../mixins/ProcessAttrs';
import { TagParentMixin } from '../../mixins/TagParentMixin';
import ToolsManager from '../../tools/Manager';
import Utils from '../../utils';
import { parseValue } from '../../utils/data';
import { FF_DEV_2128, isFF } from '../../utils/feature-flags';

/**
 * The `Label` tag represents a single label. Use with the `Labels` tag, including `BrushLabels`, `EllipseLabels`, `HyperTextLabels`, `KeyPointLabels`, and other `Labels` tags to specify the value of a specific label.
 *
 * @example
 * <!--Basic named entity recognition labeling configuration for text-->
 * <View>
 *   <Labels name="type" toName="txt-1">
 *     <Label alias="B" value="Brand" />
 *     <Label alias="P" value="Product" />
 *   </Labels>
 *   <Text name="txt-1" value="$text" />
 * </View>
 * @name Label
 * @meta_title Label Tag for Single Label Tags
 * @meta_description Customize Label Studio with the Label tag to assign a single label to regions in a task for machine learning and data science projects.
 * @param {string} value                    - Value of the label
 * @param {boolean} [selected=false]        - Whether to preselect this label
 * @param {number} [maxUsages]              - Maximum number of times this label can be used per task
 * @param {string} [hint]                   - Hint for label on hover
 * @param {string} [hotkey]                 - Hotkey to use for the label. Automatically generated if not specified
 * @param {string} [alias]                  - Label alias
 * @param {boolean} [showAlias=false]       - Whether to show alias inside label text
 * @param {string} [aliasStyle=opacity:0.6] - CSS style for the alias
 * @param {string} [size=medium]            - Size of text in the label
 * @param {string} [background=#36B37E]     - Background color of an active label in hexadecimal
 * @param {string} [selectedColor=#ffffff]  - Color of text in an active label in hexadecimal
 * @param {symbol|word} [granularity]       - Set control based on symbol or word selection (only for Text)
 * @param {string} [html]                   - HTML code is used to display label button instead of raw text provided by `value` (should be properly escaped)
 */
const TagAttrs = types.model({
  value: types.maybeNull(types.string),
  selected: types.optional(types.boolean, false),
  maxusages: types.maybeNull(types.string),
  alias: types.maybeNull(types.string),
  hint: types.maybeNull(types.string),
  hotkey: types.maybeNull(types.string),
  showalias: types.optional(types.boolean, false),
  aliasstyle: types.optional(types.string, 'opacity: 0.6'),
  size: types.optional(types.string, 'medium'),
  background: types.optional(customTypes.color, Constants.LABEL_BACKGROUND),
  selectedcolor: types.optional(customTypes.color, '#ffffff'),
  granularity: types.maybeNull(types.enumeration(['symbol', 'word', 'sentence', 'paragraph'])),
  groupcancontain: types.maybeNull(types.string),
  // childrencheck: types.optional(types.enumeration(["any", "all"]), "any")
  ...(isFF(FF_DEV_2128) ? { html: types.maybeNull(types.string) } : {}),
});

const Model = types.model({
  id: types.optional(types.identifier, guidGenerator),
  type: 'label',
  visible: types.optional(types.boolean, true),
  _value: types.optional(types.string, ''),
  parentTypes: Types.tagsTypes([
    'Labels',
    'CubeLabels',
    'EllipseLabels',
    'RectangleLabels',
    'PolygonLabels',
    'KeyPointLabels',
    'BrushLabels',
    'HyperTextLabels',
    'TimeSeriesLabels',
    'ParagraphLabels',
  ]),
}).volatile(self => {
  return {
    initiallySelected: self.selected,
    isEmpty: false,
  };
}).views(self => ({
  get maxUsages() {
    return Number(self.maxusages || self.parent?.maxusages);
  },

  usedAlready() {
    const regions = self.annotation.regionStore.regions;
    // count all the usages among all the regions
    const used = regions.reduce((s, r) => s + r.hasLabel(self.value), 0);

    return used;
  },

  canBeUsed(count = 1) {
    if (!self.maxUsages) return true;
    return self.usedAlready() + count <= self.maxUsages;
  },
})).actions(self => ({
  setEmpty() {
    self.isEmpty = true;
  },
  /**
   * Select label
   */
  toggleSelected() {
    let sameObjectSelectedRegions = [];

    // here we check if you click on label from labels group
    // connected to the region on the same object tag that is
    // right now highlighted, and if that region is readonly

    if (self.annotation.selectedDrawingRegions.length > 0) {
      /*  here we are validating if we are drawing a new region or if region is already closed
          the way that new drawing region and a finished regions work is similar, but new drawing region
          doesn't visualy select the polygons when you are drawing.
       */
      sameObjectSelectedRegions = self.annotation.selectedDrawingRegions.filter(region => {
        return region.parent?.name === self.parent?.toname;
      });
    } else if (self.annotation.selectedRegions.length > 0) {
      sameObjectSelectedRegions = self.annotation.selectedRegions.filter(region => {
        return region.parent?.name === self.parent?.toname;
      });
    }


    const affectedRegions = sameObjectSelectedRegions.filter(region => {
      return !region.isReadOnly();
    });

    // one more check if that label can be selected
    if (self.annotation.isReadOnly()) return;

    if (sameObjectSelectedRegions.length > 0 && affectedRegions.length === 0) return;

    // don't select if it can not be used
    if (!!affectedRegions.length && !self.selected && !self.canBeUsed(affectedRegions.filter(region => region.results).length)) {
      InfoModal.warning(`You can't use ${self.value} more than ${self.maxUsages} time(s)`);
      return;
    }

    const labels = self.parent;

    // check if there is a region selected and if it is and user
    // is changing the label we need to make sure that region is
    // not going to end up without labels at all
    const applicableRegions = affectedRegions.filter(region => {
      // if that's the only selected label, the only labelset assigned to region,
      // and we are trying to unselect it, then don't allow that
      // (except for rare labelsets that allow empty labels)
      if (
        labels.selectedLabels.length === 1 &&
        self.selected &&
        region.labelings.length === 1 &&
        (!labels?.allowempty || self.isEmpty)
      )
        return false;

      // @todo rewrite this check and add more named vars
      // @todo select only related specific labels
      // @todo unselect any label, but only if that won't leave region without specific labels!
      // @todo but check for regions created by tools
      // @todo lot of tests!
      if (self.selected) return true; // we are unselecting a label which is always ok
      if (labels.type === 'labels') return true; // universal labels are fine to select
      if (labels.type.includes(region.type.replace(/region$/, ''))) return true; // region type is in label type
      if (labels.type.includes(region.results[0].type)) return true; // any result type of the region is in label type
      
      return false;
    });

    if (sameObjectSelectedRegions.length > 0 && applicableRegions.length === 0) return;

    // if we are going to select label and it would be the first in this labels group
    if (!labels.selectedLabels.length && !self.selected) {
      // unselect labels from other groups of labels connected to this obj

      self.annotation.toNames.get(labels.toname).
        filter(tag => tag.type && tag.type.endsWith('labels') && tag.name !== labels.name);

      // unselect other tools if they exist and selected
      const manager = ToolsManager.getInstance({ name: self.parent.toname });
      const tool = Object.values(self.parent?.tools || {})[0];

      const selectedTool = manager.findSelectedTool();
      const sameType = (tool && selectedTool) ? getType(selectedTool).name === getType(tool).name : false;
      const sameLabel = selectedTool ? tool?.control?.name === selectedTool?.control?.name : false;
      const isNotSameTool = selectedTool && (!sameType || !sameLabel);

      if (tool && (isNotSameTool || !selectedTool)) {
        manager.selectTool(tool, true);
      }
    }

    if (self.isEmpty) {
      const selected = self.selected;

      labels.unselectAll();
      self.setSelected(!selected);
    } else {
      /**
       * Multiple
       */
      if (!labels.shouldBeUnselected) {
        self.setSelected(!self.selected);
      }

      /**
       * Single
       */
      if (labels.shouldBeUnselected) {
        /**
         * Current not selected
         */
        if (!self.selected) {
          labels.unselectAll();
          self.setSelected(!self.selected);
        } else {
          labels.unselectAll();
        }
      }
    }

    if (labels.allowempty && !self.isEmpty) {
      if (applicableRegions.length) {
        labels.findLabel().setSelected(!labels.selectedValues()?.length);
      } else {
        if (self.selected) {
          labels.findLabel().setSelected(false);
        }
      }
    }

    applicableRegions.forEach(region => {
      if (region) {
        region.setValue(self.parent);
        region.notifyDrawingFinished();
        // hack to trigger RichText re-render the region
        region.updateSpans?.();
      }
    });
  },

  setVisible(val) {
    self.visible = val;
  },

  /**
   *
   * @param {boolean} value
   */
  setSelected(value) {
    self.selected = value;
  },

  onHotKey() {
    return self.onLabelInteract();
  },

  onClick() {
    self.onLabelInteract();
    return false;
  },

  onLabelInteract() {
    return self.toggleSelected();
  },

  _updateBackgroundColor(val) {
    if (self.background === Constants.LABEL_BACKGROUND) self.background = ColorScheme.make_color({ seed: val })[0];
  },

  afterCreate() {
    self._updateBackgroundColor(self._value || self.value);
  },

  updateValue(store) {
    self._value = parseValue(self.value, store.task.dataObj) || Constants.EMPTY_LABEL;
  },
}));

const LabelModel = types.compose('LabelModel', TagParentMixin, TagAttrs, ProcessAttrsMixin, Model, AnnotationMixin);

const HtxLabelView = inject('store')(
  observer(({ item, store }) => {
    const hotkey = (store.settings.enableTooltips || store.settings.enableLabelTooltips) && store.settings.enableHotkeys && item.hotkey;

    const label = (
      <Label
        color={item.background}
        margins
        empty={item.isEmpty}
        hotkey={hotkey}
        hidden={!item.visible}
        selected={item.selected}
        onClick={item.onClick}
      >
        {item.html ? <div title={item._value} dangerouslySetInnerHTML={{ __html: item.html }}/> : item._value }
        {item.showalias === true && item.alias && (
          <span style={Utils.styleToProp(item.aliasstyle)}>&nbsp;{item.alias}</span>
        )}
      </Label>
    );

    return item.hint
      ? <Tooltip title={item.hint}>{label}</Tooltip>
      : label;
  }),
);

Registry.addTag('label', LabelModel, HtxLabelView);

export { HtxLabelView, LabelModel };
