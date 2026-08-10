import React from "react";
import { observer } from "mobx-react";
import { cn } from "../../../utils/bem";
import { Button, Typography } from "@humansignal/ui";
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
 * Column picker for a single filter row (pinned sidebar and unpinned popup).
 * Uses core Select with groupBy, optionRenderer, and badge shown in the closed trigger.
 * Receives `pickerFilters` — the plain flat currentView.availableFilters list — so that
 * filtersToPickerGroups always gets {id, field, ...} objects.
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
 * Both pinned (sidebar) and unpinned (popup) layouts use ColumnPicker so the
 * filter field list and section headers stay identical (FIT-2433).
 */
export const FilterLine = observer(
  ({
    filter,
    pickerFilters,
    recentEntries,
    index,
    view,
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

    return (
      <div
        className={cn("filterLine")
          .mod({ hasChild: childFilters.length > 0 })
          .toClassName()}
        data-testid="filter-line"
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

        <div className={cn("filterLine").elem("column").mix("field").toClassName()} data-testid="filter-line-column">
          <FilterColumnPicker
            filter={filter}
            pickerFilters={pickerFilters}
            recentEntries={recentEntries}
            onSaveOnSwitch={onSaveOnSwitch}
            onSaveInPlace={onSaveInPlace}
            disabled={disabled}
          />
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
