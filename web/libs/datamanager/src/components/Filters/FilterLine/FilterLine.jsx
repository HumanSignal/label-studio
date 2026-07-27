import React from "react";
import { observer } from "mobx-react";
import { cn } from "../../../utils/bem";
import { Badge, Button, EnterpriseBadge, Typography } from "@humansignal/ui";
import { IconClose, PlusIcon } from "@humansignal/icons";
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

export const isFilterEditingDisabled = (field) => field?.disabled || field?.filter_available === false;

export const UnavailableFilterNotice = ({ reason }) => (
  <Typography
    as="div"
    variant="body"
    size="smallest"
    role="status"
    className={cn("filterLine").elem("unavailable").toClassName()}
  >
    {reason}
  </Typography>
);

const Conjunction = observer(({ index, view, disabled }) => {
  return (
    <FilterDropdown
      items={[
        { value: "and", label: "And" },
        { value: "or", label: "Or" },
      ]}
      disabled={index > 1 || disabled}
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
const FilterColumnPicker = observer(
  ({ filter, pickerFilters, recentEntries, onSaveOnSwitch, onSaveInPlace, disabled }) => {
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
        disabled={disabled || isFilterEditingDisabled(filter.field)}
        triggerProps={{
          style: { minWidth: 80 },
        }}
        renderSelected={(selectedOptions, placeholder) => {
          const opt = selectedOptions?.[0];
          if (!opt)
            return (
              <Typography as="span" variant="body" size="smallest">
                {placeholder}
              </Typography>
            );
          const field = filter.field;
          const rawGroup = field ? getFilterGroupTitle(field) : null;
          const groupTitle = rawGroup ? rawGroup.charAt(0).toUpperCase() + rawGroup.slice(1) : undefined;
          return <ColumnPickerOptionContent option={{ ...opt, groupTitle }} />;
        }}
      />
    );
  },
);

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
      <Typography as="span" variant="label" size="small" className="text-neutral-content-subtler">
        {original?.field?.title ?? original?.title ?? "Recent"}
      </Typography>
    );
  }

  const filter = original;
  const showEnterpriseBadge = filter?.field?.enterprise_badge;
  return (
    <div className={cn("filterLine").elem("selector").toClassName()}>
      <Typography as="span" variant="body" size="small">
        {filter?.field?.title}
      </Typography>
      {showEnterpriseBadge && <EnterpriseBadge look="ghost" />}
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
    disabled = false,
    disabledTooltip,
  }) => {
    const childFilters = filter.child_filters;
    const configuredChildAliases =
      filter.field.allowed_child_filters?.length > 0
        ? filter.field.allowed_child_filters
        : filter.field.child_filter
          ? [filter.field.child_filter]
          : [];
    const canConfigureChildren = filter.field.allowed_child_filters?.length > 0;
    const allFilterTypes = view.parent?.availableFilters ?? view.availableFilters;
    const childFilterTypes = configuredChildAliases
      .map((alias) =>
        allFilterTypes.find(
          (filterType) => filterType.field.alias === alias && filterType.field.target === filter.target,
        ),
      )
      .filter(Boolean);
    const childColumnItems = childFilterTypes.map((filterType) => ({
      value: filterType.id,
      label: filterType.field.title,
      disabled:
        filterType.field.disabled ||
        !filterType.field.available_for_new_filters ||
        filterType.field.filter_available === false,
    }));
    const defaultChildFilterType = childFilterTypes.find(
      (filterType) =>
        !filterType.field.disabled &&
        filterType.field.available_for_new_filters &&
        filterType.field.filter_available !== false,
    );
    // Editing controls are disabled when the tab is locked (UTC-949) or the filter is
    // unavailable (FIT-2173); removal stays governed by lock only so unavailable filters
    // remain removable.
    const isDisabled = disabled || isFilterEditingDisabled(filter.field);
    const lockTooltip = disabled ? disabledTooltip : undefined;
    const unavailableReason = filter.field.filter_available === false ? filter.field.unavailable_reason : null;

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

    const rootColumnPicker = sidebar ? (
      <FilterDropdown
        placeholder={filter.field?.title || "Column"}
        defaultValue={filter.filter.id}
        items={availableFilters}
        dropdownClassName={dropdownClassName}
        searchFilter={filterFieldSearchHandler}
        onChange={(selectedValue) =>
          handleColumnChange(filter, availableFilters, selectedValue, onSaveOnSwitch, onSaveInPlace)
        }
        optionRender={filterFieldOptionRender}
        disabled={isDisabled}
      />
    ) : (
      <FilterColumnPicker
        filter={filter}
        pickerFilters={pickerFilters ?? availableFilters}
        recentEntries={recentEntries}
        onSaveOnSwitch={onSaveOnSwitch}
        onSaveInPlace={onSaveInPlace}
        disabled={disabled}
      />
    );

    return (
      <div
        className={cn("filterLine")
          .mod({ hasChild: childFilters.length > 0 })
          .toClassName()}
        data-testid={sidebar ? undefined : "filter-line"}
      >
        <div className={cn("filterLine").elem("column").mix("conjunction").toClassName()}>
          {index === 0 ? (
            <Typography as="span" variant="body" size="smallest" className="pr-tightest">
              Where
            </Typography>
          ) : (
            <Conjunction index={index} view={view} disabled={disabled} />
          )}
        </div>

        <div
          className={cn("filterLine").elem("column").mix("field").toClassName()}
          data-testid={sidebar ? undefined : "filter-line-column"}
        >
          {rootColumnPicker}
        </div>

        <FilterOperation
          filter={filter}
          value={filter.currentValue}
          operator={filter.operator}
          field={filter.field}
          disabled={isDisabled}
        />

        <div className={cn("filterLine").elem("remove").toClassName()}>
          <Button
            look="string"
            size="small"
            disabled={disabled}
            tooltip={lockTooltip}
            onClick={(event) => {
              event.stopPropagation();
              filter.delete();
            }}
            aria-label="Remove filter"
            icon={<Icon icon={IconClose} size={12} />}
          />
        </div>

        {unavailableReason && <UnavailableFilterNotice reason={unavailableReason} />}

        {childFilters.map((childFilter) => {
          const childAliasIsAllowed = configuredChildAliases.includes(childFilter.field.alias);
          const childIsDisabled =
            isDisabled || !canConfigureChildren || !childAliasIsAllowed || isFilterEditingDisabled(childFilter.field);
          const childUnavailableReason =
            childFilter.field.filter_available === false ? childFilter.field.unavailable_reason : null;

          return (
            <React.Fragment key={childFilter.id}>
              <div className={cn("filterLine").elem("column").mix("conjunction").toClassName()}>
                <Typography as="span" variant="body" size="smallest" className="pr-tightest">
                  and
                </Typography>
              </div>

              <div className={cn("filterLine").elem("column").mix("field child-field").toClassName()}>
                <FilterDropdown
                  placeholder={childFilter.field.title}
                  value={childFilter.filter.id}
                  items={childColumnItems}
                  disabled={childIsDisabled}
                  onChange={(filterTypeId) => childFilter.setFilterDelayed(filterTypeId)}
                />
              </div>

              <FilterOperation
                filter={childFilter}
                value={childFilter.currentValue}
                operator={childFilter.operator}
                field={childFilter.field}
                disabled={childIsDisabled}
              />

              <div className={cn("filterLine").elem("remove").toClassName()}>
                <Button
                  look="string"
                  size="small"
                  disabled={disabled}
                  tooltip={lockTooltip}
                  onClick={(event) => {
                    event.stopPropagation();
                    view.removeChildFilter(filter, childFilter);
                  }}
                  aria-label="Remove child filter"
                  icon={<Icon icon={IconClose} size={12} />}
                />
              </div>

              {childUnavailableReason && <UnavailableFilterNotice reason={childUnavailableReason} />}
            </React.Fragment>
          );
        })}

        {canConfigureChildren && (
          <div className={cn("filterLine").elem("child-actions").toClassName()}>
            <Button
              look="string"
              size="small"
              disabled={isDisabled || !defaultChildFilterType}
              tooltip={disabled ? lockTooltip : unavailableReason}
              onClick={() => view.addChildFilter(filter, defaultChildFilterType)}
              leading={<PlusIcon size={14} weight="bold" aria-hidden="true" />}
            >
              Add child filter
            </Button>
          </div>
        )}
      </div>
    );
  },
);
