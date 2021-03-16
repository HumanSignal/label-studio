import React from "react";
import { Label } from "..";
import { BemWithSpecifiContext } from "../../../../utils/bem";
import { FormField } from "../../FormField";
import "./RadioGroup.styl";

const RadioContext = React.createContext();
const {Block, Elem} = BemWithSpecifiContext();

export const RadioGroup = ({label, className, validate, required, skip, labelProps, size, value, onChange, children, ...props }) => {
  const [currentValue, setCurrentValue] = React.useState(value);

  const onRadioChange = (value) => {
    setCurrentValue(value);
    onChange?.(value);
  };

  const field = (
    <FormField
      name={props.name}
      label={label}
      validate={validate}
      required={required}
      skip={skip}
      setValue={value => setCurrentValue(value)}
      {...props}
    >
      {ref => (
        <RadioContext.Provider
          value={{
            value: currentValue,
            onChange: onRadioChange,
            setValue: setCurrentValue,
          }}
        >
          <Block name="radio-group" mod={{size}} mix={className}>
            <input ref={ref} name={props.name} type="hidden" defaultValue={currentValue}/>
            <Elem name="buttons">
              {children}
            </Elem>
          </Block>
        </RadioContext.Provider>
      )}
    </FormField>
  );

  return label ? <Label {...(labelProps ?? {})} text={label} required={required}>{field}</Label> : field;
};

const RadioButton = ({ value, disabled, children, ...props }) => {
  const { onChange, setValue, value: currentValue } = React.useContext(RadioContext);
  const checked = value === currentValue;

  const clickHandler = React.useCallback(() => {
    onChange(value);
  }, [value]);

  React.useEffect(() => {
    if (props.checked) setValue(value);
  }, [props.checked]);

  return (
    <Elem name="button" mod={{ checked, disabled }} onClick={clickHandler}>
      {children}
    </Elem>
  );
};

RadioGroup.Button = RadioButton;
