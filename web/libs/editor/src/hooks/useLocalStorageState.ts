import { useState } from 'react';

type ValueFromString<T> = (value: string) => T;

type ValueToString = (value: any) => string;

type Options<T> = {
  fromString?: ValueFromString<T>,
  toString?: ValueToString,
}

type StateResult<T> = [T, (value: T) => void];

export const useLocalStorageState = <T>(
  keyName: string,
  defaultValue: T,
  options: Options<T> = {},
): StateResult<T> => {
  const localStorageState = localStorage.getItem(keyName);
  const defaultState = localStorageState
    ? options.fromString?.(localStorageState) ?? (localStorageState as unknown as T)
    : defaultValue;

  const [state, setState] = useState<T>(defaultState);

  const _setInternalState = (value: T) => {
    const newValue = options?.toString?.(value) ?? (value as any).toString();

    localStorage.setItem(keyName, newValue);

    setState(value);
  };

  return [state, _setInternalState];
};
