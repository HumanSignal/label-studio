import { tryReference } from "mobx-state-tree";

const parentId = (field) => tryReference(() => field?.parent)?.id ?? null;

/**
 * Pick the filter type for a child alias. Column aliases are bare ids, so the same alias can
 * exist at the root and under a parent (`reviewed_at` and `reviews.reviewed_at`): prefer the
 * sibling of the parent filter, then the root column (`annotators`), not a task-data or result column with that alias.
 */
export function preferSiblingFilterType(candidates, parentField) {
  return (
    candidates.find((candidate) => parentId(candidate.field) === parentId(parentField)) ??
    candidates.find((candidate) => parentId(candidate.field) === null) ??
    candidates[0]
  );
}

export function findChildFilterType(filterTypes, parentField, alias, target) {
  return preferSiblingFilterType(
    filterTypes.filter((filterType) => filterType.field.alias === alias && filterType.field.target === target),
    parentField,
  );
}
