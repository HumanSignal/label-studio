import { Badge, Select } from "@humansignal/ui";
import { IconSpark } from "@humansignal/icons";
import { useCallback, useMemo } from "react";

// ── Adapters ─────────────────────────────────────────────────────────────────

/**
 * Returns true for any column alias that belongs to the agreement family:
 * the main `agreement` column, the legacy `agreement_selected` column, and
 * any dimension breakdown columns (`dimension_agreement__*`).
 */
function isAgreementAlias(alias) {
  if (typeof alias !== "string") return false;
  return alias === "agreement" || alias === "agreement_selected" || alias.startsWith("dimension_agreement__");
}

/**
 * Convert targetColumns (TabColumn[] from store.currentView.targetColumns)
 * to the normalized group format for pickerGroupsToFlatOptions.
 *
 * Columns with `children` become labeled groups via the standard MST hierarchy
 * (Data, Annotations, …).  Agreement-family columns (agreement, agreement_selected,
 * dimension_agreement__*) are always collected into a synthetic "Agreement" group
 * regardless of whether the backend sends a parent.  Remaining root columns form
 * the un-titled leading group.
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
    } else if (isAgreementAlias(col.alias)) {
      // Agreement-family column → synthetic "Agreement" group.
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
      readableType: shouldShowBadge(field) ? (agreementBadgeLabel(field) ?? field.readableType) : undefined,
      icon: field.icon,
      enterpriseBadge: field.enterprise_badge,
      disabled: field.disabled,
      original: filter,
    };

    if (isAgreementAlias(field.alias)) {
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
 * Show a type badge only for columns that belong to a named group (parent exists)
 * or for dimension agreement columns shown inside the synthetic Agreement group.
 */
function shouldShowBadge(col) {
  if (typeof col.alias === "string" && col.alias.startsWith("dimension_agreement__")) return true;
  return !!col.parent && col.alias !== "agreement";
}

/**
 * For dimension agreement columns the badge label should always read "Agreement"
 * regardless of the underlying readableType.  Returns null for all other columns.
 */
function agreementBadgeLabel(col) {
  if (typeof col.alias === "string" && col.alias.startsWith("dimension_agreement__")) return "Agreement";
  return null;
}

function toTabColumnItem(col) {
  const enterpriseBadge = col.enterprise_badge ?? col.original?.enterprise_badge;
  return {
    key: col.key,
    title: col.title,
    readableType: shouldShowBadge(col) ? (agreementBadgeLabel(col) ?? col.readableType) : undefined,
    icon: col.icon,
    enterpriseBadge,
    disabled: col.disabled || !!enterpriseBadge,
    original: col,
  };
}

/** Prefix for Select option values to avoid cmdk substring collisions (e.g. "id" vs "annotations.id") */
export const COLUMN_VALUE_PREFIX = "col:";

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

// ── Option renderer ───────────────────────────────────────────────────────────

/**
 * Option content for ColumnPicker: title + icon/tag + EnterpriseBadge.
 */
export const ColumnPickerOptionContent = ({ option }) => {
  const { enterpriseBadge, icon, readableType, label } = option ?? {};
  const badge = icon ? (
    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">{icon}</div>
  ) : readableType ? (
    <Badge size="small" variant="primary">
      {readableType}
    </Badge>
  ) : null;
  return (
    <span className="flex items-center justify-between w-full gap-base">
      <span>{label}</span>
      <div className="flex items-center gap-tight flex-shrink-0 pointer-events-none">
        {enterpriseBadge && (
          <Badge variant="gradient" style="ghost" icon={<IconSpark />}>
            Enterprise
          </Badge>
        )}
        {badge}
      </div>
    </span>
  );
};

// ── Unified component ─────────────────────────────────────────────────────────

const MEDIUM_TRIGGER_STYLE = {
  height: 32,
  color: "var(--color-neutral-content)",
  fontSize: "var(--font-size-14)",
  fontWeight: "var(--font-weight-medium)",
};

/**
 * Unified column/filter picker built on core Select.
 *
 * Pass raw data via `columns` (+ optional `columnFilter`) or `availableFilters`.
 * ColumnPicker handles grouping, option flattening, and key prefix encoding internally.
 * `value` and `onChange` use plain unprefixed keys.
 *
 * Use `multiple` for the columns visibility picker (FieldsButton).
 * Use single-select (default) for ordering and filter pickers.
 */
export function ColumnPicker({
  // Data source — pass one of these two
  columns, // TabColumn[] for column pickers
  columnFilter, // optional (col) => bool predicate to filter columns
  availableFilters, // for filter pickers

  // Plain unprefixed keys
  value,
  onChange,

  multiple = false,
  size = "medium",
  disabled,
  placeholder,
  renderSelected,
  triggerProps,
  triggerClassName,
  dataTestid,
}) {
  const groups = useMemo(() => {
    if (columns) return columnsToPickerGroups(columns, columnFilter);
    if (availableFilters) return filtersToPickerGroups(availableFilters);
    return [];
    // columnFilter is intentionally omitted from deps — callers must pass a stable reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, availableFilters]);

  const flatOptions = useMemo(() => pickerGroupsToFlatOptions(groups), [groups]);

  const encodedValue = useMemo(() => {
    if (value == null) return value;
    if (Array.isArray(value)) return value.map((v) => COLUMN_VALUE_PREFIX + v);
    return COLUMN_VALUE_PREFIX + value;
  }, [value]);

  const handleChange = useCallback(
    (newValue) => {
      if (!onChange) return;
      if (newValue == null) return onChange(newValue);
      if (Array.isArray(newValue)) return onChange(newValue.map(stripColumnPrefix));
      return onChange(stripColumnPrefix(newValue));
    },
    [onChange],
  );

  return (
    <Select
      options={flatOptions}
      value={encodedValue}
      onChange={handleChange}
      multiple={multiple}
      searchable
      searchPlaceholder="Search columns"
      searchFilter={searchFilterByLabel}
      groupBy="group"
      optionRenderer={ColumnPickerOptionContent}
      renderSelected={renderSelected}
      placeholder={placeholder}
      size={size}
      disabled={disabled}
      dataTestid={dataTestid}
      triggerClassName={triggerClassName}
      triggerProps={{
        ...triggerProps,
        style: {
          ...(size === "medium" && MEDIUM_TRIGGER_STYLE),
          ...triggerProps?.style,
        },
      }}
    />
  );
}
