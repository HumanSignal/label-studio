import { useEffect, useMemo, useState } from "react";

export const useValueTracker = <T = any>(
  value?: T | undefined,
  defaultValue?: T | undefined,
): [T | string, (value: T) => void] => {
  const initialValue = useMemo(() => {
    return value ?? defaultValue ?? "";
  }, [value, defaultValue]);

  const [finalValue, setValue] = useState<T | "">(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return [finalValue, (value: T) => setValue(value)];
};
