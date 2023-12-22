import React, { FC } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Input from '../../common/Input/Input';

interface FilterInputInterface {
  value: string | number | undefined;
  type: string;
  onChange: (value: any) => void;
  placeholder?: string;
  schema?: any;
  style?: any;
}

export const FilterInput: FC<FilterInputInterface> = ({
  value,
  type,
  onChange,
  placeholder,
  schema,
  style,
}) => {
  const inputRef = React.useRef();
  const onChangeHandler = () => {
    const value = inputRef.current?.value ?? inputRef.current?.input?.value;

    onChange(value);
  };

  return (
    <Input
      size='small'
      type={type}
      value={value ?? ''}
      ref={inputRef}
      placeholder={placeholder}
      data-testid={'filter-input'}
      onChange={onChangeHandler}
      style={style}
      {...(schema ?? {})}
    />
  );
};
