import { FilterDropdown } from "../FilterDropdown";

const TRUE_ALIASES = new Set(["true", "yes", "on", "1"]);
const FALSE_ALIASES = new Set(["false", "no", "not", "off", "0"]);

/** Coerce saved values so yes/no dropdowns match `cast_bool_from_str` aliases. */
export const coerceBooleanFilterValue = (value) => {
  if (value == null) return undefined;
  if (typeof value === "boolean") return value;
  if (value === 1) return true;
  if (value === 0) return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (TRUE_ALIASES.has(normalized)) return true;
    if (FALSE_ALIASES.has(normalized)) return false;
  }
  return false;
};

const YesNoInput = (props) => (
  <FilterDropdown
    value={coerceBooleanFilterValue(props.value)}
    onChange={(value) => props.onChange(value)}
    items={[
      { value: true, label: "yes" },
      { value: false, label: "no" },
    ]}
    disabled={props.disabled}
    readOnly={props.readOnly}
  />
);

export const BooleanFilter = [
  {
    key: "equal",
    label: "is",
    valueType: "single",
    input: YesNoInput,
  },
];
