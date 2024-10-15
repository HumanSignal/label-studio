import { type MutableRefObject, useCallback, useEffect, useRef } from "react";

/**
 * Creates a shared AbortController, which can be used to abort requests.
 * Automatically cancels the current controller when the component unmounts.
 */
export const useAbortController = (): { controller: MutableRefObject<AbortController>; renew: () => void } => {
  const controller = useRef(new AbortController());

  useEffect(() => {
    return () => {
      controller.current.abort();
    };
  }, []);

  const renew = useCallback(() => {
    controller.current?.abort?.();
    controller.current = new AbortController();
  }, []);

  return { controller, renew };
};
