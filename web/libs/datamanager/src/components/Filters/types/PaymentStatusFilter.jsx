import { Select } from "@humansignal/ui";

const BaseInput = ({ schema, value, onChange, placeholder, disabled, readOnly }) => {
  const options = (schema?.items ?? []).map((item) => ({
    value: item.value,
    label: item.title,
    textLabel: item.title,
  }));

  return (
    <Select
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchable={true}
      disabled={disabled}
      readOnly={readOnly}
      onSearch={(query) => options.filter((option) => option.textLabel.toLowerCase().includes(query.toLowerCase()))}
      size="smaller"
      triggerClassName="min-w-[100px]"
    />
  );
};

export const PaymentStatusFilter = [
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
];
