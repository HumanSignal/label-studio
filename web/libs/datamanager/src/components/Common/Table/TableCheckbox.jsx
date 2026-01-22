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
      onChange={() => {
        // Intentionally empty - we handle everything in onClick to capture shiftKey
      }}
      onClick={(e) => {
        // Prevent native checkbox behavior - we control the state via React
        e.preventDefault();
        // Capture shiftKey from the click event and pass to onChange
        // The new checked state is the opposite of current since click toggles
        onChange(!checked, e.shiftKey);
      }}
      ariaLabel={ariaLabel}
    />
  );
};
