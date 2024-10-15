import { useCallback, useEffect, useRef } from "react";
import { useHistory } from "react-router";

/**
 * @param continueCallback - callback to call when the user wants to leave the page
 * @param cancelCallback - callback to call when the user wants to stay on the page
 */
export type LeaveBlockerCallbacks = {
  continueCallback?: () => void;
  cancelCallback?: () => void;
};

/**
 * @param active - should the blocker be active or not. Set false to disable the blocker
 * @param onBeforeBlock - callback to check if we should block the page. If there is a need for a predicate to block the page
 * @param onBlock - callback to call when we should block the page. It Allows using custom modals to ask the user if they want to leave the page
 */
export type LeaveBlockerProps = {
  active: boolean;
  onBeforeBlock?: () => boolean;
  onBlock?: (callbacks: LeaveBlockerCallbacks) => void;
};

// Use `data-leave` attribute to mark the button that should be used to leave the current view (without changing url) to be able to block this action
const LEAVE_BUTTON_SELECTOR = "[data-leave]";
export const LEAVE_BLOCKER_KEY: string = "LEAVE_BLOCKER";

type LeaveBlockerCallback = {
  current?: (shouldLeave: boolean) => void;
};
// This is used to avoid problems with blocking the page API in react-router v5
// Callback is stored in a ref and called when the user decides to leave the page (this will unblock history.block for the current transition)
export const leaveBlockerCallback: LeaveBlockerCallback = {
  current: undefined,
};
/**
 * Block leaving the page if there is a reason to do so.
 * It includes
 * - blocking the action of a tab/window closing,
 * - blocking going through the browser history,
 * - blocking clicking on the button with `data-leave` attribute, which is supposed to lead to leave the current view
 */
export const LeaveBlocker = ({ active = true, onBeforeBlock, onBlock }: LeaveBlockerProps) => {
  // This will make active value available in the callbacks without the need to update the callback every time the active value changes
  const isActive = useRef(active);
  isActive.current = active;
  const history = useHistory();
  // This is a way to block the page on a tab/window closing
  // It will be done with browser standard API and confirm dialog
  const beforeUnloadHandler = useCallback(
    (e: BeforeUnloadEvent) => {
      if (!isActive.current) return;
      const shouldBlock = onBeforeBlock ? onBeforeBlock() : true;
      if (!shouldBlock) return true;
      e.preventDefault();
      e.returnValue = false;
      return false;
    },
    [onBeforeBlock],
  );
  const shouldSkipClickChecks = useRef(false);
  // This is a way to block the view (but not a page) change by clicking on the button
  // It obligates us to use `data-leave` attribute on the button that should be used to leave the current view
  const beforeLeaveClickHandler = useCallback(
    (e: MouseEvent) => {
      if (!isActive.current) return;
      // It allows to skip the check if the user chooses to leave the page
      if (shouldSkipClickChecks.current) return;
      const eventTarget = e.target as HTMLElement;
      const target = eventTarget?.matches?.(LEAVE_BUTTON_SELECTOR)
        ? e.target
        : eventTarget?.closest(LEAVE_BUTTON_SELECTOR);

      if (target) {
        const shouldBlock = onBeforeBlock ? onBeforeBlock() : true;
        if (!shouldBlock) return;
        e.preventDefault();
        e.stopPropagation();
        if (onBlock) {
          onBlock({
            continueCallback() {
              shouldSkipClickChecks.current = true;
              eventTarget.click();
              shouldSkipClickChecks.current = false;
            },
          });
        }
        return false;
      }
    },
    [onBeforeBlock, onBlock],
  );

  useEffect(() => {
    let unsubcribe: Function | null = null;

    window.addEventListener("beforeunload", beforeUnloadHandler);
    window.addEventListener("click", beforeLeaveClickHandler, { capture: true });
    unsubcribe = history.block(() => {
      if (!isActive.current) return;
      const shouldBlock = onBeforeBlock ? onBeforeBlock() : true;
      if (!shouldBlock) {
        return;
      }

      onBlock?.({
        continueCallback: () => {
          leaveBlockerCallback.current?.(true);
          leaveBlockerCallback.current = undefined;
          unsubcribe?.();
        },
        cancelCallback: () => {
          leaveBlockerCallback.current?.(false);
          leaveBlockerCallback.current = undefined;
        },
      });
      // workaround for react-router v5
      // see `getUserConfirmation` on the history object
      return LEAVE_BLOCKER_KEY;
    });
    return () => {
      window.removeEventListener("beforeunload", beforeUnloadHandler);
      window.removeEventListener("click", beforeLeaveClickHandler, { capture: true });
      if (unsubcribe) unsubcribe();
    };
  }, [onBeforeBlock, onBlock, beforeUnloadHandler, beforeLeaveClickHandler]);
  return null;
};
