import { observer } from "mobx-react";
import { Select, Badge } from "@humansignal/ui";
import { stateRegistry, formatStateName, getStateColorClass } from "@humansignal/app-common";
import { useMemo } from "react";

const BaseInput = observer(({ value, onChange, placeholder }) => {
  const options = useMemo(() => {
    return stateRegistry.getStatesByEntityType("task").map((state) => {
      const textLabel = formatStateName(state);
      const colorClasses = getStateColorClass(state);

      return {
        value: state,
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
        // Search against textLabel which should match any of the state labels
        return options.filter((option) => option.textLabel.toLowerCase().includes(value.toLowerCase()));
      }}
      selectedValueRenderer={(option) => {
        if (!option) return null;

        const colorClasses = getStateColorClass(option.value);

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
