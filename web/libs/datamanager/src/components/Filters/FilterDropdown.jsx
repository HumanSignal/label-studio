import { observer } from "mobx-react";
import { Select } from "../Common/Form";
import { useCallback, useMemo } from "react";

export const FilterDropdown = observer(
  ({
    placeholder,
    defaultValue,
    items,
    style,
    disabled,
    onChange,
    multiple,
    value,
    optionRender,
    dropdownClassName,
    outputFormat,
    searchFilter,
  }) => {
    const parseItems = useCallback(
      (item) => {
        const OptionVisuals =
          optionRender ??
          (() => {
            return <>{item?.label ?? item?.title ?? item?.value ?? item}</>;
          });
        const option =
          typeof item === "string" || typeof item === "number"
            ? { label: <OptionVisuals item={item} />, value: item, original: item }
            : {
                ...item,
                label:
                  (optionRender && item?.original) || item?.original?.field?.parent ? (
                    <OptionVisuals item={item} />
                  ) : (
                    (item?.title ?? item?.label ?? item?.name)
                  ),
                value: item?.value ?? item,
                disabled: item?.disabled ?? false,
                children: item?.options?.map(parseItems),
              };
        return option;
      },
      [optionRender],
    );
    const options = useMemo(() => items.map(parseItems), [items, parseItems]);

    return (
      <Select
        multiple={multiple}
        placeholder={placeholder}
        defaultValue={defaultValue}
        value={value}
        onChange={(value) => onChange(outputFormat?.(value) ?? value)}
        disabled={disabled}
        size="small"
        options={options}
        searchable={true}
        triggerClassName="whitespace-nowrap"
        searchFilter={searchFilter}
        isVirtualList={true}
        contentClassName={`${dropdownClassName || ""} filter-dropdown-content`.trim()}
      />
    );
  },
);
