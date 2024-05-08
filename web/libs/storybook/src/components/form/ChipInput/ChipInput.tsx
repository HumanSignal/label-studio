import {
  type FormEventHandler,
  type MouseEventHandler,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { IconCross } from "../../../assets/icons";
import { Block, Elem } from "../../../utils/bem";
import * as z from "zod";
import "./ChipInput.scss";

const InputFormats = {
  plain: z.string(),
  email: z.string().email(),
};

export type ChipInputProps = {
  /**
   * Array of items to display in the field
   */
  value?: string[];
  /**
   * Custom class
   */
  className?: string;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Allow only unique values
   */
  unique?: boolean;
  /**
   * Callback triggerred whenever the list of current values change
   */
  onChange?: (newValue: string[]) => void;
} & (
  | {
      /**
       * Predefined formats to validate chips against.
       * @default email
       */
      format?: keyof typeof InputFormats;
    }
  | {
      /**
       * Custom validation schema. Uses zod to validate
       */
      validate?: z.ZodString;
    }
);

export type ChipProps = {
  value: string;
  onClose: () => void;
};

const separatorRegexp = /[ ,;]+/;

const validate = (schema: z.ZodString, value: string) => {
  const result = schema.safeParse(value);
  return result.success;
};

const Chip = ({ value, onClose }: ChipProps) => {
  return (
    <Elem tag="span" name="chip" data-testid="chip">
      {value}
      <Elem tag="button" name="remove" data-testid="chip-remove" onClick={onClose}>
        <IconCross />
      </Elem>
    </Elem>
  );
};

/**
 * General purpose Chip input component
 */
export const ChipInput = ({
  onChange,
  className = "",
  value = [],
  placeholder = "Enter emails separated by spaces or commas",
  unique = true,
  ...restProps
}: ChipInputProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const [selectedValues, _setSelectedValues] = useState<string[]>([]);
  const [currentValue, setCurrentValue] = useState("");

  const setSelectedValues = (input: string[] | ((current: string[]) => string[])) => {
    _setSelectedValues((current) => {
      const updated = input instanceof Function ? input(current) : input;
      onChange?.(updated);
      return updated;
    });
  };

  const inputSchema = useMemo(() => {
    if ("format" in restProps && restProps.format !== undefined) {
      return InputFormats[restProps.format];
    }
    if ("validate" in restProps && restProps.validate !== undefined) {
      return restProps.validate;
    }
    return InputFormats.email;
  }, [restProps]);

  const validateValues = (values: string[]) => {
    return values.filter((val) => validate(inputSchema, val));
  };

  useEffect(() => {
    const list = validateValues(value);
    if (list.length > 0) addValues(list);
    // We don't need to track `addValues` here
    // eslint-disable-next-line
  }, []);

  // resize input to fit text in it up to 100% (in styles)
  // resets after every value added or if field is cleared
  useLayoutEffect(() => {
    if (!inputRef.current || !wrapperRef.current) return;

    const width = inputRef.current.scrollWidth;

    wrapperRef.current.style.width = currentValue ? `${width}px` : "";
  }, [currentValue]);

  // values should be already valid
  const addValues = (values: string[]) => {
    setSelectedValues((currentValues) => {
      const updatedValues = unique
        ? [...new Set([...currentValues, ...values])] // only unique values allowed
        : [...currentValues, ...values];
      return updatedValues;
    });
  };

  const addValue = (value: string) => {
    const isValid = validate(inputSchema, value);

    setCurrentValue(isValid ? "" : value);
    if (isValid) addValues([value]);
  };

  const onComponentFocus: MouseEventHandler<HTMLElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    inputRef.current?.focus();
  };

  const onPaste = (e: ClipboardEvent) => {
    if (e.type !== "paste") return;
    if (e.clipboardData === null) return;

    const value = e.clipboardData.getData("text/plain") ?? "";
    const valid = [];
    let current: string | undefined = value;

    const values = value.split(separatorRegexp);

    // last (or only) value in list is left in input to edit
    // will be added to list on blur on submit anyway
    current = values.pop();

    for (const value of values) {
      console.log(value);

      if (validate(inputSchema, value)) {
        valid.push(value);
      } else {
        // invalid values are left in input, so they can be fixed
        current = [value, current].join(",");
      }
    }
    addValues(valid);
    if (current) setCurrentValue(current);
  };

  const onInputChange: FormEventHandler<HTMLInputElement> = (e) => {
    separatorRegexp.lastIndex = 0;
    const value = e.currentTarget.value;
    const current: string | undefined = value;

    if (value.length === 0) return setCurrentValue("");

    if (current) setCurrentValue(current);
  };

  const onInputBlur: FormEventHandler<HTMLInputElement> = (e) => {
    addValue(e.currentTarget.value);
  };

  const deleteItem = (value: string) =>
    setSelectedValues(selectedValues.filter((currentValue) => currentValue !== value));

  // in order to properly simulate paste event we need to subscribe to
  // native one instead of synthetic event from React
  useEffect(() => {
    const el = inputRef?.current;
    el?.addEventListener("paste", onPaste);

    return () => el?.removeEventListener("paste", onPaste);
  });

  return (
    <Block name="chip-input" className={className} onClick={onComponentFocus}>
      <Elem name="content" onClick={onComponentFocus}>
        <span>
          {selectedValues.filter(Boolean).map((value, index) => (
            <Chip key={index} value={value} onClose={() => deleteItem(value)} />
          ))}
        </span>

        {/* will be hidden on focus */}
        {selectedValues.length === 0 && !currentValue && placeholder && (
          <Elem tag="span" name="placeholder" data-testid="placeholder">
            {placeholder}
          </Elem>
        )}
        <Elem tag="span" name="input" ref={wrapperRef}>
          <input
            ref={inputRef}
            value={currentValue}
            data-testid="chip-input-field"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // we are about to submit form, so add value
                addValue(e.currentTarget.value);
              }
              if (separatorRegexp.test(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                addValue(e.currentTarget.value);
              }
            }}
            onInput={onInputChange}
            onBlur={onInputBlur}
          />
        </Elem>
      </Elem>
    </Block>
  );
};
