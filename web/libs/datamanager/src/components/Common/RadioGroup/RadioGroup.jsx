import React from "react";
import { cn } from "../../../utils/bem";
import "./RadioGroup.scss";

const RadioContext = React.createContext();

export const RadioGroup = ({ size, value, onChange, children, ...rest }) => {
  const onRadioChange = (e) => {
    onChange?.(e);
  };

  return (
    <RadioContext.Provider
      value={{
        value,
        onChange: onRadioChange,
      }}
    >
      <div className={cn("radio-group-dm").mod({ size }).toClassName()} {...rest}>
        <div className={cn("radio-group-dm").elem("buttons").toClassName()}>{children}</div>
      </div>
    </RadioContext.Provider>
  );
};

const RadioButton = ({ value, disabled, children, ...props }) => {
  const { onChange, value: currentValue } = React.useContext(RadioContext);
  const checked = value === currentValue;

  return (
    <label {...props} className={cn("radio-group-dm").elem("button").mod({ checked, disabled }).toClassName()}>
      <input
        className={cn("radio-group-dm").elem("input").toClassName()}
        type="radio"
        value={value}
        checked={value === currentValue}
        onChange={onChange}
        disabled={disabled}
      />
      {children}
    </label>
  );
};

RadioGroup.Button = RadioButton;
