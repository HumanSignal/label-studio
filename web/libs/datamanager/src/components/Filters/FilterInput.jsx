import React from "react";
import Input from "../Common/Input/Input";

export const FilterInput = ({ value, type, onChange, placeholder, schema, style }) => {
  const inputRef = React.useRef();
  const onChangeHandler = () => {
    const value = inputRef.current?.value ?? inputRef.current?.input?.value;

    onChange(value);
  };

  return (
    <Input
      size="small"
      type={type}
      value={value ?? ""}
      ref={inputRef}
      placeholder={placeholder}
      onChange={onChangeHandler}
      style={style}
      {...(schema ?? {})}
    />
  );
};
