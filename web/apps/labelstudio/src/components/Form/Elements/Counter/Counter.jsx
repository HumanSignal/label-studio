import React from "react";
import { FaMinus, FaPlus } from "react-icons/fa";
import { Block, Elem } from "../../../../utils/bem";
import { Oneof } from "../../../Oneof/Oneof";
import { FormField } from "../../FormField";
import { default as Label } from "../Label/Label";
import "./Counter.scss";

const allowedKeys = ["ArrowUp", "ArrowDown", "Backspace", "Delete", /[0-9]/];

const CounterContext = React.createContext(null);

const Counter = ({ label, className, validate, required, skip, labelProps, ...props }) => {
  const [min, max] = [props.min ?? Number.NEGATIVE_INFINITY, props.max ?? Number.POSITIVE_INFINITY];

  const normalizeValue = (value) => Math.max(min, Math.min(max, value));

  const [currentValue, setCurrentValue] = React.useState(normalizeValue(props.value ?? 0));
  const [focused, setFocused] = React.useState(props.autofocus ?? false);
  const [disabled, setDisabled] = React.useState(props.disabled ?? null);

  const setNewValue = (value) => {
    setCurrentValue(normalizeValue(Number(value)));
  };

  const increase = React.useCallback(() => {
    setNewValue((currentValue ?? 0) + (props.step ?? 1));
  }, [currentValue, props.step]);

  const decrease = React.useCallback(() => {
    setNewValue((currentValue ?? 0) - (props.step ?? 1));
  }, [currentValue, props.step]);

  /**@type {(e: import('react').SyntheticEvent<HTMLInputElement, KeyboardEvent>)} */
  const onInputHandler = (e) => {
    const allowedKey = allowedKeys.find((k) => (k instanceof RegExp ? k.test(e.key) : k === e.key));

    if (!allowedKey && !e.metaKey) e.preventDefault();

    if (allowedKey === "ArrowUp") {
      increase();
      e.preventDefault();
    } else if (allowedKey === "ArrowDown") {
      decrease();
      e.preventDefault();
    }
  };

  /**@type {(e: import('react').SyntheticEvent<HTMLInputElement, ClipboardEvent>)} */
  const onPasteHandler = (e) => {
    const content = e.nativeEvent.clipboardData.getData("text");
    const isNumerical = /([0-9]+)/.test(content);

    if (!isNumerical) e.preventDefault();
  };

  /**@type {(e: import('react').SyntheticEvent<HTMLInputElement>)} */
  const onChangeHandler = (e) => {
    if (e.target.value) {
      setCurrentValue(normalizeValue(Number(e.target.value)));
    } else {
      setCurrentValue("");
    }
    props.onChange?.(e);
  };

  const onFocusHandler = (e) => {
    setFocused(true);
    props.onFocus?.(e);
  };

  const onBlurHandler = (e) => {
    setFocused(false);
    props.onBlur?.(e);
  };

  const onClickHandler = (type, input) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.activeElement?.blur();
    setFocused();
    input.current.focus();
    getSelection().removeAllRanges();
    if (type === "increase") return increase();
    if (type === "decrease") return decrease();
  };

  const field = (
    <FormField
      label={label}
      name={props.name}
      validate={validate}
      required={required}
      setValue={setNewValue}
      skip={skip}
      onDependencyChanged={(f) => {
        if (f.type === "checkbox") setDisabled(!f.checked);
      }}
      {...props}
    >
      {(ref, dep) => {
        const depDisabled = (dep?.type === "checkbox" && dep?.checked === false) || false;
        const fieldDisabled = disabled ?? depDisabled;
        const contextValue = {
          currentValue,
          min,
          max,
          disabled: fieldDisabled,
          ref,
          onClickHandler,
        };

        return (
          <CounterContext.Provider value={contextValue}>
            <Block name="counter" mod={{ focused, disabled: fieldDisabled }} mix={className}>
              <CounterButton type="decrease" />

              <Elem
                ref={ref}
                tag="input"
                name="input"
                type="text"
                disabled={fieldDisabled}
                value={currentValue}
                onKeyDown={onInputHandler}
                onPaste={onPasteHandler}
                onChange={onChangeHandler}
                onFocus={onFocusHandler}
                onBlur={onBlurHandler}
              />

              <CounterButton type="increase" />
            </Block>
          </CounterContext.Provider>
        );
      }}
    </FormField>
  );

  return label ? <Label {...(labelProps ?? {})} text={label} required={required} children={field} /> : field;
};

const CounterButton = ({ type }) => {
  const { currentValue, min, max, disabled, ref, onClickHandler } = React.useContext(CounterContext);

  const compareLimit = type === "increase" ? max : min;

  return (
    <Elem
      tag="a"
      href="#"
      name="btn"
      mod={{
        type,
        disabled: currentValue === compareLimit || disabled,
      }}
      onClick={onClickHandler(type, ref)}
      onMouseDownCapture={(e) => e.preventDefault()}
    >
      <Oneof value={type}>
        <FaMinus case="decrease" />
        <FaPlus case="increase" />
      </Oneof>
    </Elem>
  );
};

export default Counter;
