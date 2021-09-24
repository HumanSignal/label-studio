import { useEffect, useMemo, useState } from "react";

export const useValueTracker = (value, defaultValue) => {
  const initialValue = useMemo(() => {
    return defaultValue ?? value ?? "";
  }, [value, defaultValue]);

  const [finalValue, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return [finalValue, setValue];
};
