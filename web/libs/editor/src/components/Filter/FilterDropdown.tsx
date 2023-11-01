import React, { FC } from 'react';
import { Select } from '../../common/Select/Select';

interface FilterDropdownInterface {
  items: any[];
  onChange: (value: any) => void;
  value?: string | string[] | undefined;
  placeholder?: string;
  defaultValue?: string | string[] | undefined;
  optionRender?:any;
  dataTestid?: string;
  style?:any;
}

const renderOptions = (item: any, index:number) => {
  const value = item.key ?? item.label;
  const key = index;

  return (
    <Select.Option
      key={`${key}`}
      value={value}
      style={{ fontSize: 12 }}
      title={value}
    >
      {item.label}
    </Select.Option>
  );
};

export const FilterDropdown: FC<FilterDropdownInterface> = ({
  placeholder,
  defaultValue,
  items,
  style,
  dataTestid,
  value,
  onChange }) => {

  return (
    <Select
      placeholder={placeholder}
      defaultValue={defaultValue}
      dataTestid={dataTestid}
      value={value}
      style={{
        fontSize: 12,
        width: '100%',
        backgroundColor: '#fafafa',
        ...(style ?? {}),
      }}
      onChange={(value) => onChange(value)}
      size='small'
    >
      {items.map(renderOptions)}
    </Select>
  );
};
