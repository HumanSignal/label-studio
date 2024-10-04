import {
  Children,
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { shallowEqualArrays } from "shallow-equal";
import { BemWithSpecifiContext } from "../../../utils/bem";
import { isDefined } from "../../../utils/utils";
import { Dropdown } from "../Dropdown/Dropdown";
import "./Select.scss";

const SelectContext = createContext();
const { Block, Elem } = BemWithSpecifiContext();

const findSelectedChild = (children, value) => {
  return Children.toArray(children).reduce((res, child) => {
    if (res !== null) return res;

    if (child.type.displayName === "Select.Option") {
      if (child.props.value === value) {
        res = child;
      } else if (Array.isArray(value) && value.length === 1) {
        res = findSelectedChild(children, value[0]);
      }
    } else if (child.type.displayName === "Select.OptGroup") {
      res = findSelectedChild(child.props.children, value);
    }

    return res;
  }, null);
};

export const Select = ({ value, defaultValue, size, children, onChange, style, multiple, tabIndex = 0 }) => {
  const dropdown = useRef();
  const rootRef = useRef();
  const [currentValue, setCurrentValue] = useState(multiple ? [].concat(value ?? []).flat(10) : value);
  const [focused, setFocused] = useState();

  const options = Children.toArray(children);

  const setValue = (newValue) => {
    let updatedValue = newValue;

    if (multiple) {
      if (currentValue.includes(newValue)) {
        updatedValue = currentValue.filter((v) => v !== newValue);
      } else {
        updatedValue = [...currentValue, newValue].flat(10);
      }
    }

    setCurrentValue(updatedValue);
    return updatedValue;
  };

  const context = {
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
    if (multiple && currentValue?.length > 1) {
      return <>Multiple values selected</>;
    }

    const foundChild = findSelectedChild(children, defaultValue ?? currentValue);

    const result = foundChild?.props?.children;

    return result ? cloneElement(<>{result}</>) : null;
  }, [currentValue, defaultValue, children, value]);

  const focusItem = (i) => {
    setFocused(options[i ?? 0].props.value);
  };

  const focusNext = useCallback(
    (direction) => {
      const selectedIndex = options.findIndex((c) => c.props.value === focused);
      let nextIndex = selectedIndex === -1 ? 0 : selectedIndex + direction;

      if (nextIndex >= options.length) {
        nextIndex = 0;
      } else if (nextIndex < 0) {
        nextIndex = options.length - 1;
      }

      focusItem(nextIndex);
    },
    [focused],
  );

  const handleKeyboard = (e) => {
    if (document.activeElement !== rootRef.current) {
      return;
    }

    if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      if (dropdown?.current.visible) {
        focusNext(e.key === "ArrowDown" ? 1 : -1);
      } else {
        dropdown.current?.open();
        focusItem();
      }
    } else if ((e.code === "Space" || e.code === "Enter") && isDefined(focused)) {
      context.setCurrentValue(focused);
    }
  };

  useEffect(() => {
    if (multiple) {
      if (shallowEqualArrays(value ?? [], currentValue ?? []) === false) {
        context.setCurrentValue(value?.flat?.(10) ?? []);
      }
    } else if (value !== currentValue) {
      context.setCurrentValue(value);
    }
  }, [value, multiple]);

  return (
    <SelectContext.Provider value={context}>
      <Block ref={rootRef} name="select-dm" mod={{ size }} style={style} tabIndex={tabIndex} onKeyDown={handleKeyboard}>
        <Dropdown.Trigger
          ref={dropdown}
          style={{ maxHeight: 280, overflow: "auto" }}
          content={<Elem name="list">{children}</Elem>}
          onToggle={(visible) => {
            if (!visible) setFocused(null);
          }}
        >
          <Elem name="selected">
            <Elem name="value">{selected ?? "Select value"}</Elem>
            <Elem name="icon" />
          </Elem>
        </Dropdown.Trigger>
      </Block>
    </SelectContext.Provider>
  );
};
Select.displayName = "Select";

Select.Option = ({ value, children, style }) => {
  const { setCurrentValue, multiple, currentValue, focused } = useContext(SelectContext);

  const isSelected = useMemo(() => {
    const option = String(value);

    if (multiple) {
      return currentValue.map((v) => String(v)).includes(option);
    }
    return option === String(currentValue);
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
      onClick={(e) => {
        e.stopPropagation();
        setCurrentValue(value);
      }}
      style={style}
    >
      {children}
    </Elem>
  );
};
Select.Option.displayName = "Select.Option";

Select.OptGroup = ({ label, children, style }) => {
  return (
    <Elem name="optgroup" style={style}>
      <Elem name="optgroup-label">{label}</Elem>
      <Elem name="optgroup-list">{children}</Elem>
    </Elem>
  );
};
Select.OptGroup.displayName = "Select.OptGroup";
