import { types } from 'mobx-state-tree';
import { FF_LSDV_4583, isFF } from '../../utils/feature-flags';

/**
 * This is a mixin for a control-tag that is a base of creating classification-like tags.
 * A classification tag is a tag that can be applied to the object tag and does not create a region related to the object-tag nature
 * @see PerRegionMixin which allows to apply a created result to a region related to an object-tag nature
 * @see PerItemMixin which allows to apply a created result to just one object-item provide by object-tag (@see MultiItemsMixin)
 * */
const ClassificationBase = types.model('ClassificationBase', {
  isClassificationTag: true,
}).extend(self => {
  /* Validation */
  if (self.isControlTag !== true) {
    throw new Error('The ClassificationBase mixin should be used only for ControlTags');
  }

  const REQUIRED_PROPERTIES = ['toname'];
  const notDefinedProperties = REQUIRED_PROPERTIES.filter(name => !self.$treenode.type.propertyNames.includes(name));

  for (const notDefinedProperty of notDefinedProperties) {
    throw new Error(`The property "${notDefinedProperty}" should be defined for ClassificationBase mixin model needs`);
  }
  return {};
})
  .views(self => {
    return {
      selectedValues() {
        throw new Error('ClassificationBase mixin model needs to implement selectedValues method in views');
      },

      get result() {
        if (self.perregion) {
          return self._perRegionResult;
        }
        if (self.peritem) {
          return self._perItemResult;
        }
        return self.annotation.results.find(r => r.from_name === self);
      },
    };
  }).actions(self => {
    return {
      /**
       * Validates the input based on certain conditions.
       *
       * Generally, this method does not need to be overridden. And you need to override the validateValue method instead.
       * However, there are exceptions. For example, RequiredMixin, Choices, and
       * Taxonomy have their own additional logic, for which a broader context is needed.
       * In this case, the parent method call is added at the beginning or end
       * of the method to maintain all functionality in a predictable manner.
       *
       * @returns {boolean}
       */
      validate() {
        if (self.perregion) {
          return self._validatePerRegion();
        } else if (self.peritem && isFF(FF_LSDV_4583)) {
          return self._validatePerItem();
        } else {
          return self._validatePerObject();
        }
      },
      /**
       * Validates the value.
       *
       * Override to add your custom validation logic specific for the tag.
       * Per-item, per-region and per-object validation will be applied automatically.
       *
       * @example
       * SomeModel.actions(self => {
       *     const Super = { validateValue: self.validateValue };
       *
       *     return {
       *       validateValue(value) {
       *         if (!Super.validateValue(value)) return false;
       *         // your validation logic
       *       }
       *       // other actions
       *     }
       * });
       *
       * @param {*} value - The value to be validated.
       * @returns {boolean}
       *
       */
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      validateValue(value) {
        return true;
      },
      /**
       * Validates all values related to the current classification per object.
       *
       * - This method should not be overridden.
       * - It is used only in validate method of the ClassificationBase mixin.
       *
       * @returns {boolean}
       * @private
       */
      _validatePerObject() {
        return self.validateValue(self.selectedValues());
      },
      createPerObjectResult(areaValues = {}) {
        self.annotation.createResult(
          areaValues,
          { [self.valueType]: self.selectedValues() },
          self,
          self.toname,
        );
      },

      // update result in the store with current set value
      updateResult() {
        if (self.result) {
          self.result.area.setValue(self);
        } else {
          if (self.perregion) {
            self.createPerRegionResult?.();
          } else if (self.peritem) {
            self.createPerItemResult();
          } else {
            self.createPerObjectResult();
          }
        }
      },
    };
  });

export default ClassificationBase;
