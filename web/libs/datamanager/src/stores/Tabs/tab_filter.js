import { flow, getParent, getRoot, types } from "mobx-state-tree";
import * as CellViews from "../../components/CellViews";
import { normalizeCellAlias } from "../../components/CellViews";
import * as Filters from "../../components/Filters/types";
import { allowedFilterOperations } from "../../components/Filters/types/Utility";
import { debounce } from "@humansignal/core/lib/utils/debounce";
import { isBlank, isDefined } from "../../utils/utils";
import { FilterValueRange, FilterValueType, TabFilterType } from "./tab_filter_type";
import { resolveFilterTransition } from "./filter_snapshot_utils";

const operatorNames = Array.from(new Set([].concat(...Object.values(Filters).map((f) => f.map((op) => op.key)))));

const Operators = types.enumeration(operatorNames);

const getOperatorDefaultValue = (operator) => {
  if (!operatorNames.includes(operator)) {
    return null;
  }

  return operator === "empty" ? false : null;
};

export const TabFilter = types
  .model("TabFilter", {
    filter: types.reference(TabFilterType),
    operator: types.maybeNull(Operators),
    value: types.maybeNull(FilterValueType),

    child_filter: types.maybeNull(types.late(() => TabFilter)),
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
      // For child filters, we need to traverse up to find the tab
      let current = self;
      let parent = null;

      try {
        while (current) {
          parent = getParent(current);
          if (parent?.filters && Array.isArray(parent.filters)) {
            return parent;
          }
          current = parent;
        }
      } catch {
        return getParent(getParent(self));
      }

      return null;
    },

    get component() {
      const operationsList = Filters[self.filter.currentType] ?? Filters.String;

      return allowedFilterOperations(operationsList, getRoot(self)?.SDK?.type);
    },

    get componentValueType() {
      return self.component?.find(({ key }) => key === self.operator)?.valueType;
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
      }
      if (FilterValueRange.is(value)) {
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

      return CellViews[col.type] ?? CellViews[normalizeCellAlias(col.alias)];
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

      // If this filter's column has child_filter metadata and no child filter exists, create it
      // This ensures child filters are automatically recreated after navigation
      if (!self.child_filter && self.filter?.field?.child_filter) {
        self.view?.applyChildFilter(self);
      }
    },

    /**
     * Switch this filter to a different column (non-recent path).
     * Preserves operator when compatible. Preserves value only when the type
     * is unchanged AND the new column has no schema (free-form input).
     * Schema-bound columns (List, etc.) have column-specific dropdown values
     * that must not leak across columns.
     * @see resolveFilterTransition for the full decision matrix
     */
    setFilter(value, save = true) {
      if (!isDefined(value)) return;

      self.view.clearChildFilter(self);

      const prevOperator = self.operator;
      const prevValue = self.value;
      const prevType = self.filter.currentType;

      self.filter = value;

      self.view.applyChildFilter(self);
      self.markUnsaved();

      const result = resolveFilterTransition({
        prevType,
        prevOperator,
        prevValue,
        newType: self.filter.currentType,
        newOperators: self.component,
        newSchema: self.filter.schema,
      });

      self.operator = result.operator;
      if (result.valueReset) {
        self.setDefaultValue();
      } else {
        self.value = result.value;
      }

      if (save) self.saved();
    },

    setFilterDelayed(value) {
      self.setFilter(value, false);
      self.saveDelayed();
    },

    /**
     * Restore a filter from a "Recent" selection, applying the stored column + operator + value.
     * Unlike setFilter(), this does NOT try to carry over the previous filter's state —
     * it directly applies the saved state from localStorage.
     * Falls back to defaults if the stored operator is no longer valid for the column type
     * (e.g. column type was changed in the labeling config since the entry was saved).
     */
    setFilterFromRecent(filterTypeId, operator, value) {
      if (!isDefined(filterTypeId)) return;

      self.view.clearChildFilter(self);
      self.filter = filterTypeId;
      self.view.applyChildFilter(self);
      self.markUnsaved();

      const newOperators = self.component;

      if (operator && newOperators.some((op) => op.key === operator)) {
        self.operator = operator;
      } else {
        self.operator = newOperators[0].key;
      }

      if (value !== undefined && value !== null) {
        self.setValue(value);
      } else {
        self.setDefaultValue();
      }

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

    save: flow(function* (force = false) {
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
      self.setValue(getOperatorDefaultValue(self.operator) ?? self.filter.defaultValue);
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
  }))
  .preProcessSnapshot((sn) => {
    if (!sn) return sn;
    return { ...sn, value: sn.value ?? null };
  });
