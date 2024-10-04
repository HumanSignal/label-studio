import { FilterDropdown } from "../FilterDropdown";

export const BooleanFilter = [
  {
    key: "equal",
    label: "is",
    valueType: "single",
    input: (props) => (
      <FilterDropdown
        defaultValue={props.value ?? false}
        onChange={(value) => props.onChange(value)}
        items={[
          { value: true, label: "yes" },
          { value: false, label: "no" },
        ]}
      />
    ),
  },
];
