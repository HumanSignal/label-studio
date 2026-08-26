import { observer } from "mobx-react";
import { FilterDropdown } from "../FilterDropdown";
import { useMemo } from "react";
// import { Common } from "./Common";

function defaultFilterItems(items) {
  return items?.toJSON ? items.toJSON() : items;
}

export const VariantSelect = observer(
  ({ filter, schema, onChange, multiple, value, placeholder, disabled, readOnly }) => {
    if (!schema) return <></>;
    const { items } = schema;

    const selectedValue = useMemo(() => {
      if (!multiple) {
        return Array.isArray(value) ? value[0] : value;
      }
      return Array.isArray(value) ? value : (value ?? []);
    }, [multiple, value]);
    const filterItems = filter.cellView?.filterItems || defaultFilterItems;
    const FilterItem = filter.cellView?.FilterItem;
    return (
      <FilterDropdown
        items={filterItems(items)}
        value={selectedValue}
        multiple={multiple}
        optionRender={FilterItem}
        outputFormat={
          multiple
            ? (value) => {
                return value ? [].concat(value) : [];
              }
            : undefined
        }
        searchFilter={filter.cellView?.searchFilter}
        onChange={(value) => onChange(value)}
        placeholder={placeholder ?? "Select value"}
        disabled={disabled}
        readOnly={readOnly}
      />
    );
  },
);

export const ListFilter = [
  {
    key: "contains",
    label: "contains",
    valueType: "single",
    input: (props) => <VariantSelect {...props} multiple={props.schema?.multiple} />,
  },
  {
    key: "not_contains",
    label: "not contains",
    valueType: "single",
    input: (props) => <VariantSelect {...props} multiple={props.schema?.multiple} />,
  },
  // ... Common,
];
