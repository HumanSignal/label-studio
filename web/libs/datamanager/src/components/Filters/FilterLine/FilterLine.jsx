import React from "react";
import { observer } from "mobx-react";
import { cn } from "../../../utils/bem";
import { Button, Badge } from "@humansignal/ui";
import { IconClose } from "@humansignal/icons";
import { FilterDropdown } from "../FilterDropdown";
import "./FilterLine.prefix.css";
import { FilterOperation } from "./FilterOperation";
import { Icon } from "../../Common/Icon/Icon";
import {
  ColumnPicker,
  ColumnPickerOptionContent,
  RECENT_COLUMN_PREFIX,
  getFilterGroupTitle,
} from "../../Common/ColumnPicker";
import { filterFieldSearchHandler, findSelectedOption } from "../filter-helpers";
import { RECENT_VALUE_PREFIX } from "../../../hooks/useRecentFilters";

const RECENTS_AUTOSAVE_DELAY_MS = 500;

const Conjunction = observer(({ index, view }) => {
  return (
    <FilterDropdown
      items={[
        { value: "and", label: "And" },
        { value: "or", label: "Or" },
      ]}
      disabled={index > 1}
      value={view.conjunction}
      style={{ textAlign: "right" }}
      onChange={(value) => view.setConjunction(value)}
    />
  );
});

/**
 * Column picker for a single filter row (main layout).
 * Uses core Select with groupBy, optionRenderer, and badge shown in the closed trigger.
 * Receives `pickerFilters` — the plain flat currentView.availableFilters list — so that
 * filtersToPickerGroups always gets {id, field, ...} objects, not the recents-grouped
 * structure that `availableFilters` (fields) uses for FilterDropdown.
 */
const FilterColumnPicker = observer(({ filter, pickerFilters, recentEntries, onSaveOnSwitch, onSaveInPlace }) => {
  const handleChange = (id) => {
    const departingId = filter.filter.id;
    const departingOperator = filter.operator;
    const departingValue = filter.value;
    // Only persist the departing filter if it's fully valid — prevents leaking
    // default/auto-assigned fields that the user never intentionally configured.
    const departingIsValid = filter.isValidFilter;

    if (id?.startsWith(RECENT_COLUMN_PREFIX)) {
      const realId = id.slice(RECENT_COLUMN_PREFIX.length);
      const entry = recentEntries?.find((e) => e.id === realId);
      if (departingIsValid) onSaveInPlace?.(departingId, departingOperator, departingValue);
      filter.setFilterFromRecent(realId, entry?.operator ?? null, entry?.value ?? null);
    } else {
      if (departingIsValid) onSaveOnSwitch?.(departingId, departingOperator, departingValue);
      filter.setFilterDelayed(id);
    }
  };

  return (
    <ColumnPicker
      availableFilters={pickerFilters}
      recentEntries={recentEntries}
      value={filter.filter.id ?? null}
      onChange={handleChange}
      placeholder={filter.field?.title || "Column"}
      size="small"
      disabled={filter.field.disabled}
      triggerProps={{
        style: { minWidth: 80 },
      }}
      renderSelected={(selectedOptions, placeholder) => {
        const opt = selectedOptions?.[0];
        if (!opt) return <span>{placeholder}</span>;
        const field = filter.field;
        const rawGroup = field ? getFilterGroupTitle(field) : null;
        const groupTitle = rawGroup ? rawGroup.charAt(0).toUpperCase() + rawGroup.slice(1) : undefined;
        return <ColumnPickerOptionContent option={{ ...opt, groupTitle }} />;
      }}
    />
  );
});

/** Custom renderer for the column dropdown items: section header or column label.
 *  Headers are styled to visually match the Select component's native group headers
 *  (see select.tsx line 473: pl-3 font-bold text-neutral-content-subtler pt-2).
 *  Since our headers render inside the Option wrapper (which adds p-1 + px-4 py-1),
 *  we only style the text — no margin hacks that would be clipped by overflow-hidden. */
function filterFieldOptionRender({ item }) {
  const original = item?.original ?? item;

  if (original?._isSeparator) {
    return null;
  }

  if (original?._isHeader) {
    return (
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#8C8F9A",
        }}
      >
        {original?.field?.title ?? original?.title ?? "Recent"}
      </span>
    );
  }

  const filter = original;
  const showEnterpriseBadge = filter?.field?.enterprise_badge;
  return (
    <div
      className={cn("filterLine").elem("selector").toClassName()}
      style={{ display: "flex", alignItems: "center", gap: "6px" }}
    >
      <span>{filter?.field?.title}</span>
      {showEnterpriseBadge && <EnterpriseBadge style="ghost" />}
      {filter?.field?.parent && (
        <Badge size="small" className="ml-tightest">
          {filter.field.parent.title}
        </Badge>
      )}
    </div>
  );
}

/**
 * Handle column selection in the filter dropdown.
 * Saves the departing column's state to recents, then applies the new column.
 *
 * - Recent target → save departing in-place (no reorder) + restore stored state
 * - Non-recent target → save departing to front (reorder) + smart carry-over
 */
function handleColumnChange(filter, availableFilters, selectedValue, onSaveOnSwitch, onSaveInPlace) {
  const selected = findSelectedOption(availableFilters, selectedValue);
  const departingId = filter.filter.id;
  const departingOperator = filter.operator;
  const departingValue = filter.value;

  if (selected?._isRecent) {
    const realId = selectedValue.replace(RECENT_VALUE_PREFIX, "");
    onSaveInPlace?.(departingId, departingOperator, departingValue);
    filter.setFilterFromRecent(realId, selected._recentOperator, selected._recentValue);
  } else {
    onSaveOnSwitch?.(departingId, departingOperator, departingValue);
    filter.setFilterDelayed(selectedValue);
  }
}

/**
 * A single filter row: column selector + operator + value input + delete button.
 *
 * Recents are saved at two moments:
 *  1. On column switch (onChange) — the departing column is saved immediately.
 *  2. On any state change — a debounced (500ms) auto-save persists the current
 *     column's state in-place, so recents stay fresh even without switching away.
 *
 * Column switch behavior depends on whether the target is a "Recent" item:
 *  - Recent item -> restore full state (column, operator, value) from the stored entry
 *    via setFilterFromRecent; save departing column in-place (no reorder).
 *  - Non-recent item -> save departing column to front of recents (reorder);
 *    apply new column with smart operator/value carry-over via setFilterDelayed.
 *
 * Main layout uses ColumnPicker (with badge-in-trigger support).
 * Sidebar layout uses FilterDropdown (with recents + custom option renderer).
 */
export const FilterLine = observer(
  ({
    filter,
    availableFilters,
    pickerFilters,
    recentEntries,
    index,
    view,
    sidebar,
    dropdownClassName,
    onSaveOnSwitch,
    onSaveInPlace,
  }) => {
    const childFilter = filter.child_filter;

    // Debounced auto-save: persist current filter state to recents after it settles.
    const saveTimerRef = React.useRef(null);
    const filterId = filter.filter?.id;
    const filterOperator = filter.operator;
    const filterValue = filter.value;
    const isValid = filter.isValidFilter;

    React.useEffect(() => {
      if (!filterId || !filterOperator || !isValid) return;

      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        onSaveOnSwitch?.(filterId, filterOperator, filterValue);
      }, RECENTS_AUTOSAVE_DELAY_MS);

      return () => clearTimeout(saveTimerRef.current);
    }, [filterId, filterOperator, filterValue, isValid, onSaveOnSwitch]);

    if (sidebar) {
      // Sidebar layout uses grid structure like main layout
      return (
        <div className={cn("filterLine").mod({ hasChild: !!childFilter }).toClassName()}>
          {/* Main filter row */}
          <div className={cn("filterLine").elem("column").mix("conjunction").toClassName()}>
            {index === 0 ? (
              <span style={{ fontSize: 12, paddingRight: 5 }}>Where</span>
            ) : (
              <Conjunction index={index} view={view} />
            )}
          </div>

          <div className={cn("filterLine").elem("column").mix("field").toClassName()}>
            <FilterDropdown
              placeholder="Column"
              defaultValue={filter.filter.id}
              items={availableFilters}
              dropdownClassName={dropdownClassName}
              searchFilter={filterFieldSearchHandler}
              onChange={(selectedValue) =>
                handleColumnChange(filter, availableFilters, selectedValue, onSaveOnSwitch, onSaveInPlace)
              }
              optionRender={filterFieldOptionRender}
              disabled={filter.field.disabled}
            />
          </div>

          <FilterOperation
            filter={filter}
            value={filter.currentValue}
            operator={filter.operator}
            field={filter.field}
            disabled={filter.field.disabled}
          />

          {/* Remove button — only show if no child filter, otherwise empty space */}
          {!childFilter ? (
            <div className={cn("filterLine").elem("remove").toClassName()}>
              <Button
                look="string"
                size="small"
                style={{ border: "none" }}
                onClick={(e) => {
                  e.stopPropagation();
                  filter.delete();
                }}
                icon={<Icon icon={IconClose} size={12} />}
              />
            </div>
          ) : (
            <div className={cn("filterLine").elem("remove").toClassName()} />
          )}

          {/* Child filter row */}
          {childFilter && (
            <>
              {/* Conjunction */}
              <div className={cn("filterLine").elem("column").mix("conjunction").toClassName()}>
                <span style={{ fontSize: 12, paddingRight: 5 }}>and</span>
              </div>

              {/* Field — disabled, just shows the linked column name */}
              <div className={cn("filterLine").elem("column").mix("field child-field").toClassName()}>
                <FilterDropdown
                  placeholder={childFilter.field.title}
                  value={childFilter.field.title}
                  items={[{ value: childFilter.field.title, label: childFilter.field.title }]}
                  disabled={true}
                  onChange={() => {}} // No-op since it's disabled
                  style={{ minWidth: "80px" }}
                />
              </div>

              {/* Operation and Value */}
              <FilterOperation
                filter={childFilter}
                value={childFilter.currentValue}
                operator={childFilter.operator}
                field={childFilter.field}
                disabled={filter.field.disabled}
              />

              {/* Remove — deletes the entire filter group including child */}
              <div className={cn("filterLine").elem("remove").toClassName()}>
                <Button
                  look="danger"
                  size="smaller"
                  onClick={(e) => {
                    e.stopPropagation();
                    filter.delete();
                  }}
                  icon={<Icon icon={IconClose} size={12} />}
                />
              </div>
            </>
          )}
        </div>
      );
    }

    // Main layout uses parent grid structure — render children as direct grid items
    return (
      <div className={cn("filterLine").mod({ hasChild: !!childFilter }).toClassName()}>
        <div className={cn("filterLine").elem("column").mix("conjunction").toClassName()}>
          {index === 0 ? (
            <span style={{ fontSize: 12, paddingRight: 5 }}>Where</span>
          ) : (
            <Conjunction index={index} view={view} />
          )}
        </div>

        <div className={cn("filterLine").elem("column").mix("field").toClassName()}>
          <FilterColumnPicker
            filter={filter}
            pickerFilters={pickerFilters ?? availableFilters}
            recentEntries={recentEntries}
            onSaveOnSwitch={onSaveOnSwitch}
            onSaveInPlace={onSaveInPlace}
          />
        </div>

        <FilterOperation
          filter={filter}
          value={filter.currentValue}
          operator={filter.operator}
          field={filter.field}
          disabled={filter.field.disabled}
        />

        {/* Only show remove button if there's no child filter */}
        {!childFilter && (
          <div className={cn("filterLine").elem("remove").toClassName()}>
            <Button
              look="string"
              size="small"
              style={{ border: "none" }}
              onClick={(e) => {
                e.stopPropagation();
                filter.delete();
              }}
              icon={<Icon icon={IconClose} size={12} />}
            />
          </div>
        )}

        {/* Render child filters as additional grid items on new row */}
        {childFilter && (
          <>
            {/* Empty column to maintain grid alignment for main filter row */}
            <div className={cn("filterLine").elem("remove").toClassName()} />

            <div className={cn("filterLine").elem("column").mix("conjunction").toClassName()}>
              <span style={{ fontSize: 12, paddingRight: 5 }}>and</span>
            </div>

            <div className={cn("filterLine").elem("column").mix("field child-field").toClassName()}>
              <FilterDropdown
                placeholder={childFilter.field.title}
                value={childFilter.field.title}
                items={[{ value: childFilter.field.title, label: childFilter.field.title }]}
                disabled={true}
                onChange={() => {}} // No-op since it's disabled
              />
            </div>

            <FilterOperation
              filter={childFilter}
              value={childFilter.currentValue}
              operator={childFilter.operator}
              field={childFilter.field}
              disabled={filter.field.disabled}
            />

            {/* Remove button on child filter row — removes the entire filter group */}
            <div className={cn("filterLine").elem("remove").toClassName()}>
              <Button
                look="string"
                size="small"
                style={{ border: "none" }}
                onClick={(e) => {
                  e.stopPropagation();
                  filter.delete();
                }}
                icon={<Icon icon={IconClose} size={12} />}
              />
            </div>
          </>
        )}
      </div>
    );
  },
);
