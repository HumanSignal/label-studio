import { types } from 'mobx-state-tree';

export const EditableRegion = types
  .model('EditableRegion')
  .volatile(() => ({
    editorEnabled: true,
    /**
     * Adding properties to the editableFields array on the
     * target model will make them editable in the details panel.
     */
    editableFields: [
      // { property: "x", label: "X" },
    ],
  }))
  .views((self) => ({
    getProperty(name) {
      return self[name];
    },

    isPropertyEditable(name) {
      return self.editableFields.some(f => f.property === name);
    },

    get hasEditableFields() {
      return self.editableFields.length > 0;
    },
  }))
  .actions((self) => ({
    setProperty(propName, value) {
      if (self.isPropertyEditable(propName)) {
        self[propName] = value;
      } else {
        throw new Error(`Property ${propName} of model ${self.type} is not editable`);
      }
    },
  }));
