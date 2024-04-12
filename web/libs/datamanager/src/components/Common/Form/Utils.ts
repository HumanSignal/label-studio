import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";

export const useValueTracker = <T>(value: T, defaultValue?: T): [T, Dispatch<SetStateAction<T>>] => {
  const initialValue = useMemo(() => {
    return (value ?? defaultValue ?? "") as T;
  }, [value, defaultValue]);

  const [finalValue, setValue] = useState<T>(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return [finalValue as T, setValue];
};
