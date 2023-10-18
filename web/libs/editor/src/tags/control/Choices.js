import React from 'react';
import { Form, Select } from 'antd';
import { observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import RequiredMixin from '../../mixins/Required';
import PerRegionMixin from '../../mixins/PerRegion';
import InfoModal from '../../components/Infomodal/Infomodal';
import Registry from '../../core/Registry';
import SelectedModelMixin from '../../mixins/SelectedModel';
import VisibilityMixin from '../../mixins/Visibility';
import Tree from '../../core/Tree';
import Types from '../../core/Types';
import { guidGenerator } from '../../core/Helpers';
import ControlBase from './Base';
import { AnnotationMixin } from '../../mixins/AnnotationMixin';
import { Block } from '../../utils/bem';
import './Choices/Choises.styl';

import './Choice';
import DynamicChildrenMixin from '../../mixins/DynamicChildrenMixin';
import { FF_DEV_2007, FF_DEV_2007_DEV_2008, FF_LSDV_4583, isFF } from '../../utils/feature-flags';
import { ReadOnlyControlMixin } from '../../mixins/ReadOnlyMixin';
import SelectedChoiceMixin from '../../mixins/SelectedChoiceMixin';
import { HintTooltip } from '../../components/Taxonomy/Taxonomy';
import ClassificationBase from './ClassificationBase';
import PerItemMixin from '../../mixins/PerItem';
import Infomodal from '../../components/Infomodal/Infomodal';

const { Option } = Select;

/**
 * The `Choices` tag is used to create a group of choices, with radio buttons or checkboxes. It can be used for single or multi-class classification. Also, it is used for advanced classification tasks where annotators can choose one or multiple answers.
 *
 * Choices can have dynamic value to load labels from task. This task data should contain a list of options to create underlying `<Choice>`s. All the parameters from options will be transferred to corresponding tags.
 *
 * The `Choices` tag can be used with any data types.
 *
 * [^FF_LSDV_4583]: `fflag_feat_front_lsdv_4583_multi_image_segmentation_short` should be enabled for `perItem` functionality.
 * [^FF_DEV_2007_DEV_2008]: `ff_dev_2007_dev_2008_dynamic_tag_children_250322_short` should be enabled to use dynamic options.
 * [^FF_DEV_2007]: `ff_dev_2007_rework_choices_280322_short` should be enabled to use `html` attribute
 *
 * @example
 * <!--Basic text classification labeling configuration-->
 * <View>
 *   <Choices name="gender" toName="txt-1" choice="single-radio">
 *     <Choice alias="M" value="Male" />
 *     <Choice alias="F" value="Female" />
 *     <Choice alias="NB" value="Nonbinary" />
 *     <Choice alias="X" value="Other" />
 *   </Choices>
 *   <Text name="txt-1" value="John went to see Mary" />
 * </View>
 *
 * @example <caption>This config with dynamic labels</caption>
 * <!--
 *   `Choice`s can be loaded dynamically from task data[^FF_DEV_2007_DEV_2008]. It should be an array of objects with attributes.
 *   `html` can be used to show enriched content[^FF_DEV_2007], it has higher priority than `value`, however `value` will be used in the exported result.
 * -->
 * <View>
 *   <Audio name="audio" value="$audio" />
 *   <Choices name="transcription" toName="audio" value="$variants" />
 * </View>
 * <!-- {
 *   "data": {
 *     "variants": [
 *       { "value": "Do or doughnut. There is no try.", "html": "<img src='https://labelstud.io/images/logo.png'>" },
 *       { "value": "Do or do not. There is no trial.", "html": "<h1>You can use hypertext here</h2>" },
 *       { "value": "Do or do not. There is no try." },
 *       { "value": "Duo do not. There is no try." }
 *     ]
 *   }
 * } -->
 * 
 * @example <caption>is equivalent to this config</caption>
 * <View>
 *   <Audio name="audio" value="$audio" />
 *   <Choices name="transcription" toName="audio" value="$variants">
 *     <Choice value="Do or doughnut. There is no try." />
 *     <Choice value="Do or do not. There is no trial." />
 *     <Choice value="Do or do not. There is no try." />
 *     <Choice value="Duo do not. There is no try." />
 *   </Choices>
 * </View>
 * @name Choices
 * @meta_title Choices Tag for Multiple Choice Labels
 * @meta_description Customize Label Studio with multiple choice labels for machine learning and data science projects.
 * @param {string} name                - Name of the group of choices
 * @param {string} toName              - Name of the data item that you want to label
 * @param {single|single-radio|multiple} [choice=single] - Single or multi-class classification
 * @param {boolean} [showInline=false] - Show choices in the same visual line
 * @param {boolean} [required=false]   - Validate whether a choice has been selected
 * @param {string} [requiredMessage]   - Show a message if validation fails
 * @param {region-selected|no-region-selected|choice-selected|choice-unselected} [visibleWhen] - Control visibility of the choices. Can also be used with `when*` attributes below to narrow down visibility
 * @param {string} [whenTagName]       - Use with visibleWhen. Narrow down visibility by name of the tag. For regions, use the name of the object tag, for choices, use the name of the choices tag
 * @param {string} [whenLabelValue]    - Use with visibleWhen="region-selected". Narrow down visibility by label value
 * @param {string} [whenChoiceValue]   - Use with visibleWhen ("choice-selected" or "choice-unselected") and whenTagName, both are required. Narrow down visibility by choice value
 * @param {boolean} [perRegion]        - Use this tag to select a choice for a specific region instead of the entire task
 * @param {boolean} [perItem]          - Use this tag to select a choice for a specific item inside the object instead of the whole object[^FF_LSDV_4583]
 * @param {string} [value]             - Task data field containing a list of dynamically loaded choices (see example below)[^FF_DEV_2007_DEV_2008]
 * @param {boolean} [allowNested]      - Allow to use `children` field in dynamic choices to nest them. Submitted result will contain array of arrays, every item is a list of values from topmost parent choice down to selected one.
 */
const TagAttrs = types.model({
  toname: types.maybeNull(types.string),

  showinline: types.maybeNull(types.boolean),

  choice: types.optional(types.enumeration(['single', 'single-radio', 'multiple']), 'single'),

  layout: types.optional(types.enumeration(['select', 'inline', 'vertical']), 'vertical'),

  ...(isFF(FF_DEV_2007_DEV_2008) ? { value: types.optional(types.string, '') } : {}),

  allownested: types.optional(types.boolean, false),
});

const Model = types
  .model({
    pid: types.optional(types.string, guidGenerator),

    visible: types.optional(types.boolean, true),

    type: 'choices',
    children: Types.unionArray(['choice', 'view', 'header', 'hypertext']),
  })
  .views(self => ({
    get shouldBeUnselected() {
      return self.choice === 'single' || self.choice === 'single-radio';
    },

    states() {
      return self.annotation.toNames.get(self.name);
    },

    get serializableValue() {
      const choices = self.selectedValues();

      if (choices && choices.length) return { choices };

      return null;
    },

    get preselectedValues() {
      return self.tiedChildren.filter(c => c.selected === true && !c.isSkipped).map(c => c.resultValue);
    },

    get selectedLabels() {
      return self.tiedChildren.filter(c => c.sel === true && !c.isSkipped);
    },

    selectedValues() {
      return self.selectedLabels.map(c => c.resultValue);
    },

    get defaultChildType() {
      return 'choice';
    },

    // perChoiceVisible() {
    //     if (! self.whenchoicevalue) return true;

    //     // this is a special check when choices are labeling other choices
    //     // may need to show
    //     if (self.whenchoicevalue) {
    //         const choicesTag = self.annotation.names.get(self.toname);
    //         const ch = choicesTag.findLabel(self.whenchoicevalue);

    //         if (ch && ch.selected)
    //             return true;
    //     }

    //     return false;
    // }
  }))
  .actions(self => ({
    afterCreate() {
      // TODO depricate showInline
      if (self.showinline === true) self.layout = 'inline';
      if (self.showinline === false) self.layout = 'vertical';
    },

    needsUpdate() {
      if (self.result) self.setResult(self.result.mainValue);
      else self.setResult([]);
    },

    requiredModal() {
      InfoModal.warning(self.requiredmessage || `Checkbox "${self.name}" is required.`);
    },

    // this is not labels, unselect affects result, so don't unselect on random reason
    unselectAll() {},

    updateFromResult(value) {
      self.setResult(Array.isArray(value) ? value : [value]);
    },

    // unselect only during choice toggle
    resetSelected() {
      self.selectedLabels.forEach(c => c.setSelected(false));
    },

    setResult(values) {
      self.tiedChildren.forEach(choice => {
        let isSelected = false;

        if (!choice.isSkipped) {
          isSelected = values?.some?.((value) => {
            if (Array.isArray(value) && Array.isArray(choice.resultValue)) {
              if (value.length !== choice.resultValue.length) return false;
              return value.every?.((val, idx) => val === choice.resultValue?.[idx]);
            } else {
              return value === choice.resultValue;
            }
          });
        }

        choice.setSelected(isSelected);
      });
    },
  })).actions(self => {
    const Super = {
      validate: self.validate,
    };

    return {
      validate() {
        if (!Super.validate() || (self.choice !== 'multiple' && self.checkResultLength() > 1)) return false;
      },

      checkResultLength() {
        const _resultFiltered = self.children.filter(c => c._sel);

        return _resultFiltered.length;
      },

      beforeSend() {
        if (self.choice !== 'multiple' && self.checkResultLength() > 1)
          Infomodal.warning(`The number of options selected (${self.checkResultLength()}) exceed the maximum allowed (1). To proceed, first unselect excess options for:\r\n • Choices (${self.name})`);
      },
    };
  });

const ChoicesModel = types.compose(
  'ChoicesModel',
  ControlBase,
  ClassificationBase,
  SelectedModelMixin.props({ _child: 'ChoiceModel' }),
  RequiredMixin,
  PerRegionMixin,
  ...(isFF(FF_LSDV_4583) ? [PerItemMixin] : []),
  ReadOnlyControlMixin,
  SelectedChoiceMixin,
  VisibilityMixin,
  ...(isFF(FF_DEV_2007_DEV_2008) ? [DynamicChildrenMixin] : []),
  AnnotationMixin,
  TagAttrs,
  Model,
);

const ChoicesSelectLayout = observer(({ item }) => {
  return (
    <Select
      style={{ width: '100%' }}
      value={item.selectedLabels.map(l => l._value)}
      mode={item.choice === 'multiple' ? 'multiple' : ''}
      disabled={item.isReadOnly()}
      onChange={function(val) {
        if (Array.isArray(val)) {
          item.resetSelected();
          val.forEach(v => item.findLabel(v).setSelected(true));
          item.updateResult();
        } else {
          const c = item.findLabel(val);

          if (c) {
            c.toggleSelected();
          }
        }
      }}
    >
      {item.tiedChildren.map(i => (
        <Option key={i._value} value={i._value}>
          <HintTooltip title={i.hint} wrapper="div">
            {i._value}
          </HintTooltip>
        </Option>
      ))}
    </Select>
  );
});

const HtxChoices = observer(({ item }) => {
  return (
    <Block name="choices" mod={{ hidden: !item.isVisible || !item.perRegionVisible(), layout: item.layout }}>
      {item.layout === 'select' ? (
        <ChoicesSelectLayout item={item} />
      ) : (
        !isFF(FF_DEV_2007)
          ? <Form layout={item.layout}>{Tree.renderChildren(item, item.annotation)}</Form>
          : Tree.renderChildren(item, item.annotation)
      )}
    </Block>
  );
});

Registry.addTag('choices', ChoicesModel, HtxChoices);

export { HtxChoices, ChoicesModel, TagAttrs };
