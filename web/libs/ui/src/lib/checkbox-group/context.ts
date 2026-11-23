import { createContext } from "react";

export type CheckboxGroupContextValue = {
  name?: string;
  values: string[];
  disabled: boolean;
  invalid: boolean;
  toggle: (value: string, checked: boolean) => void;
};

/** Set by CheckboxGroup; a Checkbox with a `value` inside it reads and writes the group's list. */
export const CheckboxGroupContext = createContext<CheckboxGroupContextValue | null>(null);
