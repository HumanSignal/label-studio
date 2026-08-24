import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { PlusIcon, MinusIcon } from "@humansignal/icons";
import { cn } from "../../../../../utils/bem";
import { isDefined } from "../../../../../utils/utils";
import { Oneof } from "../../../Oneof/Oneof";
import { FormField } from "../../FormField";
import { useValueTracker } from "../../Utils";
import { default as Label } from "../Label/Label";
import "./Counter.prefix.css";

const allowedKeys = ["ArrowUp", "ArrowDown", "Backspace", "Delete", /[0-9]/];

const CounterContext = createContext(null);

const Counter = ({
  label,
  className,
  validate,
  required,
  skip,
  labelProps,
  style,
  editable,
  postfix,
  defaultValue,
  increaseAriaLabel = "Increase value",
  decreaseAriaLabel = "Decrease value",
  ...props
}) => {
  const [min, max] = [props.min ?? Number.NEGATIVE_INFINITY, props.max ?? Number.POSITIVE_INFINITY];

  const normalizeValue = (value) => {
    const val = Number(String(value).replace(` ${postfix}`, ""));

    return Math.max(min, Math.min(max, val));
  };
  const [value] = useValueTracker(props.value, defaultValue);

  const [currentValue, setCurrentValue] = useState(normalizeValue(value ?? 0));

  const [focused, setFocused] = useState(props.autofocus ?? false);
  const [disabled, setDisabled] = useState(props.disabled ?? null);

  const setNewValue = (value) => {
    const newValue = normalizeValue(Number(value));

    setCurrentValue(newValue);
    return newValue;
  };

  const increase = useCallback(() => {
    return setNewValue((currentValue ?? 0) + (props.step ?? 1));
  }, [currentValue, props.step]);

  const decrease = useCallback(() => {
    return setNewValue((currentValue ?? 0) - (props.step ?? 1));
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

    const value = type === "increase" ? increase() : type === "decrease" ? decrease() : 0;

    if (isDefined(input.current)) {
      input.current.value = value;
    }

    props.onChange?.({ target: input.current, type: "change" });
  };

  useEffect(() => {
    if (isDefined(value)) {
      setCurrentValue(normalizeValue(Number(value)));
    } else {
      setCurrentValue("");
    }
  }, [value]);

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
      {({ ref, dependency }) => {
        const depDisabled = (dependency?.type === "checkbox" && dependency?.checked === false) || false;
        const fieldDisabled = disabled ?? depDisabled;
        const contextValue = {
          currentValue,
          min,
          max,
          disabled: fieldDisabled,
          ref,
          onClickHandler,
          increaseAriaLabel,
          decreaseAriaLabel,
        };
        const displayValue = [currentValue];

        if (isDefined(postfix)) displayValue.push(postfix);

        return (
          <CounterContext.Provider value={contextValue}>
            <div
              className={cn("counter").mod({ focused, disabled: fieldDisabled }).mix(className).toClassName()}
              style={style}
            >
              <CounterButton type="decrease" />

              <input
                ref={ref}
                className={cn("counter").elem("input").mod({ withPostfix: !!postfix }).toClassName()}
                type="text"
                readOnly={editable === false}
                disabled={fieldDisabled}
                value={currentValue}
                onKeyDown={onInputHandler}
                onPaste={onPasteHandler}
                onChange={onChangeHandler}
                onFocus={onFocusHandler}
                onBlur={onBlurHandler}
              />

              {postfix && (
                <div className={cn("counter").elem("input").mod({ under: true, withPostfix: !!postfix }).toClassName()}>
                  {displayValue.join(" ")}
                </div>
              )}

              <CounterButton type="increase" />
            </div>
          </CounterContext.Provider>
        );
      }}
    </FormField>
  );

  return label ? <Label {...(labelProps ?? {})} text={label} required={required} children={field} /> : field;
};

const CounterButton = ({ type }) => {
  const { currentValue, min, max, disabled, ref, onClickHandler, increaseAriaLabel, decreaseAriaLabel } =
    useContext(CounterContext);

  const compareLimit = type === "increase" ? max : min;
  const isDisabled = currentValue === compareLimit || disabled;

  return (
    // biome-ignore lint/a11y/useValidAnchor: anchor used for styling purposes, todo after bem migration
    <a
      href="#"
      aria-label={type === "increase" ? increaseAriaLabel : decreaseAriaLabel}
      aria-disabled={isDisabled || undefined}
      className={cn("counter")
        .elem("btn")
        .mod({
          type,
          disabled: isDisabled,
        })
        .toClassName()}
      onClick={onClickHandler(type, ref)}
      onMouseDownCapture={(e) => e.preventDefault()}
      data-testid={`counter-${type}`}
    >
      <Oneof value={type}>
        <MinusIcon size={16} weight="bold" case="decrease" />
        <PlusIcon size={16} weight="bold" case="increase" />
      </Oneof>
    </a>
  );
};

export default Counter;
