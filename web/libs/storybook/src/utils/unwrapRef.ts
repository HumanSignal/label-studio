type Ref<T> = React.RefObject<T> | React.MutableRefObject<T> | React.ForwardedRef<T>;

export function unwrapRef<T>(ref: Ref<T>): T | null {
  if (!ref) return null;

  if ("current" in ref) {
    return ref.current;
  }

  return null;
}

export function setRef<T>(ref: React.ForwardedRef<T>, value: T): void {
  if (ref === null) {
    return;
  }

  if (ref instanceof Function) {
    ref(value);
  }

  if ("current" in ref) {
    ref.current = value;
  }
}
