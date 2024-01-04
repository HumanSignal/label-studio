import React, { Children, cloneElement, createContext, CSSProperties, FC, KeyboardEvent, MouseEvent, ReactChild, ReactFragment, ReactNode, ReactPortal, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BemWithSpecifiContext, cn } from '../../utils/bem';
import { shallowEqualArrays } from 'shallow-equal';
import { isDefined } from '../../utils/utilities';
import { Dropdown } from '../Dropdown/Dropdown';
import './Select.styl';
import { FF_DEV_2669, isFF } from '../../utils/feature-flags';

type FoundChild = ReactChild | ReactFragment | ReactPortal;

interface SelectProps {
  placeholder?: ReactNode;
  value?: string | string[];
  defaultValue?: string | string[];
  size?: 'normal' | 'medium' | 'small';
  style?: CSSProperties;
  variant?: 'base' | 'rounded';
  surface?: 'base' | 'emphasis';
  multiple?: boolean;
  renderMultipleSelected?: (value: string[]) => ReactNode;
  tabIndex?: number;
  onChange?: (newValue?: string | string[]) => void;
  dataTestid?: string;
}

interface SelectComponent<T> extends FC<T> {
  Option: FC;
  OptGroup: FC;
}

interface SelectContextProps {
  multiple?: boolean;
  focused?: string | boolean | null;
  currentValue?: string | string[] | null;
  setCurrentValue: (value?: string | string[]) => void;
}

const SelectContext = createContext<SelectContextProps>({
  multiple: false,
  focused: false,
  currentValue: [],
  setCurrentValue() { },
});

const { Block, Elem } = BemWithSpecifiContext();

const findSelectedChild = (children: ReactNode, value?: string | string[]): FoundChild | null => {
  return Children.toArray(children).reduce<FoundChild | null>((res, child) => {
    if (res !== null) return res;

    const { type, props } = child as any;

    if (type.displayName === 'Select.Option') {
      if (props.value === value) {
        res = child;
      } else if (Array.isArray(value) && value.length === 1) {
        res = findSelectedChild(children, value[0]);
      }
    } else if (type.displayName === 'Select.OptGroup') {
      res = findSelectedChild(props.children, value);
    }

    return res;
  }, null);
};

export const Select: SelectComponent<SelectProps> = ({
  value,
  defaultValue,
  size,
  children,
  style,
  multiple,
  renderMultipleSelected,
  onChange,
  variant,
  surface,
  dataTestid,
  tabIndex = 0,
  placeholder = 'Select value',
}) => {
  const dropdown = useRef<any>();
  const rootRef = useRef();
  const [currentValue, setCurrentValue] = useState(
    multiple
      ? ([] as string[]).concat(value ?? []).flat(10)
      : value,
  );
  const [focused, setFocused] = useState<string | null>();

  const options = Children.toArray(children).filter((child: any) => { // toArray is returning incorrect types which don't have type.displayName or props, but the actual child does.
    return child.type.displayName === 'Select.Option' && !child.props.exclude;
  });

  const setValue = (newValue?: string | string[]) => {
    let updatedValue: string | string[] | undefined = newValue;

    if (multiple && Array.isArray(currentValue) && newValue) {
      if (!Array.isArray(newValue) && currentValue.includes(newValue)) {
        updatedValue = currentValue.filter(v => v !== newValue);
      } else {
        updatedValue = [...currentValue, newValue].flat(10);
      }
    }

    setCurrentValue(updatedValue);
    return updatedValue;
  };

  const context: SelectContextProps = {
    currentValue,
    focused,
    multiple,
    setCurrentValue(value) {
      const newValue = setValue(value);

      onChange?.(newValue);

      if (multiple !== true) {
        dropdown.current?.close();
      }
    },
  };

  const selected = useMemo(() => {
    if (isFF(FF_DEV_2669) && multiple && renderMultipleSelected) {
      return renderMultipleSelected(Array.isArray(currentValue) ? currentValue : [currentValue || '']);
    }
    if (multiple && Array.isArray(currentValue) && currentValue?.length > 1) {
      return <>Multiple values selected</>;
    }

    const foundChild = findSelectedChild(
      children,
      defaultValue ?? currentValue,
    ) as any;

    const result = foundChild?.props?.children;

    return result ? cloneElement(<>{result}</>) : null;
  }, [currentValue, defaultValue, children, value, renderMultipleSelected]);

  const focusItem = (i?: number) => {
    const child = options[i ?? 0] as any;

    setFocused(child.props.value);
  };

  const focusNext = useCallback((direction) => {
    const selectedIndex = options.findIndex((c: any) => c.props.value === focused);

    let nextIndex = selectedIndex === -1 ? 0 : selectedIndex + direction;

    if (nextIndex >= options.length) {
      nextIndex = 0;
    } else if (nextIndex < 0) {
      nextIndex = options.length - 1;
    }

    focusItem(nextIndex);
  }, [focused]);

  const handleKeyboard = (e: KeyboardEvent) => {
    if (document.activeElement !== rootRef.current) {
      return;
    }

    if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
      if (dropdown?.current.visible) {
        focusNext(e.key === 'ArrowDown' ? 1 : -1);
      } else {
        dropdown.current?.open();
        focusItem();
      }
    } else if ((e.code === 'Space' || e.code === 'Enter') && isDefined(focused)) {
      context.setCurrentValue(focused);
    }
  };

  useEffect(() => {
    if (multiple && Array.isArray(value) && Array.isArray(currentValue)) {
      if (shallowEqualArrays(value ?? [], currentValue ?? []) === false) {
        context.setCurrentValue(value?.flat?.(10) ?? []);
      }
    } else if (value !== currentValue) {
      context.setCurrentValue(value);
    }
  }, [value, multiple]);

  return (
    <SelectContext.Provider value={context}>
      <Block ref={rootRef} name="select" mod={{ size, surface }} style={style} tabIndex={tabIndex} onKeyDown={handleKeyboard}>
        <Dropdown.Trigger
          ref={dropdown}
          className={cn('select', { elem: 'dropdown', mod: { variant } }).toClassName()}
          content={<Elem name="list">{children}</Elem>}
          onToggle={(visible: boolean) => {
            if (!visible) setFocused(null);
          }}
        >
          <Elem name="selected" data-testid={dataTestid}>
            <Elem name="value">{selected ?? placeholder}</Elem>
            <Elem name="icon" />
          </Elem>
        </Dropdown.Trigger>
      </Block>
    </SelectContext.Provider>
  );
};
Select.displayName = 'Select';

interface SelectOptionProps {
  value?: string;
  style?: CSSProperties;
  exclude?: boolean;
}

const SelectOption: FC<SelectOptionProps> = ({ value, children, style }) => {
  const { setCurrentValue, multiple, currentValue, focused } = useContext(SelectContext);

  const isSelected = useMemo(() => {
    const option = String(value);

    if (multiple && Array.isArray(currentValue)) {
      return currentValue
        .map(v => String(v))
        .includes(option);
    } else {
      return option === String(currentValue);
    }
  }, [value, focused, currentValue]);

  const isFocused = useMemo(() => {
    return String(value) === String(focused);
  }, [value, focused]);

  return (
    <Elem
      name="option"
      mod={{
        selected: isSelected,
        focused: isFocused,
      }}
      onClick={(e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        setCurrentValue(value);
      }}
      style={style}
    >
      {children}
    </Elem>
  );
};

SelectOption.displayName = 'Select.Option';

interface SelectioOptGroupProps {
  label?: JSX.Element | string;
  style?: CSSProperties;
}

const SelectOptGroup: FC<SelectioOptGroupProps> = ({ label, children, style }) => {
  return (
    <Elem name="optgroup" style={style}>
      <Elem name="optgroup-label">{label}</Elem>
      <Elem name="optgroup-list">{children}</Elem>
    </Elem>
  );
};

SelectOptGroup.displayName = 'Select.OptGroup';

Select.Option = SelectOption;
Select.OptGroup = SelectOptGroup;

