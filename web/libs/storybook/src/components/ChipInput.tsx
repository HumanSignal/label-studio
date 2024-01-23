import {
  FormEventHandler,
  MouseEventHandler,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { IconCross } from '../assets/icons';
import { Block, Elem } from '../utils/bem';
import * as z from 'zod';
import './ChipInput.scss';

const InputFormats = {
  plain: z.string(),
  email: z.string().email(),
};

export type ChipInputProps = {
  value?: string[];
  className?: string;
  placeholder?: string;
  onChange?: (newValue: string[]) => void;
} & (
  | {
      format?: keyof typeof InputFormats;
    }
  | {
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
    <Elem tag="span" name="chip">
      {value}
      <Elem tag="span" name="closeButton" onClick={onClose}>
        <Elem tag="span" name="close">
          <IconCross />
        </Elem>
      </Elem>
    </Elem>
  );
};

export const ChipInput = ({
  onChange,
  className,
  value,
  placeholder,
  ...restProps
}: ChipInputProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const [selectedValues, setSelectedValues] = useState<string[]>(value ?? []);
  const [currentValue, setCurrentValue] = useState('');

  const inputSchema = useMemo(() => {
    if ('format' in restProps && restProps.format !== undefined) {
      return InputFormats[restProps.format];
    }
    if ('validate' in restProps && restProps.validate !== undefined) {
      return restProps.validate;
    }
    return InputFormats.email;
  }, [restProps]);

  // update values list on upper component on
  // value added or removed
  useEffect(() => {
    onChange?.(selectedValues);
  }, [onChange, selectedValues, selectedValues.length]);

  // resize input to fit text in it up to 100% (in styles)
  // resets after every value added or if field is cleared
  useLayoutEffect(() => {
    if (!inputRef.current || !wrapperRef.current) return;

    const width = inputRef.current.scrollWidth;

    wrapperRef.current.style.width = currentValue ? width + 'px' : '';
  }, [currentValue]);

  // values should be already valid
  const addValues = (values: string[]) => {
    // only unique values
    setSelectedValues((currentValues) => [
      ...new Set([...currentValues, ...values]),
    ]);
  };

  const addValue = (value: string) => {
    const isValid = validate(inputSchema, value);

    setCurrentValue(isValid ? '' : value);
    if (isValid) addValues([value]);
  };

  const onComponentFocus: MouseEventHandler<HTMLElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    inputRef.current?.focus();
  };

  const onInputChange: FormEventHandler<HTMLInputElement> = (e) => {
    const value = e.currentTarget.value;
    const valid = [];
    let current: string | undefined = value;

    if (value.length === 0) return setCurrentValue('');

    // handle paste values
    if (separatorRegexp.test(value)) {
      const values = value.split(separatorRegexp);

      // last (or only) value in list is left in input to edit
      // will be added to list on blur on submit anyway
      current = values.pop();

      for (const value of values) {
        if (validate(inputSchema, value)) {
          valid.push(value);
        } else {
          // invalid values are left in input, so they can be fixed
          current = [value, current].join(',');
        }
      }
      addValues(valid);
    }
    if (current) setCurrentValue(current);
  };

  const onInputBlur: FormEventHandler<HTMLInputElement> = (e) => {
    addValue(e.currentTarget.value);
  };

  const deleteItem = (value: string) =>
    setSelectedValues(
      selectedValues.filter((currentValue) => currentValue !== value)
    );

  return (
    <Block name="chip-input" className={className} onClick={onComponentFocus}>
      <Elem name="content" onClick={onComponentFocus}>
        {selectedValues.filter(Boolean).map((value, index) => (
          <Chip key={index} value={value} onClose={() => deleteItem(value)} />
        ))}

        {/* will be hidden on focus */}
        {selectedValues.length === 0 && !currentValue && placeholder && (
          <Elem tag="span" name="placeholder">
            {placeholder}
          </Elem>
        )}
        <Elem tag="span" name="input" ref={wrapperRef}>
          <input
            ref={inputRef}
            value={currentValue}
            data-testid="chip-input-field"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
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
