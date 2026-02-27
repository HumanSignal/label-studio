import React from "react";
import { observer } from "mobx-react";
import { cn } from "../../../utils/bem";
import { Button, EnterpriseBadge } from "@humansignal/ui";
import { IconClose } from "@humansignal/icons";
import { Tag } from "../../Common/Tag/Tag";
import { FilterDropdown } from "../FilterDropdown";
import "./FilterLine.scss";
import { FilterOperation } from "./FilterOperation";
import { Icon } from "../../Common/Icon/Icon";

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
 * Custom search handler for the column dropdown.
 * When the user starts typing, hide decorative items (header, separator)
 * and recent duplicates — only match real column options by title.
 */
function filterFieldSearchHandler(option, query) {
  const original = option?.original ?? option;

  if (original?._isHeader || original?._isSeparator) {
    return !query;
  }
  if (option?._isRecent) {
    return !query;
  }

  const title = original?.field?.title ?? original?.title ?? "";
  const parentTitle = original?.field?.parent?.title ?? "";
  return `${title} ${parentTitle}`.toLowerCase().includes(query.toLowerCase());
}

/** Custom renderer for the column dropdown items: "Recent" header, separator line, or column label. */
function filterFieldOptionRender({ item }) {
  const original = item?.original ?? item;

  if (original?._isSeparator) {
    return (
      <div
        style={{
          borderTop: "1px solid var(--color-neutral-border)",
          margin: "0 -8px",
          width: "calc(100% + 16px)",
          height: 0,
          position: "relative",
          top: "-10px",
          cursor: "default",
          pointerEvents: "none",
        }}
      />
    );
  }

  if (original?._isHeader) {
    return (
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--color-neutral-content-subtler)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          cursor: "default",
          pointerEvents: "none",
          display: "flex",
          alignItems: "flex-end",
          height: "100%",
          paddingBottom: 4,
        }}
      >
        {original?.field?.title ?? original?.title ?? "Recent"}
      </div>
    );
  }

  const filter = original;
  const showEnterpriseBadge = filter?.field?.enterprise_badge;
  return (
    <div
      className={cn("filterLine").elem("selector")}
      style={{ display: "flex", alignItems: "center", gap: "8px" }}
    >
      <span>{filter?.field?.title}</span>
      {showEnterpriseBadge && <EnterpriseBadge ghost />}
      {filter?.field?.parent && (
        <Tag size="small" className="filters-data-tag" color="#1d91e4" style={{ marginLeft: 7 }}>
          {filter.field.parent.title}
        </Tag>
      )}
    </div>
  );
}

/**
 * Find the full option object for a selected value.
 * Searches both flat items (recent entries at the top) and grouped items (options arrays).
 * Recent items are placed before groups, so they are found first — this is important
 * because the same filter ID exists in both "Recent" and the normal group list.
 */
function findSelectedOption(availableFilters, selectedValue) {
  for (const item of availableFilters) {
    if (item.options) {
      const found = item.options.find((o) => o.value === selectedValue);
      if (found) return found;
    }
    if (item.value === selectedValue) return item;
  }
  return null;
}

/**
 * A single filter row: column selector + operator + value input + delete button.
 *
 * Column switch behavior depends on whether the target is a "Recent" item:
 *  - Recent item → restore full state (column, operator, value) from the stored entry
 *    via setFilterFromRecent, and silently update the departing column's state in-place
 *    (onFieldUpdate) so it stays fresh without reordering the recents list.
 *  - Non-recent item → save the departing column to recents at the top of the list
 *    (onFieldSelect), then apply the new column with smart operator/value carry-over
 *    via setFilterDelayed.
 */
export const FilterLine = observer(({ filter, availableFilters, index, view, sidebar, dropdownClassName, onFieldSelect, onFieldUpdate }) => {
  const childFilter = filter.child_filter;

  // Keep the recents entry up-to-date whenever the filter has a valid state.
  // This ensures columns that are never "switched away from" (e.g. the user sets
  // a value and then deletes the filter) still appear in the "Recent" section.
  // Uses onFieldUpdate (no reorder) — the entry is created at the end if new,
  // or updated in-place if it already exists.
  const filterId = filter.filter?.id;
  const filterOperator = filter.operator;
  const filterValue = filter.value;
  const isValid = filter.isValidFilter;

  React.useEffect(() => {
    if (filterId && filterOperator && isValid) {
      onFieldUpdate?.(filterId, filterOperator, filterValue);
    }
  }, [filterId, filterOperator, filterValue, isValid, onFieldUpdate]);

  if (sidebar) {
    return (
      <div className={cn("filterLine").mod({ hasChild: !!childFilter })}>
        <div className={cn("filterLine").elem("column").mix("conjunction")}>
          {index === 0 ? (
            <span style={{ fontSize: 12, paddingRight: 5 }}>Where</span>
          ) : (
            <Conjunction index={index} view={view} />
          )}
        </div>

        <div className={cn("filterLine").elem("column").mix("field")}>
          <FilterDropdown
            placeholder="Column"
            defaultValue={filter.filter.id}
            items={availableFilters}
            dropdownClassName={dropdownClassName}
            searchFilter={filterFieldSearchHandler}
            onChange={(selectedValue) => {
              const selected = findSelectedOption(availableFilters, selectedValue);
              if (selected?._isRecent) {
                onFieldUpdate?.(filter.filter.id, filter.operator, filter.value);
                filter.setFilterFromRecent(selectedValue, selected._recentOperator, selected._recentValue);
              } else {
                onFieldSelect?.(filter.filter.id, filter.operator, filter.value);
                filter.setFilterDelayed(selectedValue);
              }
            }}
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

        {!childFilter ? (
          <div className={cn("filterLine").elem("remove")}>
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
          <div className={cn("filterLine").elem("remove")} />
        )}

        {childFilter && (
          <>
            <div className={cn("filterLine").elem("column").mix("conjunction")}>
              <span style={{ fontSize: 12, paddingRight: 5 }}>and</span>
            </div>

            <div className={cn("filterLine").elem("column").mix("field child-field")}>
              <FilterDropdown
                placeholder={childFilter.field.title}
                value={childFilter.field.title}
                items={[{ value: childFilter.field.title, label: childFilter.field.title }]}
                disabled={true}
                onChange={() => {}}
                style={{ minWidth: "80px" }}
              />
            </div>

            <FilterOperation
              filter={childFilter}
              value={childFilter.currentValue}
              operator={childFilter.operator}
              field={childFilter.field}
              disabled={filter.field.disabled}
            />

            <div className={cn("filterLine").elem("remove")}>
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

  return (
    <div className={cn("filterLine").mod({ hasChild: !!childFilter })}>
      <div className={cn("filterLine").elem("column").mix("conjunction")}>
        {index === 0 ? (
          <span style={{ fontSize: 12, paddingRight: 5 }}>Where</span>
        ) : (
          <Conjunction index={index} view={view} />
        )}
      </div>

      <div className={cn("filterLine").elem("column").mix("field")}>
        <FilterDropdown
          placeholder="Column"
          defaultValue={filter.filter.id}
          items={availableFilters}
          width={80}
          dropdownWidth={170}
          dropdownClassName={dropdownClassName}
          searchFilter={filterFieldSearchHandler}
          onChange={(selectedValue) => {
            const selected = findSelectedOption(availableFilters, selectedValue);
            if (selected?._isRecent) {
              onFieldUpdate?.(filter.filter.id, filter.operator, filter.value);
              filter.setFilterFromRecent(selectedValue, selected._recentOperator, selected._recentValue);
            } else {
              onFieldSelect?.(filter.filter.id, filter.operator, filter.value);
              filter.setFilterDelayed(selectedValue);
            }
          }}
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

      {!childFilter && (
        <div className={cn("filterLine").elem("remove")}>
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

      {childFilter && (
        <>
          <div className={cn("filterLine").elem("remove")} />

          <div className={cn("filterLine").elem("column").mix("conjunction")}>
            <span style={{ fontSize: 12, paddingRight: 5 }}>and</span>
          </div>

          <div className={cn("filterLine").elem("column").mix("field child-field")}>
            <FilterDropdown
              placeholder={childFilter.field.title}
              value={childFilter.field.title}
              items={[{ value: childFilter.field.title, label: childFilter.field.title }]}
              disabled={true}
              onChange={() => {}}
            />
          </div>

          <FilterOperation
            filter={childFilter}
            value={childFilter.currentValue}
            operator={childFilter.operator}
            field={childFilter.field}
            disabled={filter.field.disabled}
          />

          <div className={cn("filterLine").elem("remove")}>
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
});
