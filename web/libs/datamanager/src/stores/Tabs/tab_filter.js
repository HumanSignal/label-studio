import { flow, getParent, getRoot, isAlive, types } from "mobx-state-tree";
import * as CellViews from "../../components/CellViews";
import { normalizeCellAlias } from "../../components/CellViews";
import * as Filters from "../../components/Filters/types";
import { allowedFilterOperations } from "../../components/Filters/types/Utility";
import { debounce } from "@humansignal/core/lib/utils/debounce";
import { isBlank, isDefined } from "../../utils/utils";
import { FilterValueRange, FilterValueType, TabFilterType } from "./tab_filter_type";
import {
  resolveFilterTransition,
  resolveOperatorValueTransition,
  sanitizeIntegerUserListValue,
  fieldAliasFromFilterId,
  normalizeIntegerUserFilter,
} from "./filter_snapshot_utils";
import { guidGenerator } from "../../utils/random";

/**
 * BROS-1203 — operators that strictly require a JSON array on the wire.
 *
 * Note: this is intentionally NOT every `valueType: "list"` operator. TaskState's
 * `contains` / `not_contains` also declare `valueType: "list"`, but their value is
 * a single state string applied via `state__icontains=<value>` on the BE — coercing
 * to `[value]` would send an array where the BE expects a scalar, returning zero
 * rows for the canonical TC1792 scenario.
 *
 * Exported so callers (setValue coercion, isValidFilter empty-array guard, and the
 * recoverFilterSnapshot legacy-view healer) share the same scoping rule.
 */
export const LIST_MEMBERSHIP_OPERATORS = new Set(["in_list", "not_in_list"]);

export function isListMembershipOperator(operator) {
  return LIST_MEMBERSHIP_OPERATORS.has(operator);
}

/**
 * BROS-1203 — defensive snapshot recovery on TabFilter rehydration.
 *
 * Views persisted before the FilterSerializer rejected non-list values for the
 * `in_list` / `not_in_list` operators can carry scalar values. Loading such a
 * view as-is would then 400 every subsequent view-save (PATCH body includes the
 * full filter group, BE re-validates all items), trapping the user in an
 * unrecoverable loop. Coerce on load so the view can recover.
 *
 * Exported for unit testing — the live MST `preProcessSnapshot` hook delegates here.
 */
export function recoverFilterSnapshot(sn) {
  if (!sn) return sn;
  let value = sn.value ?? null;
  if (isListMembershipOperator(sn.operator) && value !== null && !Array.isArray(value)) {
    value = [value];
  }
  const fieldAlias = fieldAliasFromFilterId(sn.filter);
  const normalized = normalizeIntegerUserFilter({ fieldAlias, operator: sn.operator, value });
  const { operator } = normalized;
  value = normalized.value;
  return { ...sn, operator, value };
}

function normalizeChildFilterSnapshot(sn) {
  if (!sn) return sn;

  const hasPluralChildren = Object.hasOwn(sn, "child_filters");
  const hasLegacyChild = Object.hasOwn(sn, "child_filter");
  const childFilters = hasPluralChildren
    ? Array.isArray(sn.child_filters)
      ? sn.child_filters
      : []
    : sn.child_filter
      ? [sn.child_filter]
      : [];
  const snapshot = { ...sn };

  delete snapshot.child_filter;

  return {
    ...snapshot,
    child_filters: childFilters,
    apply_legacy_child_filter: !hasPluralChildren && !hasLegacyChild,
  };
}

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
    id: types.optional(types.identifier, guidGenerator),
    filter: types.reference(TabFilterType),
    operator: types.maybeNull(Operators),
    value: types.maybeNull(FilterValueType),

    child_filters: types.optional(types.array(types.late(() => TabFilter)), []),
    apply_legacy_child_filter: types.optional(types.boolean, false),
  })
  .views((self) => ({
    get field() {
      return self.filter.field;
    },

    get child_filter() {
      return self.child_filters[0] ?? null;
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
      // BROS-1203: for `in_list`/`not_in_list` specifically, an empty list is
      // "syntactically valid" (the BE accepts []) but doesn't represent a useful
      // filter — treat it as not-yet-valid so we don't PATCH the view on every
      // keystroke while the user is still composing. Scoped via the shared
      // `isListMembershipOperator` so other `valueType: "list"` filters (e.g.
      // TaskState `contains`) aren't wrongly invalidated.
      if (isListMembershipOperator(self.operator) && Array.isArray(value) && value.length === 0) {
        return false;
      }
      if (self.schema?.multiple && Array.isArray(value) && value.length === 0) {
        return false;
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

      // Legacy column metadata still auto-materializes its one compatibility child.
      if (self.apply_legacy_child_filter && self.child_filters.length === 0 && self.filter?.field?.child_filter) {
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

      self.view.clearChildFilters(self);

      const prevOperator = self.operator;
      const prevValue = self.value;
      const prevType = self.filter.currentType;
      const prevColumnId = self.filter.id;

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
        prevColumnId,
        newColumnId: self.filter.id,
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

      self.view.clearChildFilters(self);
      self.filter = filterTypeId;
      self.view.applyChildFilter(self);
      self.markUnsaved();

      const newOperators = self.component;
      const fieldAlias = self.filter?.field?.alias;
      const normalized = normalizeIntegerUserFilter({ fieldAlias, operator, value });

      if (normalized.operator && newOperators.some((op) => op.key === normalized.operator)) {
        self.operator = normalized.operator;
      } else {
        self.operator = newOperators[0].key;
      }

      const sanitizedValue =
        normalized.value !== undefined && normalized.value !== null
          ? sanitizeIntegerUserListValue(normalized.value, { fieldAlias, operator: self.operator })
          : normalized.value;

      if (sanitizedValue !== undefined && sanitizedValue !== null) {
        self.setValue(sanitizedValue);
      } else {
        self.setDefaultValue();
      }

      self.saveDelayed();
    },

    setOperator(operator) {
      const previousOperator = self.operator;
      const previousValueType = self.componentValueType;
      const previousValue = self.value;

      if (self.operator !== operator) {
        self.markUnsaved();
        self.operator = operator;
      }

      const nextValueType = self.componentValueType;
      const transition = resolveOperatorValueTransition({
        previousOperator,
        nextOperator: operator,
        previousValueType,
        nextValueType,
        previousValue,
        isListMembershipOperator,
      });

      if (transition.action === "set") {
        self.setValue(transition.value);
      } else if (transition.action === "default") {
        self.setDefaultValue();
      }

      self.save();
    },

    setValue(newValue) {
      // BROS-1203: `in_list` / `not_in_list` require a JSON array on the wire.
      // Coerce defensively so that a debounced forced save from FilterOperation
      // (`save(true)` bypasses isValidFilter) can never PATCH a non-list value
      // and trip the FilterSerializer 400 — which the FE error renderer can't
      // display when nested under `filter_group.filters[i].value`.
      //
      // Scoped via the shared `isListMembershipOperator` helper: other
      // `valueType: "list"` filters (e.g. TaskState `contains`) carry a single
      // state string and the BE applies it via `state__icontains=<value>` —
      // coercing to `[value]` was sending an array where the BE expects a scalar,
      // returning zero rows (TC1792 regression).
      if (isListMembershipOperator(self.operator) && newValue != null && !Array.isArray(newValue)) {
        self.value = [newValue];
        return;
      }
      self.value = newValue;
    },

    delete() {
      self.view.deleteFilter(self);
    },

    save: flow(function* (force = false) {
      // Defense in depth: locked tabs must not PATCH filter changes even if UI
      // disable is bypassed. Skip no-op early returns first so mount-time
      // setOperator→save does not toast on already-saved locked filters.
      const isValid = self.isValidFilter;

      if (force !== true) {
        if (self.saved === true) return;
        if (isValid === false) return;
        if (self.wasValid === false && isValid === false) return;
      }

      if (self.view?.isLockedByManager) {
        return self.view.notifyLocked();
      }

      if (self.saving) return;

      self.saving = true;
      self.wasValid = isValid;
      self.markSaved();
      getRoot(self)?.unsetSelection();
      self.view?.clearSelection();
      yield self.view?.save({ interaction: "filter" });
      if (!isAlive(self)) return;
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
      if (!isAlive(self)) return;
      self.save();
    }, 300),
  }))
  .preProcessSnapshot((snapshot) => normalizeChildFilterSnapshot(recoverFilterSnapshot(snapshot)))
  .postProcessSnapshot((snapshot) => {
    const canonicalSnapshot = { ...snapshot };

    delete canonicalSnapshot.apply_legacy_child_filter;
    return canonicalSnapshot;
  });
