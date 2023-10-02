import { types } from 'mobx-state-tree';

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
