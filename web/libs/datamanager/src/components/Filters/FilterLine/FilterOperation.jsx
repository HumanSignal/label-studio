import { observer } from "mobx-react";
import { getRoot } from "mobx-state-tree";
import { useCallback, useMemo } from "react";
import { cn } from "../../../utils/bem";
import { debounce } from "@humansignal/core/lib/utils/debounce";
import { FilterDropdown } from "../FilterDropdown";
import * as FilterInputs from "../types";
import { allowedFilterOperations } from "../types/Utility";
import { Common } from "../types/Common";
import { FF_BROS_1203, isFF } from "../../../utils/feature-flags";
import { LIST_MEMBERSHIP_OPS, supportsListMembership } from "./list-membership";

/** @typedef {{
 * type: keyof typeof FilterInputs,
 * width: number
 * }} FieldConfig */

/**
 *
 * @param {{field: FieldConfig}} param0
 */
export const FilterOperation = observer(({ filter, field, operator, value, disabled, inputType }) => {
  const cellView = filter.cellView;
  // Child review indicators reuse Number columns for top-level counts; override the
  // value widgets to Boolean yes/no without changing the shared column type.
  const resolvedType = inputType ?? filter.filter.currentType;
  const types = cellView?.customOperators ?? [...(FilterInputs[resolvedType] ?? FilterInputs.String), ...Common];

  const selected = useMemo(() => {
    if (operator) {
      // Saved operators that are not in this widget set must stay as-is
      // (FIT-2480: do not rewrite `reviews_accepted > 1` into `is yes`).
      return types.find((t) => t.key === operator);
    }

    const result = types[0];
    // New filters with no operator yet default to the first widget.
    // Skip when read-only/locked: mount-time setOperator→save must not run (FIT-2396).
    if (!disabled && result?.key != null && filter.operator !== result.key) {
      filter.setOperator(result.key);
    }
    return result;
  }, [operator, types, filter, disabled]);

  const saveFilter = useCallback(
    debounce(() => {
      filter.save(true);
    }, 300),
    [filter],
  );

  const onChange = (newValue) => {
    // Locked / unavailable filters must not mutate local state (FIT-2447). Persistence
    // already no-ops in tab_filter.save(); this keeps the UI from looking editable.
    if (disabled) return;
    filter.setValue(newValue);
    saveFilter();
  };

  const onOperatorSelected = (selectedKey) => {
    if (disabled) return;
    filter.setOperator(selectedKey);
  };
  const availableOperators = filter.cellView?.filterOperators;
  const Input = selected?.input;
  const multiple = filter.schema?.multiple ?? false;
  // Match Columns picker (FIT-2396): single-select → disabled; multi-select → readOnly.
  const valueDisabled = Boolean(disabled && !multiple);
  const valueReadOnly = Boolean(disabled && multiple);
  let operatorList = allowedFilterOperations(types, getRoot(filter)?.SDK?.type);
  // BROS-1203 — hide list-membership operators unless FF is on AND the column is allowlisted.
  if (!isFF(FF_BROS_1203) || !supportsListMembership(filter)) {
    operatorList = operatorList.filter((op) => !LIST_MEMBERSHIP_OPS.has(op.key));
  }
  if (filter.filter.field.isAnnotationResultsFilterColumn) {
    // We want at most one of "equal" or "contains" per filter type
    // They resolve to the same backend query in this custom case
    const hasEqualOperators = operatorList.some((o) => ["equal", "not_equal"].includes(o.key));
    const allowedOperators = hasEqualOperators ? ["equal", "not_equal"] : ["contains", "not_contains"];
    operatorList = operatorList.filter((op) => allowedOperators.includes(op.key));
  }
  const operators = operatorList.map(({ key, label }) => {
    if (filter.filter.field.isAnnotationResultsFilterColumn) {
      if (filter.schema?.multiple ?? false) {
        if (key === "contains") label = "includes all";
        if (key === "not_contains") label = "does not include all";
      } else {
        if (key === "contains") label = "is";
        if (key === "not_contains") label = "is not";
      }
    } else if ((filter.schema?.multiple ?? false) && filter.cellView?.customOperators) {
      if (key === "contains") label = "is any of";
      if (key === "not_contains") label = "is none of";
    }
    return { value: key, label };
  });
  const columnClass = cn("filterLine").elem("column");

  if (!types.length) return null;

  return (
    <>
      <div className={columnClass.mix("operation").toClassName()} data-testid="filter-line-operator">
        <FilterDropdown
          placeholder="Condition"
          value={filter.operator}
          disabled={types.length === 1 || disabled}
          items={availableOperators ? operators.filter((op) => availableOperators.includes(op.value)) : operators}
          onChange={onOperatorSelected}
        />
      </div>
      {Input ? (
        <div className={columnClass.mix("value").toClassName()} data-testid="filter-line-value">
          <Input
            {...field}
            key={`${filter.filter.id}-${resolvedType}`}
            schema={filter.schema}
            filter={filter}
            multiple={multiple}
            value={value}
            onChange={onChange}
            size="small"
            disabled={valueDisabled}
            readOnly={valueReadOnly}
          />
        </div>
      ) : null}
    </>
  );
});
