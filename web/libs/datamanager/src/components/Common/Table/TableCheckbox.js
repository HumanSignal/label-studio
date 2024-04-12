import { observer } from "mobx-react";
import React from "react";
import { Checkbox } from "../Checkbox/Checkbox";

const IndeterminateCheckbox = observer(({ checked, indeterminate, ...props }) => {
  return <Checkbox indeterminate={indeterminate && !checked} checked={checked} {...props} />;
});

export const TableCheckboxCell = observer(({ checked, indeterminate, onChange }) => {
  return (
    <IndeterminateCheckbox
      type="checkbox"
      checked={checked ?? false}
      indeterminate={indeterminate ?? false}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
});
