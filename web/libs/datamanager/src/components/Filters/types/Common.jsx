import { FilterDropdown } from "../FilterDropdown";

export const Common = [
  {
    key: "empty",
    label: "is empty",
    input: (props) => (
      <FilterDropdown
        value={props.value ?? false}
        onChange={(value) => props.onChange(value)}
        items={[
          { value: true, label: "yes" },
          { value: false, label: "no" },
        ]}
      />
    ),
  },
];
