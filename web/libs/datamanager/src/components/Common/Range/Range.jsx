import { forwardRef, useCallback } from "react";
import { Block, Elem } from "../../../utils/bem";
import { isDefined } from "../../../utils/utils";
import { clamp } from "../../../utils/helpers";
import { useValueTracker } from "../Form/Utils";
import "./Range.styl";

const arrayReverse = (array, reverse = false) => {
  return reverse ? [...array].reverse() : array;
};

export const Range = forwardRef(
  (
    {
      name,
      value,
      defaultValue,
      onChange,
      onPositionChange,
      multi = false,
      reverse = false,
      continuous = false,
      min = 0,
      max = 100,
      step = 1,
      size = 120,
      align = "horizontal",
      minIcon,
      maxIcon,
    },
    ref,
  ) => {
    const initialValue = value ?? defaultValue ?? (multi ? [0, 100] : 0);
    const [currentValue, setValue] = useValueTracker(initialValue, defaultValue ?? initialValue);
    let currentValueShadow = currentValue;

    const roundToStep = (value) => {
      return clamp(Math.round(value / step) * step, min, max);
    };

    const updateValue = (value, notify = true, force = false) => {
      const newValue = multi ? value.map(roundToStep) : roundToStep(value);

      onPositionChange?.(newValue);

      if (currentValueShadow !== newValue || force) {
        setValue(newValue);
        if (notify || continuous || force) {
          onChange?.(newValue);
        }
        currentValueShadow = newValue;
      }
    };

    const valueToPercentage = useCallback(
      (value) => {
        const realMax = max - min;
        const realValue = value - min;

        return (realValue / realMax) * 100;
      },
      [min, max],
    );

    const offsetToValue = useCallback(
      (offset) => {
        const realMax = max - min;
        const value = clamp(realMax * (offset / size) + min, min, max);

        return value;
      },
      [min, max, size],
    );

    const increase = useCallback(() => {
      if (multi) return;
      updateValue(currentValue + step);
    }, [step, multi, currentValue]);

    const decrease = useCallback(() => {
      if (multi) return;
      updateValue(currentValue - step);
    }, [step, multi, currentValue]);

    const sizeProperty = align === "horizontal" ? "minWidth" : "minHeight";

    return (
      <Block name="range" mod={{ align }}>
        <input
          ref={ref}
          type="hidden"
          name={name}
          value={currentValue}
          data-type="number"
          onChange={(e) => {
            const value = multi
              ? e.target.value.split(",").map((v) => Number.parseInt(v))
              : Number.parseInt(e.target.value);

            updateValue(value);
          }}
        />

        {reverse
          ? maxIcon && (
              <Elem name="icon" onMouseDown={increase}>
                {maxIcon}
              </Elem>
            )
          : minIcon && (
              <Elem name="icon" onMouseDown={decrease}>
                {minIcon}
              </Elem>
            )}
        <Elem
          name="body"
          mod={{ "with-icon": isDefined(minIcon) || isDefined(maxIcon) }}
          style={{ [sizeProperty]: size }}
        >
          <Elem name="line" />
          <RangeIndicator align={align} reverse={reverse} value={currentValue} valueConvert={valueToPercentage} />
          {multi ? (
            arrayReverse(currentValue, reverse).map((value, i, list) => {
              const index = reverse ? (i === 0 ? 1 : 0) : i;
              const preservedValueIndex = index === 0 ? 1 : 0;

              const getValue = (val) => {
                const result = [];
                const secondValue = currentValue[preservedValueIndex];

                result[index] = index === 0 ? clamp(val, min, secondValue) : clamp(val, secondValue, max);
                result[preservedValueIndex] = currentValue[preservedValueIndex];

                return result;
              };

              return (
                <RangeHandle
                  key={`handle-${index}`}
                  align={align}
                  value={value}
                  values={list}
                  bodySize={size}
                  reverese={reverse}
                  valueConvert={valueToPercentage}
                  offsetConvert={offsetToValue}
                  onChangePosition={(val) => updateValue(getValue(val), false)}
                  onChange={(val) => updateValue(getValue(val), true, true)}
                />
              );
            })
          ) : (
            <RangeHandle
              align={align}
              bodySize={size}
              reverse={reverse}
              value={currentValue}
              valueConvert={valueToPercentage}
              offsetConvert={offsetToValue}
              onChangePosition={(val) => updateValue(val, false)}
              onChange={(val) => updateValue(val, true, true)}
            />
          )}
        </Elem>
        {}
      </Block>
    );
  },
);

const RangeHandle = ({
  value,
  valueConvert,
  offsetConvert,
  onChangePosition,
  onChange,
  align,
  bodySize,
  reverse = false,
}) => {
  const currentOffset = valueConvert(value);
  const offsetProperty = align === "horizontal" ? (reverse ? "right" : "left") : reverse ? "bottom" : "top";
  const mouseProperty = align === "horizontal" ? "pageX" : "pageY";

  const handleMouseDown = (e) => {
    const initialOffset = e[mouseProperty];
    let newValue;

    const handleMouseMove = (e) => {
      const mouseOffset = reverse ? initialOffset - e[mouseProperty] : e[mouseProperty] - initialOffset;
      const offset = clamp(mouseOffset + (currentOffset / 100) * bodySize, 0, bodySize);

      newValue = offsetConvert(offset);

      requestAnimationFrame(() => {
        onChangePosition?.(newValue);
      });
    };

    const handleMouseUp = () => {
      onChange?.(newValue);

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <Elem
      name="range-handle"
      style={{ [offsetProperty]: `${valueConvert(value)}%` }}
      onMouseDownCapture={handleMouseDown}
    />
  );
};

const RangeIndicator = ({ value, valueConvert, align, reverse }) => {
  const style = {};
  const multi = Array.isArray(value);

  if (align === "horizontal") {
    if (multi) {
      style.left = `${valueConvert(value[0])}%`;
      style.right = `${100 - valueConvert(value[1])}%`;
    } else {
      style.left = 0;
      style.right = `${100 - valueConvert(value)}%`;
    }

    if (reverse && !multi) [style.left, style.right] = [style.right, style.left];
  } else if (align === "vertical") {
    if (multi) {
      style.top = `${valueConvert(value[0])}%`;
      style.bottom = `${100 - valueConvert(value[1])}%`;
    } else {
      style.top = 0;
      style.bottom = `${100 - valueConvert(value)}%`;
    }

    if (reverse && !multi) [style.top, style.bottom] = [style.bottom, style.top];
  }

  return <Elem name="indicator" style={style} />;
};
