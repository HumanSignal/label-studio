import { type FocusEvent, type PointerEvent, useCallback, useRef, useState } from "react";

/**
 * Tracks whether a text field got focus from the keyboard. Browsers report `:focus-visible` for every
 * focused text field, mouse included, so the field cannot rely on it: the outline is reserved for
 * keyboard focus, and pointer focus only darkens the border.
 */
export function useFieldFocus<T extends HTMLElement>(
  onFocus?: (event: FocusEvent<T>) => void,
  onBlur?: (event: FocusEvent<T>) => void,
) {
  const pointer = useRef(false);
  const [focusVisible, setFocusVisible] = useState(false);

  const handlers = {
    // A press focuses the field in the same task, so the flag only needs to live until the next frame.
    // Clearing it there covers presses that move no focus: a second click in a focused field, or the icon.
    onPointerDown: useCallback((_event: PointerEvent) => {
      pointer.current = true;
      requestAnimationFrame(() => {
        pointer.current = false;
      });
    }, []),
    onFocus: useCallback(
      (event: FocusEvent<T>) => {
        setFocusVisible(!pointer.current);
        pointer.current = false;
        onFocus?.(event);
      },
      [onFocus],
    ),
    onBlur: useCallback(
      (event: FocusEvent<T>) => {
        pointer.current = false;
        setFocusVisible(false);
        onBlur?.(event);
      },
      [onBlur],
    ),
  };

  return { focusVisible, handlers };
}
