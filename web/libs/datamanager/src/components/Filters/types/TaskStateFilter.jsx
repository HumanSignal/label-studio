import { observer } from "mobx-react";
import { Select, Badge } from "@humansignal/ui";
import { stateLabels, STATE_COLORS, colorToClasses } from "../../CellViews/TaskState";
import { useMemo } from "react";

const BaseInput = observer(({ value, onChange, placeholder }) => {
  const options = useMemo(() => {
    return Object.keys(stateLabels).map((key) => {
      const textLabel = stateLabels[key];
      const color = STATE_COLORS[key] || "grey";
      const colorClasses = colorToClasses[color];

      return {
        value: key,
        textLabel,
        label: <Badge className={colorClasses}>{textLabel}</Badge>,
      };
    });
  }, []);

  return (
    <Select
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchable={true}
      onSearch={(value) => {
        // Search against textLabel which should match any of the stateLabels values
        return options.filter((option) => option.textLabel.toLowerCase().includes(value.toLowerCase()));
      }}
      selectedValueRenderer={(option) => {
        if (!option) return null;

        const color = STATE_COLORS[option.value] || "grey";
        const colorClasses = colorToClasses[color];

        return <Badge className={`${colorClasses} h-[18px] text-[12px]`}>{option.textLabel}</Badge>;
      }}
      size="small"
      triggerClassName="min-w-[100px]"
    />
  );
});

export const TaskStateFilter = [
  {
    key: "contains",
    label: "contains",
    valueType: "list",
    input: (props) => <BaseInput {...props} />,
  },
  {
    key: "not_contains",
    label: "not contains",
    valueType: "list",
    input: (props) => <BaseInput {...props} />,
  },
];
