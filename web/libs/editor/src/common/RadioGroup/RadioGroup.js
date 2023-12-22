import React, { useState } from 'react';
import { cn } from '../../utils/bem';
import './RadioGroup.styl';

const RadioContext = React.createContext();

export const RadioGroup = ({ size, value, defaultValue, onChange, children, ...props }) => {
  const [currentValue, setCurrentValue] = useState(defaultValue);

  const onRadioChange = e => {
    setCurrentValue(e.target.value);
    onChange?.(e);
  };

  return (
    <RadioContext.Provider
      value={{
        value: value ?? currentValue,
        onChange: onRadioChange,
        defaultValue,
      }}
    >
      <div className={cn('radio-group').mod({ size })} style={props.style}>
        <div className={cn('radio-group').elem('buttons')}>{children}</div>
      </div>
    </RadioContext.Provider>
  );
};

const RadioButton = ({ value, disabled, children }) => {
  const { onChange, value: currentValue } = React.useContext(RadioContext);
  const checked = value === currentValue;

  return (
    <label
      className={cn('radio-group')
        .elem('button')
        .mod({ checked, disabled })}
    >
      <input
        className={cn('radio-group').elem('input')}
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
