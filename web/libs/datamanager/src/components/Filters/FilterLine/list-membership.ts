/**
 * BROS-1203 / FIT-2416 — Frontend allowlist for the `in_list` / `not_in_list` operators.
 *
 * Mirrors the backend allowlist in two places:
 *   - `services/lso/label_studio/data_manager/serializers.py::_column_supports_list_membership`
 *   - `services/lso/label_studio/data_manager/managers.py::_is_supported_in_list_field`
 *
 * Keep these three in sync. Adding a new supported column requires updating all three.
 */

export const LIST_MEMBERSHIP_OPS = new Set(["in_list", "not_in_list"]);

/** Number counter columns that map cleanly to Django `__in` (FIT-2416). */
export const LIST_MEMBERSHIP_COUNTER_FIELDS = new Set([
  "total_annotations",
  "total_predictions",
  "cancelled_annotations",
]);

export function supportsListMembership(filter: unknown): boolean {
  const id = (filter as { filter?: { id?: unknown } } | undefined)?.filter?.id;
  if (typeof id !== "string") return false;
  if (id === "filter:tasks:id" || id === "filter:tasks:inner_id" || id.startsWith("filter:tasks:data.")) {
    return true;
  }
  if (!id.startsWith("filter:tasks:")) return false;
  return LIST_MEMBERSHIP_COUNTER_FIELDS.has(id.slice("filter:tasks:".length));
}
