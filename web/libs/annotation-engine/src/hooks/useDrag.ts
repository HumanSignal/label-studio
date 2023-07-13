import { MutableRefObject, useEffect } from 'react';

interface Handlers<T extends HTMLElement = HTMLElement, D = any> {
  elementRef: MutableRefObject<T | undefined>;
  disabled?: boolean;
  capture?: boolean;
  passive?: boolean;
  onMouseDown?: (e: MouseEvent) => D;
  onMouseMove?: (e: MouseEvent, data?: D) => void;
  onMouseUp?: (e: MouseEvent, data?: D) => void;
  onUnmount?: () => void;
}

export const useDrag = <EL extends HTMLElement = HTMLElement, D = any>(options: Handlers<EL, D>, deps: any[] = []) => {
  useEffect(() => {
    const eventOptions = {
      capture: options.capture,
      passive: options.passive,
    };
    const element = options.elementRef.current;

    const onMouseDown = (e: MouseEvent) => {
      if (options.disabled) return;
      if (e.defaultPrevented) return;

      const result = options.onMouseDown?.(e);

      const onMouseMove = (e: MouseEvent) => {
        options.onMouseMove?.(e, result);
      };

      const onMouseUp = (e: MouseEvent) => {
        document.removeEventListener('mousemove', onMouseMove, eventOptions);
        document.removeEventListener('mouseup', onMouseUp);
        options.onMouseUp?.(e, result);
      };

      document.addEventListener('mousemove', onMouseMove, eventOptions);
      document.addEventListener('mouseup', onMouseUp);
    };

    element?.addEventListener('mousedown', onMouseDown);

    return () => {
      options.onUnmount?.();
      element?.removeEventListener('mousedown', onMouseDown);
    };
  }, deps);
};
