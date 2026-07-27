/**
 * Validate a pasted filter snapshot and return the list of items whose column IDs
 * match the current project's available filters. Returns null if the snapshot is
 * malformed or contains no matching items.
 * @param {{ conjunction?: string, items?: Array }} snapshot
 * @param {Array<{ id: string }>} availableFilters
 * @returns {Array|null} valid items, or null on failure
 */
/** User-select List columns (annotators, reviewers, …) require integer user IDs on the wire. */
export const INTEGER_USER_LIST_ALIASES = new Set([
  "annotators",
  "updated_by",
  "reviewers",
  "comment_authors",
  "skipped_by_annotator",
]);
const USER_FILTER_VALUE_OPERATORS = new Set(["contains", "not_contains"]);
const LEGACY_USER_FILTER_OPERATORS = new Map([
  ["equal", "contains"],
  ["in_list", "contains"],
  ["not_equal", "not_contains"],
  ["not_in_list", "not_contains"],
]);

export function fieldAliasFromFilterId(filterId) {
  if (typeof filterId !== "string") return null;
  const parts = filterId.split(":");
  return parts[parts.length - 1] || null;
}

export function isIntegerUserListField(fieldAlias) {
  return INTEGER_USER_LIST_ALIASES.has(fieldAlias);
}

export function normalizeIntegerUserListOperator(operator, fieldAlias) {
  if (!isIntegerUserListField(fieldAlias) || operator === "empty") return operator;
  const normalized = LEGACY_USER_FILTER_OPERATORS.get(operator) ?? operator;
  return USER_FILTER_VALUE_OPERATORS.has(normalized) ? normalized : "contains";
}

/**
 * Drop values that cannot be valid integer user-id lists (e.g. model-version strings
 * accidentally persisted on an annotators filter). Recover exact historical option
 * shapes and reset an unrecoverable selection to an empty list.
 */
export function sanitizeIntegerUserListValue(value, { fieldAlias, operator }) {
  if (!isIntegerUserListField(fieldAlias)) return value;
  if (operator === "empty") return value;
  if (!USER_FILTER_VALUE_OPERATORS.has(operator)) return [];
  if (value == null) return value;

  const ids = [];
  const seen = new Set();
  const collectionValue = Array.isArray(value) || (typeof value === "object" && Array.isArray(value?.items));
  const configuredMax = Number(window.APP_SETTINGS?.data_manager?.list_filter_max_values);
  const maxValues = Number.isSafeInteger(configuredMax) && configuredMax > 0 ? configuredMax : 5000;
  const collect = (candidate) => {
    if (ids.length >= maxValues || candidate == null || typeof candidate === "boolean") return;
    if (Array.isArray(candidate)) {
      candidate.forEach(collect);
      return;
    }
    if (typeof candidate === "object") {
      if (Array.isArray(candidate.items)) {
        collect(candidate.items);
      } else if ("id" in candidate) {
        collect(candidate.id);
      } else if ("value" in candidate) {
        collect(candidate.value);
      }
      return;
    }
    if (typeof candidate === "number" && !Number.isInteger(candidate)) return;
    const text = String(candidate).trim();
    if (!/^-?\d+$/.test(text)) return;
    const id = Number(text);
    if (!Number.isSafeInteger(id) || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };

  collect(value);
  return collectionValue || ids.length === 0 ? ids : ids[0];
}

export function normalizeIntegerUserFilter({ fieldAlias, operator, value }) {
  if (!isIntegerUserListField(fieldAlias)) return { operator, value };
  if (operator === "empty") {
    if (typeof value === "boolean") return { operator, value };
    if (value === 0 || value === 1) return { operator, value: Boolean(value) };
    if (typeof value === "string") {
      const normalized = value.toLowerCase();
      if (["true", "yes", "on", "1"].includes(normalized)) return { operator, value: true };
      if (["false", "no", "not", "off", "0"].includes(normalized)) return { operator, value: false };
    }
    return { operator: "contains", value: [] };
  }
  if (!USER_FILTER_VALUE_OPERATORS.has(operator) && !LEGACY_USER_FILTER_OPERATORS.has(operator)) {
    return { operator: "contains", value: [] };
  }
  const normalizedOperator = normalizeIntegerUserListOperator(operator, fieldAlias);
  return {
    operator: normalizedOperator,
    value: sanitizeIntegerUserListValue(value, { fieldAlias, operator: normalizedOperator }),
  };
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
