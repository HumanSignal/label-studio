import React from "react";
import { observer } from "mobx-react";
import { cn } from "../../../utils/bem";
import { Button, Badge, EnterpriseBadge } from "@humansignal/ui";
import { IconClose } from "@humansignal/icons";
import { FilterDropdown } from "../FilterDropdown";
import "./FilterLine.scss";
import { FilterOperation } from "./FilterOperation";
import { Icon } from "../../Common/Icon/Icon";
import { filterFieldSearchHandler, findSelectedOption } from "../filter-helpers";

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
          letterSpacing: "1px",
          lineHeight: "22px",
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
      className={cn("filterLine").elem("selector").toClassName()}
      style={{ display: "flex", alignItems: "center", gap: "8px" }}
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
export const FilterLine = observer(
  ({ filter, availableFilters, index, view, sidebar, dropdownClassName, onFieldSelect, onFieldUpdate }) => {
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
        <div className={cn("filterLine").mod({ hasChild: !!childFilter }).toClassName()}>
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

          {childFilter && (
            <>
              <div className={cn("filterLine").elem("column").mix("conjunction").toClassName()}>
                <span style={{ fontSize: 12, paddingRight: 5 }}>and</span>
              </div>

              <div className={cn("filterLine").elem("column").mix("field child-field").toClassName()}>
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

        {childFilter && (
          <>
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
