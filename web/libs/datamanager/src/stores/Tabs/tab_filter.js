import { flow, getParent, getRoot, types } from "mobx-state-tree";
import { toStudlyCaps } from "strman";
import * as Filters from "../../components/Filters/types";
import * as CellViews from "../../components/CellViews";
import { allowedFilterOperations } from "../../components/Filters/types/Utility";
import { debounce } from "../../utils/debounce";
import { isBlank, isDefined } from "../../utils/utils";
import {
  FilterValueRange,
  FilterValueType,
  TabFilterType
} from "./tab_filter_type";

const operatorNames = Array.from(
  new Set(
    [].concat(...Object.values(Filters).map((f) => f.map((op) => op.key))),
  ),
);

const Operators = types.enumeration(operatorNames);

const getOperatorDefaultValue = (operator) => {
  if (operatorNames.includes(operator)) {
    switch (operator) {
      default:
        return null;

      case "empty":
        return false;
    }
  }

  return null;
};

export const TabFilter = types
  .model("TabFilter", {
    filter: types.reference(TabFilterType),
    operator: types.maybeNull(Operators),
    value: types.maybeNull(FilterValueType),
  })
  .views((self) => ({
    get field() {
      return self.filter.field;
    },

    get schema() {
      return self.filter.schema;
    },

    /** @returns {import("./tab").View} */
    get view() {
      return getParent(getParent(self));
    },

    get component() {
      const operationsList = Filters[self.filter.currentType] ?? Filters.String;

      return allowedFilterOperations(operationsList, getRoot(self)?.SDK?.type);
    },

    get componentValueType() {
      return self.component?.find(({ key }) => key === self.operator)
        ?.valueType;
    },

    get target() {
      return self.filter.field.target;
    },

    get type() {
      return self.field.currentType;
    },

    get isValidFilter() {
      const { currentValue: value } = self;

      if (!isDefined(value) || isBlank(value)) {
        return false;
      } else if (FilterValueRange.is(value)) {
        return isDefined(value.min) && isDefined(value.max);
      }

      return true;
    },

    get currentValue() {
      let resultValue;

      if (self.filter.schema === null) {
        resultValue = self.value;
      } else {
        resultValue = self.value?.value ?? self.value ?? null;
      }

      return resultValue;
    },

    get cellView() {
      const col = self.filter.field;

      return CellViews[col.type] ?? CellViews[toStudlyCaps(col.alias)];
    },
  }))
  .volatile(() => ({
    wasValid: false,
    saved: false,
    saving: false,
  }))
  .actions((self) => ({
    afterAttach() {
      if (self.value === null) {
        self.setDefaultValue();
      }
      if (self.operator === null) {
        self.setOperator(self.component[0].key);
      }
    },

    setFilter(value, save = true) {
      if (!isDefined(value)) return;

      const previousFilterType = self.filter.currentType;
      const previousFilter = self.filter.id;

      self.filter = value;

      const typeChanged = previousFilterType !== self.filter.currentType;
      const filterChanged = previousFilter !== self.filter.id;

      if (typeChanged || filterChanged) {
        self.markUnsaved();
      }

      if (typeChanged) {
        self.setDefaultValue();
        self.setOperator(self.component[0].key);
      }

      if (save) self.saved();
    },

    setFilterDelayed(value) {
      self.setFilter(value, false);
      self.saveDelayed();
    },

    setOperator(operator) {
      const previousValueType = self.componentValueType;

      if (self.operator !== operator) {
        self.markUnsaved();
        self.operator = operator;
      }

      if (previousValueType !== self.componentValueType) {
        self.setDefaultValue();
      }

      self.save();
    },

    setValue(newValue) {
      self.value = newValue;
    },

    delete() {
      self.view.deleteFilter(self);
    },

    save: flow(function * (force = false) {
      const isValid = self.isValidFilter;

      if (force !== true) {
        if (self.saved === true) return;
        if (isValid === false) return;
        if (self.wasValid === false && isValid === false) return;
      }

      if (self.saving) return;

      self.saving = true;
      self.wasValid = isValid;
      self.markSaved();
      getRoot(self)?.unsetSelection();
      self.view?.clearSelection();
      yield self.view?.save({ interaction: "filter" });
      self.saving = false;
    }),

    setDefaultValue() {
      self.setValue(
        getOperatorDefaultValue(self.operator) ?? self.filter.defaultValue,
      );
    },

    setValueDelayed(value) {
      self.setValue(value);
      setTimeout(self.saveDelayed);
    },

    markSaved() {
      self.saved = true;
    },

    markUnsaved() {
      self.saved = false;
    },

    saveDelayed: debounce(() => {
      self.save();
    }, 300),
  })).preProcessSnapshot((sn) => {
    return { ...sn, value: sn.value ?? null };
  });
