import { observer } from "mobx-react";
import { FilterInput } from "../FilterInput";
import { ListInput } from "./ListInput";

const BaseInput = observer(({ value, onChange, placeholder, disabled, readOnly }) => {
  return (
    <FilterInput
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
    />
  );
});

export const StringFilter = [
  {
    key: "contains",
    label: "contains",
    valueType: "single",
    input: (props) => <BaseInput {...props} />,
  },
  {
    key: "not_contains",
    label: "not contains",
    valueType: "single",
    input: (props) => <BaseInput {...props} />,
  },
  {
    key: "regex",
    label: "regex",
    valueType: "single",
    input: (props) => <BaseInput {...props} />,
  },
  {
    key: "equal",
    label: "equal",
    valueType: "single",
    input: (props) => <BaseInput {...props} />,
  },
  {
    key: "not_equal",
    label: "not equal",
    valueType: "single",
    input: (props) => <BaseInput {...props} />,
  },
  // BROS-1203 — list membership. Gated per-column in FilterOperation.jsx.
  {
    key: "in_list",
    label: "is any of",
    valueType: "list",
    input: (props) => <ListInput {...props} type="string" />,
  },
  {
    key: "not_in_list",
    label: "is none of",
    valueType: "list",
    input: (props) => <ListInput {...props} type="string" />,
  },
];
