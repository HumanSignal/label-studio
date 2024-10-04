import { observer } from "mobx-react";
import { FaCaretDown } from "react-icons/fa";
import { Icon } from "../Common/Icon/Icon";
import { Select } from "../Common/Select/Select";
import { Tag } from "../Common/Tag/Tag";

const TagRender =
  (items) =>
  ({ label, ...rest }) => {
    const color = items.find((el) => el.value === rest.value)?.color;

    return (
      <Tag color={color ?? "#000"} {...rest} size="small" className="filter-data-tag">
        <div className="ant-tag-text">{label}</div>
      </Tag>
    );
  };

const renderOptions = (OptionRender) => (item) => {
  const value = item.value ?? item;
  const label = item.label ?? item.title ?? value;
  const key = `${item.id}-${value}-${label}`;

  if (item.options) {
    return (
      <Select.OptGroup key={key} label={item.title}>
        {item.options.map(renderOptions(OptionRender))}
      </Select.OptGroup>
    );
  }

  return (
    <Select.Option key={`${value}-${label}`} value={value} style={{ fontSize: 12 }} title={label}>
      {OptionRender ? <OptionRender item={item} /> : label}
    </Select.Option>
  );
};

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
  }) => {
    return (
      <Select
        multiple={multiple}
        placeholder={placeholder}
        defaultValue={defaultValue}
        value={value}
        tagRender={TagRender(items)}
        bordered={false}
        style={{
          fontSize: 12,
          width: "100%",
          backgroundColor: disabled ? "none" : "#fafafa",
          ...(multiple ? { padding: 0 } : {}),
          ...(style ?? {}),
        }}
        dropdownStyle={{ minWidth: "fit-content" }}
        onChange={(value) => onChange(outputFormat?.(value) ?? value)}
        disabled={disabled}
        size="small"
        suffixIcon={<Icon icon={FaCaretDown} />}
        listItemHeight={20}
        listHeight={600}
        dropdownClassName={dropdownClassName}
      >
        {items.map(renderOptions(optionRender))}
      </Select>
    );
  },
);
