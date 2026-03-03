import { observer } from "mobx-react";
import { cn } from "../../../utils/bem";
import { Button } from "@humansignal/ui";
import { IconClose } from "@humansignal/icons";
import { FilterDropdown } from "../FilterDropdown";
import "./FilterLine.scss";
import { FilterOperation } from "./FilterOperation";
import { Icon } from "../../Common/Icon/Icon";
import { ColumnPicker, ColumnPickerOptionContent } from "../../Common/ColumnPicker";

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
 * Column picker for a single filter row.
 * Uses core Select with groupBy and optionRenderer (same as Columns picker).
 */
const FilterColumnPicker = observer(({ filter, availableFilters }) => {
  return (
    <ColumnPicker
      availableFilters={availableFilters}
      value={filter.filter.id ?? null}
      onChange={(id) => filter.setFilterDelayed(id)}
      placeholder={filter.field?.title || "Column"}
      size="small"
      disabled={filter.field.disabled}
      triggerProps={{
        style: { minWidth: 80 },
      }}
      renderSelected={(selectedOptions, placeholder) => {
        const opt = selectedOptions?.[0];
        if (!opt) return <span>{placeholder}</span>;
        return <ColumnPickerOptionContent option={opt} />;
      }}
    />
  );
});

export const FilterLine = observer(({ filter, availableFilters, index, view, sidebar }) => {
  const childFilter = filter.child_filter;

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
          <FilterColumnPicker filter={filter} availableFilters={availableFilters} />
        </div>

        <FilterOperation
          filter={filter}
          value={filter.currentValue}
          operator={filter.operator}
          field={filter.field}
          disabled={filter.field.disabled}
        />

        {/* Column 5: Remove button - only show if no child filter, otherwise empty space */}
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
            {/* Column 1: Conjunction */}
            <div className={cn("filterLine").elem("column").mix("conjunction").toClassName()}>
              <span style={{ fontSize: 12, paddingRight: 5 }}>and</span>
            </div>

            {/* Column 2: Field — disabled, just shows the linked column name */}
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

            {/* Column 3 & 4: Operation and Value */}
            <FilterOperation
              filter={childFilter}
              value={childFilter.currentValue}
              operator={childFilter.operator}
              field={childFilter.field}
              disabled={filter.field.disabled}
            />

            {/* Column 5: Remove */}
            <div className={cn("filterLine").elem("remove").toClassName()}>
              <Button
                look="danger"
                size="smaller"
                onClick={(e) => {
                  e.stopPropagation();
                  filter.delete(); // Remove the main filter (which includes child)
                }}
                icon={<Icon icon={IconClose} size={12} />}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  // Main layout uses parent grid structure - render children as direct grid items
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
        <FilterColumnPicker filter={filter} availableFilters={availableFilters} />
      </div>

      <FilterOperation
        filter={filter}
        value={filter.currentValue}
        operator={filter.operator}
        field={filter.field}
        disabled={filter.field.disabled}
      />

      {/* Only show remove button if there's no child filter, or show it on the last column of the main filter */}
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

          {/* Disabled field showing the linked column name */}
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

          {/* Show remove button on child filter row - removes the entire filter group */}
          <div className={cn("filterLine").elem("remove").toClassName()}>
            <Button
              look="string"
              size="small"
              style={{ border: "none" }}
              onClick={(e) => {
                e.stopPropagation();
                filter.delete(); // Remove the main filter (which includes child)
              }}
              icon={<Icon icon={IconClose} size={12} />}
            />
          </div>
        </>
      )}
    </div>
  );
});
