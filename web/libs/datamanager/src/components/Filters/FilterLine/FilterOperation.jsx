import { observer } from "mobx-react";
import { getRoot } from "mobx-state-tree";
import { useCallback, useMemo } from "react";
import { Elem } from "../../../utils/bem";
import { debounce } from "../../../utils/debounce";
import { FilterDropdown } from "../FilterDropdown";
import * as FilterInputs from "../types";
import { allowedFilterOperations } from "../types/Utility";
import { Common } from "../types/Common";

/** @typedef {{
 * type: keyof typeof FilterInputs,
 * width: number
 * }} FieldConfig */

/**
 *
 * @param {{field: FieldConfig}} param0
 */
export const FilterOperation = observer(({ filter, field, operator, value }) => {
  const cellView = filter.cellView;
  const types = cellView?.customOperators ?? [
    ...(FilterInputs[filter.filter.currentType] ?? FilterInputs.String),
    ...Common,
  ];

  const selected = useMemo(() => {
    let result;

    if (operator) {
      result = types.find((t) => t.key === operator);
    }

    if (!result) {
      result = types[0];
    }

    filter.setOperator(result.key);
    return result;
  }, [operator, types, filter]);

  const saveFilter = useCallback(
    debounce(() => {
      filter.save(true);
    }, 300),
    [filter],
  );

  const onChange = (newValue) => {
    filter.setValue(newValue);
    saveFilter();
  };

  const onOperatorSelected = (selectedKey) => {
    filter.setOperator(selectedKey);
  };
  const availableOperators = filter.cellView?.filterOperators;
  const Input = selected?.input;
  const operatorList = allowedFilterOperations(types, getRoot(filter)?.SDK?.type);
  const operators = operatorList.map(({ key, label }) => ({ value: key, label }));

  return Input ? (
    <>
      <Elem block="filter-line" name="column" mix="operation">
        <FilterDropdown
          placeholder="Condition"
          value={filter.operator}
          disabled={types.length === 1}
          items={availableOperators ? operators.filter((op) => availableOperators.includes(op.value)) : operators}
          onChange={onOperatorSelected}
        />
      </Elem>
      <Elem block="filter-line" name="column" mix="value">
        <Input
          {...field}
          key={`${filter.filter.id}-${filter.filter.currentType}`}
          schema={filter.schema}
          filter={filter}
          value={value}
          onChange={onChange}
        />
      </Elem>
    </>
  ) : null;
});
