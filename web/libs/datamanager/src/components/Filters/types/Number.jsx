import { observer } from "mobx-react";
import { isDefined } from "../../../utils/utils";
import { FilterInput } from "../FilterInput";

const valueFilter = (value) => {
  if (isDefined(value)) {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const cleaned = value.replace(/([^\d.,]+)/, "");
      return cleaned ? Number(cleaned) : null;
    }
    return value || null;
  }

  return null;
};

const NumberInput = observer(({ onChange, ...rest }) => {
  return <FilterInput {...rest} type="number" onChange={(value) => onChange(valueFilter(value))} />;
});

const RangeInput = observer(({ schema, value, onChange }) => {
  const min = value?.min ?? null;
  const max = value?.max ?? null;

  const onValueChange = (newValue) => {
    onChange(newValue);
  };

  const onChangeMin = (newValue) => {
    onValueChange({ min: Number(newValue), max });
  };

  const onChangeMax = (newValue) => {
    onValueChange({ min, max: Number(newValue) });
  };

  return (
    <div className="flex w-full min-w-[100px]">
      <NumberInput placeholder="Min" value={min} onChange={onChangeMin} schema={schema} style={{ flex: 1 }} />
      <span style={{ padding: "0 10px" }}>and</span>
      <NumberInput placeholder="Max" value={max} onChange={onChangeMax} schema={schema} style={{ flex: 1 }} />
    </div>
  );
});

export const NumberFilter = [
  {
    key: "equal",
    label: "=",
    valueType: "single",
    input: (props) => <NumberInput {...props} />,
  },
  {
    key: "not_equal",
    label: "≠",
    valueType: "single",
    input: (props) => <NumberInput {...props} />,
  },
  {
    key: "less",
    label: "<",
    valueType: "single",
    input: (props) => <NumberInput {...props} />,
  },
  {
    key: "greater",
    label: ">",
    valueType: "single",
    input: (props) => <NumberInput {...props} />,
  },
  {
    key: "less_or_equal",
    label: "≤",
    valueType: "single",
    input: (props) => <NumberInput {...props} />,
  },
  {
    key: "greater_or_equal",
    label: "≥",
    valueType: "single",
    input: (props) => <NumberInput {...props} />,
  },
  {
    key: "in",
    label: "is between",
    valueType: "range",
    input: (props) => <RangeInput {...props} />,
  },
  {
    key: "not_in",
    label: "not between",
    valueType: "range",
    input: (props) => <RangeInput {...props} />,
  },
];
