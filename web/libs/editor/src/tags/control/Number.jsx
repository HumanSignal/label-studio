import React from 'react';
import { inject, observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import InfoModal from '../../components/Infomodal/Infomodal';
import { guidGenerator } from '../../core/Helpers';
import Registry from '../../core/Registry';
import { AnnotationMixin } from '../../mixins/AnnotationMixin';
import PerRegionMixin from '../../mixins/PerRegion';
import RequiredMixin from '../../mixins/Required';
import { isDefined } from '../../utils/utilities';
import ControlBase from './Base';
import { ReadOnlyControlMixin } from '../../mixins/ReadOnlyMixin';
import ClassificationBase from './ClassificationBase';
import PerItemMixin from '../../mixins/PerItem';
import { FF_LSDV_4583, isFF } from '../../utils/feature-flags';

/**
 * The Number tag supports numeric classification. Use to classify tasks using numbers.
 *
 * Use with the following data types: audio, image, HTML, paragraphs, text, time series, video
 *
 * [^FF_LSDV_4583]: `fflag_feat_front_lsdv_4583_multi_image_segmentation_short` should be enabled for `perItem` functionality
 *
 * @example
 * <!--Basic labeling configuration for numeric classification of text -->
 * <View>
 *   <Text name="txt" value="$text" />
 *   <Number name="number" toName="txt" max="10" />
 * </View>
 *
 * @name Number
 * @meta_title Number Tag to Numerically Classify
 * @meta_description Customize Label Studio with the Number tag to numerically classify tasks in your machine learning and data science projects.
 * @param {string} name                       - Name of the element
 * @param {string} toName                     - Name of the element that you want to label
 * @param {number} [min]                      - Minimum number value
 * @param {number} [max]                      - Maximum number value
 * @param {number} [step=1]                   - Step for value increment/decrement
 * @param {number} [defaultValue]             - Default number value; will be added automatically to result for required fields
 * @param {string} [hotkey]                   - Hotkey for increasing number value
 * @param {boolean} [required=false]          - Whether number is required or not
 * @param {string} [requiredMessage]          - Message to show if validation fails
 * @param {boolean} [perRegion]               - Use this tag to classify specific regions instead of the whole object
 * @param {boolean} [perItem]                 - Use this tag to classify specific items inside the object instead of the whole object[^FF_LSDV_4583]
 * @param {boolean} [slider=false]            - Use slider look instead of input; use min and max to add your constraints
 */
const TagAttrs = types.model({
  toname: types.maybeNull(types.string),

  min: types.maybeNull(types.string),
  max: types.maybeNull(types.string),
  step: types.maybeNull(types.string),
  defaultvalue: types.maybeNull(types.string),
  slider: types.optional(types.boolean, false),

  hotkey: types.maybeNull(types.string),
});

const Model = types
  .model({
    pid: types.optional(types.string, guidGenerator),
    type: 'number',
    number: types.maybeNull(types.number),
  })
  .views(self => ({
    selectedValues() {
      return self.number;
    },

    get holdsState() {
      return isDefined(self.number);
    },
  }))
  .actions(self => {
    const Super = { validateValue: self.validateValue };

    return {
      validateValue(value) {
        if (!Super.validateValue(value)) return false;
        if (!isDefined(value)) return true;

        const errors = [];

        if (isDefined(self.min) && value < self.min) {
          errors.push(`Value must be greater than or equal to ${self.min}`);
        }
        if (isDefined(self.max) && value > self.max) {
          errors.push(`Value must be less than or equal to ${self.max}`);
        }
        if (isDefined(self.step)) {
          const step = parseFloat(self.step);
          const basis = isDefined(self.min) ? +self.min : 0;
          const delta = (value - basis) % step;

          if (delta !== 0) {
            errors.push(`The two nearest valid values are ${value - delta} and ${value - delta + step}`);
          }
        }
        if (errors.length) {
          InfoModal.warning(`Number "${value}" is not valid: ${errors.join(', ')}.`);
          return false;
        }
        return true;
      },
      getSelectedString() {
        return self.number + ' star';
      },

      needsUpdate() {
        if (self.result) self.number = self.result.mainValue;
        else self.number = null;
      },

      beforeSend() {
        if (!isDefined(self.defaultvalue)) return;

        // let's fix only required perRegions
        if (self.perregion && self.required) {
          const object = self.toNameTag;

          for (const reg of object?.allRegs ?? []) {
          // add result with default value to every region of related object without number yet
            if (!reg.results.some(r => r.from_name === self)) {
              reg.results.push({
                area: reg,
                from_name: self,
                to_name: object,
                type: self.resultType,
                value: {
                  [self.valueType]: +self.defaultvalue,
                },
              });
            }
          }
        } else {
        // add defaultValue to results for top-level controls
          if (!isDefined(self.number)) self.setNumber(+self.defaultvalue);
        }
      },

      unselectAll() {},

      setNumber(value) {
        self.number = value;
        self.updateResult();
      },

      onChange(e) {
        const value = +e.target.value;

        if (!isNaN(value)) {
          self.setNumber(value);
          // without this line we can have `7` in model field while it's displayed as `007`.
          // at least it is bad for testing cases
          e.target.value = isDefined(self.number) ? self.number : '';
        }
      },

      updateFromResult() {
        this.needsUpdate();
      },

      requiredModal() {
        InfoModal.warning(self.requiredmessage || `Number "${self.name}" is required.`);
      },

      increaseValue() {
        if (self.number >= Number(self.max)) {
          self.setNumber(0);
        } else {
          if (self.number > 0) {
            self.setNumber(self.number + 1);
          } else {
            self.setNumber(1);
          }
        }
      },

      onHotKey() {
        return self.increaseValue();
      },
    };
  });

const NumberModel = types.compose('NumberModel',
  ControlBase,
  ClassificationBase,
  RequiredMixin,
  ReadOnlyControlMixin,
  PerRegionMixin,
  ...(isFF(FF_LSDV_4583) ? [PerItemMixin] : []),
  AnnotationMixin,
  TagAttrs,
  Model,
);

const HtxNumber = inject('store')(
  observer(({ item, store }) => {
    const visibleStyle = item.perRegionVisible() ? { display: 'flex', alignItems: 'center' } : { display: 'none' };
    const sliderStyle = item.slider ? { padding: '9px 0px', border: 0 } : {};
    const disabled = item.isReadOnly();

    return (
      <div className='lsf-number' style={visibleStyle}>
        <input
          disabled={disabled}
          style={sliderStyle}
          type={item.slider ? 'range' : 'number'}
          name={item.name}
          value={item.number ?? item.defaultvalue ?? ''}
          step={item.step ?? 1}
          min={isDefined(item.min) ? Number(item.min) : undefined}
          max={isDefined(item.max) ? Number(item.max) : undefined}
          onChange={disabled ? undefined : item.onChange}
        />
        {item.slider && <output style={{ marginLeft: '5px' }}>{item.number ?? item.defaultvalue ?? ''}</output>}
        {store.settings.enableTooltips && store.settings.enableHotkeys && item.hotkey && (
          <sup style={{ fontSize: '9px' }}>[{item.hotkey}]</sup>
        )}
      </div>
    );
  }),
);

Registry.addTag('number', NumberModel, HtxNumber);

export { HtxNumber, NumberModel };
