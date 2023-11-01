import { useMemo, useState } from 'react';

type ToggleHookReturn = [
  boolean,
  () => any,
  () => any,
  () => any,
]

/**
 * Handle boolean states conveniently
 * @param {boolean=false} defaultValue
 */
export const useToggle = (defaultValue = false): ToggleHookReturn => {
  const [value, setValue] = useState(defaultValue);
  const [setTrue, setFalse, toggleValue] = useMemo(() => [
    setValue.bind(null, true),
    setValue.bind(null, false),
    () => setValue(value => !value),
  ], []);

  return [value, setTrue, setFalse, toggleValue];
};
