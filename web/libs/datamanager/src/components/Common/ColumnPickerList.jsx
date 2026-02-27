import { EnterpriseBadge } from "@humansignal/ui";
import { Tag } from "./Tag/Tag";

// ── Adapters ─────────────────────────────────────────────────────────────────

/**
 * Returns true for the aggregate agreement column and all per-dimension
 * agreement columns, which are grouped together under a synthetic "Agreement"
 * section.  Detection is alias-based so no parent/children wiring is needed
 * on the MST model (keeping existing column IDs and filter/sort behaviour intact).
 */
function isAgreementColumn(col) {
  const alias = col.alias ?? "";
  return alias === "agreement" || alias.startsWith("dimension_agreement__");
}

/**
 * Convert targetColumns (TabColumn[] from store.currentView.targetColumns)
 * to the normalized group format for pickerGroupsToFlatOptions.
 *
 * Columns with `children` become labeled groups via the standard MST hierarchy
 * (Data, Annotations, …).  Agreement and its per-dimension columns are grouped
 * by alias pattern so their column IDs and table behaviour are unchanged.
 * Remaining root columns (no parent, no children) form the un-titled leading group.
 *
 * @param {TabColumn[]} columns
 * @param {function} [filterFn] - optional predicate applied to parent columns and
 *   root leaf columns (e.g. orderable-only for Order By).
 * @returns {ColumnPickerGroup[]}
 */
export function columnsToPickerGroups(columns, filterFn) {
  const rootItems = [];
  const agreementItems = [];
  const groups = new Map(); // parentKey → {key, title, items[]}

  for (const col of columns) {
    if (col.children) {
      // Parent column with explicit children array → named group.
      // filterFn applied to the parent; if it passes, ALL children are included
      // (mirrors the original flat-list filter behaviour of FieldsMenu).
      if (!filterFn || filterFn(col)) {
        const items = col.children.map(toTabColumnItem);
        if (items.length) {
          groups.set(col.key, { key: col.key, title: col.title, items });
        }
      }
    } else if (col.parent) {
      // Child of a parent-with-children: rendered through the parent branch above.
    } else if (isAgreementColumn(col)) {
      // Aggregate + per-dimension agreement columns → synthetic Agreement group.
      if (!filterFn || filterFn(col)) {
        agreementItems.push(toTabColumnItem(col));
      }
    } else {
      // Plain root leaf column.
      if (!filterFn || filterFn(col)) {
        rootItems.push(toTabColumnItem(col));
      }
    }
  }

  const result = [];
  if (rootItems.length) {
    result.push({ key: "__root__", title: null, items: rootItems });
  }
  if (agreementItems.length) {
    result.push({ key: "__agreement__", title: "Agreement", items: agreementItems });
  }
  result.push(...groups.values());
  return result;
}

/**
 * Convert raw availableFilters (from store.currentView.availableFilters) into
 * the normalized group format for pickerGroupsToFlatOptions.
 *
 * Groups are built from the column's parent/children hierarchy — the same
 * structure used by columnsToPickerGroups — so all three pickers show identical
 * group headers (Agreement, Annotations, Data, …).
 *
 * @param {Array<{id: string, type: string, field: TabColumn, schema: any}>} availableFilters
 * @returns {ColumnPickerGroup[]}
 */
export function filtersToPickerGroups(availableFilters) {
  const rootItems = [];
  const agreementItems = [];
  const groups = new Map(); // parent column key → {key, title, items[]}

  for (const filter of availableFilters) {
    const field = filter.field;
    const item = {
      key: filter.id,
      title: field.title,
      readableType: shouldShowBadge(field) ? field.readableType : undefined,
      icon: field.icon,
      enterpriseBadge: field.enterprise_badge,
      disabled: field.disabled,
      original: filter,
    };

    if (isAgreementColumn(field)) {
      agreementItems.push(item);
    } else if (field.parent) {
      const parentKey = field.parent.key;
      if (!groups.has(parentKey)) {
        groups.set(parentKey, { key: parentKey, title: field.parent.title, items: [] });
      }
      groups.get(parentKey).items.push(item);
    } else {
      rootItems.push(item);
    }
  }

  const result = [];
  if (rootItems.length) {
    result.push({ key: "__root__", title: null, items: rootItems });
  }
  if (agreementItems.length) {
    result.push({ key: "__agreement__", title: "Agreement", items: agreementItems });
  }
  result.push(...groups.values());
  return result;
}

/**
 * Show a type badge only for columns that belong to a named group (parent
 * exists) and are NOT agreement-dimension columns.  Root columns and
 * per-dimension agreement sub-columns carry no meaningful type label.
 */
function shouldShowBadge(col) {
  return !!col.parent && col.readableType !== "agreement";
}

function toTabColumnItem(col) {
  const enterpriseBadge = col.enterprise_badge ?? col.original?.enterprise_badge;
  return {
    key: col.key,
    title: col.title,
    readableType: shouldShowBadge(col) ? col.readableType : undefined,
    icon: col.icon,
    enterpriseBadge,
    disabled: col.disabled || !!enterpriseBadge,
    original: col,
  };
}

/** Prefix for Select option values to avoid cmdk substring collisions (e.g. "id" vs "annotations.id") */
const COLUMN_VALUE_PREFIX = "col:";

/**
 * Flatten ColumnPickerGroup[] to flat options for core Select with groupBy.
 * Uses COLUMN_VALUE_PREFIX to avoid cmdk value collisions when keys share substrings.
 *
 * @param {ColumnPickerGroup[]} groups - from columnsToPickerGroups or filtersToPickerGroups
 * @param {string} [groupByField='group'] - field name for groupBy prop
 * @returns {Array<{value: string, label: string, group: string|null, ...}>}
 */
export function pickerGroupsToFlatOptions(groups, groupByField = "group") {
  const result = [];
  for (const group of groups) {
    const groupKey = group.title ?? null;
    for (const item of group.items) {
      result.push({
        value: COLUMN_VALUE_PREFIX + item.key,
        label: item.title,
        [groupByField]: groupKey,
        readableType: item.readableType,
        icon: item.icon,
        enterpriseBadge: item.enterpriseBadge,
        disabled: item.disabled,
        original: item.original,
      });
    }
  }
  return result;
}

export { COLUMN_VALUE_PREFIX };

/** Strip COLUMN_VALUE_PREFIX from a value (for use in onChange handlers) */
export function stripColumnPrefix(v) {
  return typeof v === "string" && v.startsWith(COLUMN_VALUE_PREFIX) ? v.slice(COLUMN_VALUE_PREFIX.length) : v;
}

/**
 * Search filter for column pickers that only matches label (and readableType).
 * Avoids matching the prefixed value which causes overly broad results (e.g. "task" matches all task columns).
 */
export const searchFilterByLabel = (option, queryString) => {
  const q = queryString?.toLowerCase().trim() ?? "";
  if (!q) return true;
  const label = (option?.label ?? option?.title ?? "").toString().toLowerCase();
  const readableType = (option?.readableType ?? "").toString().toLowerCase();
  return label.includes(q) || readableType.includes(q);
};

// ── Option renderer for core Select ───────────────────────────────────────────

/**
 * Option content for core Select optionRenderer: title + icon/tag + EnterpriseBadge.
 * Used when Select provides its own Checkbox (multi-select).
 */
export const ColumnPickerOptionContent = ({ option }) => {
  const { enterpriseBadge, icon, readableType, label } = option ?? {};
  const badge = icon ? (
    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">{icon}</div>
  ) : readableType ? (
    <Tag size="small" color="#888">
      {readableType}
    </Tag>
  ) : null;
  return (
    <span className="flex items-center justify-between w-full gap-base">
      <span>{label}</span>
      <div className="flex items-center gap-tight flex-shrink-0 pointer-events-none">
        {enterpriseBadge && <EnterpriseBadge ghost />}
        {badge}
      </div>
    </span>
  );
};
