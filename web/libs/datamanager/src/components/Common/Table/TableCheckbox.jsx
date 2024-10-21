import { Checkbox } from "@humansignal/ui";

const IndeterminateCheckbox = ({ checked, indeterminate, ...props }) => {
  return <Checkbox indeterminate={indeterminate && !checked} checked={checked} {...props} />;
};

export const TableCheckboxCell = ({ checked, indeterminate, onChange, ariaLabel }) => {
  return (
    <IndeterminateCheckbox
      type="checkbox"
      checked={checked ?? false}
      indeterminate={indeterminate ?? false}
      onChange={(e) => onChange(e.target.checked)}
      ariaLabel={ariaLabel}
    />
  );
};
