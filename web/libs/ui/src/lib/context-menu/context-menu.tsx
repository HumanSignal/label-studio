import {
  Children,
  cloneElement,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { type UseContextMenuOptions, useContextMenu } from "./use-context-menu";

export interface ContextMenuProps extends UseContextMenuOptions {
  /**
   * Single child used as the trigger. Props are merged onto the child —
   * no wrapper DOM is introduced.
   *
   * Prefer `useContextMenu` when wrapping may cause issues (virtualized
   * lists, hosts that already own event handlers, multiple triggers).
   */
  children: ReactElement;
}

function composeMouseHandler(consumer?: (event: ReactMouseEvent) => void, ours?: (event: ReactMouseEvent) => void) {
  return (event: ReactMouseEvent) => {
    const preventedBefore = event.defaultPrevented;
    consumer?.(event);
    // Skip only when the child handler newly canceled — not when a document
    // outside-dismiss listener already preventDefault'd to block the browser menu.
    if (consumer && event.defaultPrevented && !preventedBefore) return;
    ours?.(event);
  };
}

function composeKeyHandler(consumer?: (event: ReactKeyboardEvent) => void, ours?: (event: ReactKeyboardEvent) => void) {
  return (event: ReactKeyboardEvent) => {
    const preventedBefore = event.defaultPrevented;
    consumer?.(event);
    if (consumer && event.defaultPrevented && !preventedBefore) return;
    ours?.(event);
  };
}

/**
 * Drop-in context menu for simple single-trigger hosts.
 *
 * Opens on OS secondary-click (`contextmenu`) and keyboard
 * (`Shift+F10` / `ContextMenu`) only while the trigger is focused.
 * Does not replace kebabs or other action buttons.
 */
export function ContextMenu({ children, ...options }: ContextMenuProps) {
  const { triggerProps, menu } = useContextMenu(options);
  const child = Children.only(children);

  const merged = cloneElement(child, {
    onContextMenu: composeMouseHandler(
      (child.props as { onContextMenu?: (event: ReactMouseEvent) => void }).onContextMenu,
      triggerProps.onContextMenu,
    ),
    onKeyDown: composeKeyHandler(
      (child.props as { onKeyDown?: (event: ReactKeyboardEvent) => void }).onKeyDown,
      triggerProps.onKeyDown,
    ),
  });

  return (
    <>
      {merged}
      {menu}
    </>
  );
}

/** Helper to render the portal menu node from a hook result. */
ContextMenu.Portal = function ContextMenuPortal({ children }: { children: ReactNode }) {
  return <>{children}</>;
};
