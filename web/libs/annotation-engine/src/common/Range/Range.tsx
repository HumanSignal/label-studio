import { CSSProperties, FC, MouseEvent as RMouseEvent, useCallback } from 'react';
import { Block, Elem } from '../../utils/bem';
import { clamp, isDefined } from '../../utils/utilities';
import { useValueTracker } from '../Utils/useValueTracker';
import './Range.styl';

type RangeAlignment = 'horizontal' | 'vertical';

type RangeValueType = number | number[] | string

export interface RangeProps {
  value?: RangeValueType;
  defaultValue?: number;
  multi?: boolean;
  reverse?: boolean;
  continuous?: boolean;
  min?: number;
  max?: number;
  step?: number;
  size?: number;
  align?: RangeAlignment;
  minIcon?: JSX.Element;
  maxIcon?: JSX.Element;
  resetValue?: RangeValueType;
  onChange?: (value: RangeValueType) => void;
  onMinIconClick?: (value: RangeValueType) => void;
  onMaxIconClick?: (value: RangeValueType) => void;
}

const arrayReverse = <T extends any[] = any[]>(array: T, reverse=false) => {
  return reverse ? [...array].reverse() : array;
};

export const Range: FC<RangeProps> = ({
  value,
  defaultValue,
  multi=false,
  reverse=false,
  continuous=false,
  min=0,
  max=100,
  step=1,
  size=120,
  align='horizontal',
  resetValue,
  minIcon,
  maxIcon,
  onChange,
  onMinIconClick,
  onMaxIconClick,
}) => {
  const initialValue = value ?? defaultValue ?? (multi ? [0, 100] : 0);

  const [currentValue, setValue] = useValueTracker<RangeValueType>(
    initialValue,
    defaultValue ?? initialValue,
  );

  let currentValueShadow = currentValue;

  const isMultiArray = multi && Array.isArray(currentValue);

  const roundToStep = (value: number) => {
    return clamp(Math.round(value / step) * step, min, max);
  };

  const updateValue = (value: RangeValueType, notify = true, force = false) => {
    const newValue = (multi && Array.isArray(value))
      ? value.map(roundToStep)
      : roundToStep(value as number);

    if (currentValueShadow !== newValue || force) {
      setValue(newValue);
      if (notify || continuous || force) onChange?.(value);
      currentValueShadow = newValue;
    }
  };

  const valueToPercentage = useCallback((value) => {
    const realMax = max - min;
    const realValue = value - min;

    return realValue / realMax * 100;
  }, [min, max]);

  const offsetToValue = useCallback((offset) => {
    const realMax = max - min;
    const value = clamp((realMax * (offset / size)) + min, min, max);

    return value;
  }, [min, max, size]);

  const increase = useCallback(() => {
    if (multi) return;
    if (onMaxIconClick) return onMaxIconClick(currentValue);
    updateValue(currentValue as number + step);
  }, [step, multi, currentValue]);

  const decrease = useCallback(() => {
    if (multi) return;
    if (onMinIconClick) return onMinIconClick(currentValue);
    updateValue(currentValue as number - step);
  }, [step, multi, currentValue]);

  const onClick = useCallback((e: RMouseEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const isHorizontal = align === 'horizontal';

    // Extract all the values regarding current orientation
    const directionDimension = isHorizontal ? rect.width : rect.height;
    const parentOffset = isHorizontal ? rect.left : rect.top;
    const mousePosition = isHorizontal ? e.clientX : e.clientY;

    // Calculate relative offset
    const offset = clamp(mousePosition - parentOffset, 0, directionDimension);
    const position = offset / directionDimension;
    let newValue = ((max - min) * position) + min;

    if (reverse) newValue = max - newValue;

    if (multi && Array.isArray(currentValue)) {
      const valueIndex = position > 0.5 ? 1 : 0;
      const patch = [...currentValue];

      patch[valueIndex] = newValue;

      updateValue(patch, true, false);
    } else {
      updateValue(newValue, true, false);
    }
  }, [align, min, max, reverse, currentValue]);

  const sizeProperty = align === 'horizontal' ? 'minWidth' : 'minHeight';

  return (
    <Block name="range" mod={{ align }} style={{ [sizeProperty]: size }}>
      {reverse ? (
        maxIcon && <Elem name="icon" onMouseDown={increase}>{maxIcon}</Elem>
      ) : (
        minIcon && <Elem name="icon" onMouseDown={decrease}>{minIcon}</Elem>
      )}
      <Elem name="body" onClick={onClick}>
        <Elem name="line"/>
        <RangeIndicator
          align={align}
          reverse={reverse}
          value={currentValue}
          valueConvert={valueToPercentage}
        />
        {isMultiArray ? arrayReverse(currentValue, reverse).map((value, i) => {
          const index = reverse ? i === 0 ? 1 : 0 : i;
          const preservedValueIndex = index === 0 ? 1 : 0;

          const getValue = (val: number) => {
            const result = [];
            const secondValue = currentValue[preservedValueIndex];

            result[index] = index === 0
              ? clamp(val, min, secondValue)
              : clamp(val, secondValue, max);
            result[preservedValueIndex] = currentValue[preservedValueIndex];

            return result;
          };

          return (
            <RangeHandle
              key={`handle-${index}`}
              align={align}
              value={value}
              bodySize={size}
              reverse={reverse}
              resetValue={(resetValue as number[])[index]}
              valueConvert={valueToPercentage}
              offsetConvert={offsetToValue}
              onChangePosition={(val) => updateValue(getValue(val), false)}
              onChange={(val) => updateValue(getValue(val), true, true)}
            />

          );
        }) : (
          <RangeHandle
            align={align}
            bodySize={size}
            reverse={reverse}
            value={currentValue}
            valueConvert={valueToPercentage}
            offsetConvert={offsetToValue}
            resetValue={resetValue as number}
            onChangePosition={(val) => updateValue(val, false)}
            onChange={(val) => updateValue(val, true, true)}
          />
        )}
      </Elem>
      {reverse ? (
        minIcon && <Elem name="icon" onMouseDown={decrease}>{minIcon}</Elem>
      ) : (
        maxIcon && <Elem name="icon" onMouseDown={increase}>{maxIcon}</Elem>
      )}
    </Block>
  );
};

export interface RangeHandleProps {
  align: RangeAlignment;
  bodySize: number;
  reverse: boolean;
  resetValue: number;
  value: RangeValueType;
  valueConvert: (value: RangeValueType) => number;
  offsetConvert: (value: RangeValueType) => number;
  onChangePosition: (value: number) => void;
  onChange: (value: number) => void;
}

const RangeHandle: FC<RangeHandleProps> = ({
  value,
  valueConvert,
  offsetConvert,
  onChangePosition,
  onChange,
  resetValue,
  align,
  bodySize,
  reverse = false,
}) => {
  const currentOffset = valueConvert(value);
  const offsetProperty = align === 'horizontal'
    ? reverse ? 'right' : 'left'
    : reverse ? 'bottom' : 'top';
  const mouseProperty = align === 'horizontal' ? 'pageX' : 'pageY';

  const handleMouseDown = (e: MouseEvent) => {
    e.stopPropagation();

    const initialOffset = e[mouseProperty];
    let newValue: number;

    const handleMouseMove = (e: MouseEvent) => {
      const mouseOffset = reverse
        ? initialOffset - e[mouseProperty]
        : e[mouseProperty] - initialOffset;
      const offset = clamp(mouseOffset + (currentOffset / 100 * bodySize), 0, bodySize);

      newValue = offsetConvert(offset);

      requestAnimationFrame(() => {
        onChangePosition?.(newValue);
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.stopPropagation();

      if (isDefined(newValue)) onChange?.(newValue);

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = () => {
    if (isDefined(resetValue)) {
      onChange?.(resetValue);
    }
  };

  return (
    <Elem
      name="range-handle"
      style={{ [offsetProperty]: `${valueConvert(value)}%` }}
      onMouseDownCapture={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    />
  );
};

export interface RangeIndicatorProps {
  value: RangeValueType;
  valueConvert: (value: RangeValueType) => number;
  align: RangeAlignment;
  reverse: boolean;
}

const RangeIndicator: FC<RangeIndicatorProps> = ({
  value,
  valueConvert,
  align,
  reverse,
}) => {
  const style: CSSProperties = {};
  const multi = Array.isArray(value);

  if (align === 'horizontal') {
    if (multi) {
      style.left = `${valueConvert(value[0])}%`;
      style.right = `${100 - valueConvert(value[1])}%`;
    } else {
      style.left = 0;
      style.right = `${100 - valueConvert(value)}%`;
    }

    if (reverse && !multi) [style.left, style.right] = [style.right, style.left];
  } else if (align === 'vertical') {
    if (multi) {
      style.top = `${valueConvert(value[0])}%`;
      style.bottom = `${100 - valueConvert(value[1])}%`;
    } else {
      style.top = 0;
      style.bottom = `${100 - valueConvert(value)}%`;
    }

    if (reverse && !multi) [style.top, style.bottom] = [style.bottom, style.top];
  }

  return (
    <Elem name="indicator" style={style}/>
  );
};
