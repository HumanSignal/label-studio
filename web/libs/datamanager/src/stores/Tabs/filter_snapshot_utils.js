/**
 * Validate a pasted filter snapshot and return the list of items whose column IDs
 * match the current project's available filters. Returns null if the snapshot is
 * malformed or contains no matching items.
 * @param {{ conjunction?: string, items?: Array }} snapshot
 * @param {Array<{ id: string }>} availableFilters
 * @returns {Array|null} valid items, or null on failure
 */
/** User-select List columns (annotators, reviewers, …) require integer user IDs on the wire. */
export const INTEGER_USER_LIST_ALIASES = new Set(["annotators", "reviewers", "comment_authors"]);

export function fieldAliasFromFilterId(filterId) {
  if (typeof filterId !== "string") return null;
  const parts = filterId.split(":");
  return parts[parts.length - 1] || null;
}

export function isIntegerUserListField(fieldAlias) {
  return INTEGER_USER_LIST_ALIASES.has(fieldAlias);
}

/**
 * Drop values that cannot be valid integer user-id lists (e.g. model-version strings
 * accidentally persisted on an annotators filter). Returns null to signal reset.
 */
export function sanitizeIntegerUserListValue(value, { fieldAlias, operator }) {
  if (!isIntegerUserListField(fieldAlias)) return value;
  if (!operator || !["contains", "not_contains"].includes(operator)) return value;
  if (value == null) return value;
  if (!Array.isArray(value)) return value;

  const hasInvalidElement = value.some((element) => {
    if (typeof element === "number" && Number.isInteger(element)) return false;
    if (typeof element === "string" && element !== "" && /^\d+$/.test(element)) return false;
    return true;
  });

  return hasInvalidElement ? null : value;
}

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
 *  4. Neither column uses the List type — List filters (annotators, model versions, etc.)
 *     have column-specific value shapes even when the target has no static schema
 *     (e.g. UserSelect for annotators).
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
 * @param {string} [params.prevColumnId] - filter type id before the switch
 * @param {string} [params.newColumnId]  - filter type id after the switch
 * @returns {{ operator: string, value: *, valueReset: boolean }}
 */
export function resolveFilterTransition({
  prevType,
  prevOperator,
  prevValue,
  newType,
  newOperators,
  newSchema,
  prevColumnId,
  newColumnId,
}) {
  const typeChanged = prevType !== newType;
  const columnChanged = prevColumnId != null && newColumnId != null && prevColumnId !== newColumnId;
  // List columns (annotators, model versions, etc.) use column-specific value shapes even
  // when the target column has no static schema (e.g. UserSelect). Never carry values
  // across List-typed columns — doing so sends strings to integer user-id filters and
  // triggers a view-save 400 surfaced as a Runtime error modal.
  const schemaBound = newSchema != null || prevType === "List" || newType === "List";
  const operatorStillValid = prevOperator && newOperators.some((op) => op.key === prevOperator);
  const canPreserveValue = !typeChanged && !schemaBound && !columnChanged;

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

/**
 * Decide how to reshape a filter value when the operator changes within the same column.
 * Exported for unit tests — TabFilter.setOperator delegates here.
 *
 * BROS-1203 / TC1792: only `in_list` / `not_in_list` use JSON arrays on the wire.
 * TaskState `contains` declares valueType "list" but carries a scalar state string;
 * never wrap those into arrays. Likewise, only unwrap arrays when leaving list-membership
 * operators — not when leaving TaskState or UserSelect multi-select operators.
 *
 * @param {object} params
 * @param {string|null|undefined} params.previousOperator
 * @param {string} params.nextOperator
 * @param {string|undefined} params.previousValueType
 * @param {string|undefined} params.nextValueType
 * @param {*} params.previousValue
 * @param {(op: string) => boolean} [params.isListMembershipOperator]
 * @returns {{ action: 'keep'|'set'|'default', value?: * }}
 */
export function resolveOperatorValueTransition({
  previousOperator,
  nextOperator,
  previousValueType,
  nextValueType,
  previousValue,
  isListMembershipOperator: isListMembership = (op) => op === "in_list" || op === "not_in_list",
}) {
  if (previousValueType === nextValueType) {
    return { action: "keep", value: previousValue };
  }

  const isMeaningfulSingle =
    previousValue != null &&
    typeof previousValue !== "object" &&
    !(typeof previousValue === "string" && previousValue.trim() === "");

  if (
    nextValueType === "list" &&
    previousValueType === "single" &&
    isMeaningfulSingle &&
    isListMembership(nextOperator)
  ) {
    return { action: "set", value: [previousValue] };
  }

  if (
    nextValueType === "single" &&
    previousValueType === "list" &&
    isListMembership(previousOperator) &&
    Array.isArray(previousValue) &&
    previousValue.length > 0
  ) {
    return { action: "set", value: previousValue[0] };
  }

  // TaskState-style operators: valueType "list" but scalar on the wire. Preserve when
  // afterAttach assigns the first operator to a snapshot that already has a value.
  if (
    nextValueType === "list" &&
    (previousValueType == null || previousValueType === undefined) &&
    isMeaningfulSingle &&
    !isListMembership(nextOperator)
  ) {
    return { action: "keep", value: previousValue };
  }

  return { action: "default" };
}
