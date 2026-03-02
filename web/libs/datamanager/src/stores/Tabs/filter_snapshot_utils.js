/**
 * Validate a pasted filter snapshot and return the list of items whose column IDs
 * match the current project's available filters. Returns null if the snapshot is
 * malformed or contains no matching items.
 * @param {{ conjunction?: string, items?: Array }} snapshot
 * @param {Array<{ id: string }>} availableFilters
 * @returns {Array|null} valid items, or null on failure
 */
export function validateFilterSnapshot(snapshot, availableFilters) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const { items } = snapshot;
  if (!Array.isArray(items)) return null;

  const availableIds = new Set(availableFilters.map((f) => f.id));
  const validItems = items.filter((item) => item?.filter && availableIds.has(item.filter));

  return validItems.length > 0 ? validItems : null;
}

/**
 * Decide which operator and value to use after switching a filter to a new column.
 *
 * Rules (value preservation requires ALL conditions to be true):
 *  1. Same type (prevType === newType)
 *  2. Operator still valid in the new column
 *  3. New column has NO schema — i.e. it uses free-form input (String, Number, Date…)
 *     Columns with a schema (List, etc.) have dropdown values specific to each column
 *     (user IDs, model names, label choices…). Carrying them across columns is
 *     meaningless and can crash the backend (e.g. int() on a list of strings).
 *
 * When value cannot be preserved, it is reset to the column default.
 * Operator is always preserved if it exists in the target column's operator set,
 * regardless of type or schema changes.
 *
 * @param {object} params
 * @param {string} params.prevType       - currentType of the column before the switch
 * @param {string} params.prevOperator   - operator key before the switch
 * @param {*}      params.prevValue      - value before the switch
 * @param {string} params.newType        - currentType of the column after the switch
 * @param {Array<{key:string}>} params.newOperators - operators available for the new column
 * @param {*}      [params.newSchema]    - schema of the new column (non-null for dropdowns)
 * @returns {{ operator: string, value: *, valueReset: boolean }}
 */
export function resolveFilterTransition({ prevType, prevOperator, prevValue, newType, newOperators, newSchema }) {
  const typeChanged = prevType !== newType;
  const schemaBound = newSchema != null;
  const operatorStillValid = prevOperator && newOperators.some((op) => op.key === prevOperator);
  const canPreserveValue = !typeChanged && !schemaBound;

  if (operatorStillValid) {
    return {
      operator: prevOperator,
      value: canPreserveValue ? prevValue : undefined,
      valueReset: !canPreserveValue,
    };
  }

  return {
    operator: newOperators[0].key,
    value: undefined,
    valueReset: true,
  };
}
