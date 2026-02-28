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
    onSaveInPlace?.(departingId, departingOperator, departingValue);
    filter.setFilterFromRecent(selectedValue, selected._recentOperator, selected._recentValue);
  } else {
    onSaveOnSwitch?.(departingId, departingOperator, departingValue);
    filter.setFilterDelayed(selectedValue);
  }
}

/**
 * A single filter row: column selector + operator + value input + delete button.
 *
 * Column switch behavior depends on whether the target is a "Recent" item:
 *  - Recent item -> restore full state (column, operator, value) from the stored entry
 *    via setFilterFromRecent; save departing column in-place (no reorder).
 *  - Non-recent item -> save departing column to front of recents (reorder);
 *    apply new column with smart operator/value carry-over via setFilterDelayed.
 *
 * There is NO useEffect auto-saver here. Recents are saved only at explicit,
 * well-defined moments (column switch in onChange) to avoid race conditions
 * between React re-renders and MobX state transitions.
 */
export const FilterLine = observer(
  ({ filter, availableFilters, index, view, sidebar, dropdownClassName, onSaveOnSwitch, onSaveInPlace }) => {
    const childFilter = filter.child_filter;

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
