import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Dropdown, type DropdownRef } from "../dropdown/dropdown";
import { DropdownContext, type DropdownContextValue } from "../dropdown/dropdown-context";

import "./context-menu.prefix.css";

export type ContextMenuPosition = { x: number; y: number };

export type ContextMenuOpenEvent = ReactMouseEvent | ReactKeyboardEvent;

export interface UseContextMenuOptions {
  /** Menu content. Receives close/position helpers when passed as a render function. */
  content?: ReactNode | ((ctx: { close: () => void; position: ContextMenuPosition | null }) => ReactNode);
  /** Disable opening from trigger props. */
  disabled?: boolean;
  /** Forwarded to Dropdown — clamp menu height to the viewport. */
  constrainHeight?: boolean;
  /** Forwarded to Dropdown. Defaults to true. */
  animated?: boolean;
  /** Controlled open state. Omit for uncontrolled usage. */
  open?: boolean;
  /** Controlled cursor/keyboard position. Required when `open` is controlled. */
  position?: ContextMenuPosition | null;
  /** Called whenever open state should change (controlled or uncontrolled). */
  onOpenChange?: (open: boolean) => void;
  /**
   * Called when the menu opens from a trigger interaction.
   * Consumers interpret `event.currentTarget` / `event.target` themselves
   * (e.g. resolve a table column) — this hook stays domain-agnostic.
   */
  onOpen?: (event: ContextMenuOpenEvent, position: ContextMenuPosition) => void;
  /** Called when the menu closes. */
  onClose?: () => void;
  /** Data attribute used for outside-dismiss guards. Defaults to `data-context-menu`. */
  menuDataAttribute?: string;
}

export interface ContextMenuTriggerProps {
  onContextMenu: (event: ReactMouseEvent) => void;
  onKeyDown: (event: ReactKeyboardEvent) => void;
}

export interface UseContextMenuReturn {
  /** Merge onto an existing element — no wrapper DOM. */
  triggerProps: ContextMenuTriggerProps;
  /**
   * Compose additional handlers onto trigger props.
   * Consumer handlers run first; the primitive still preventDefaults when it opens.
   */
  getTriggerProps: (extra?: Partial<ContextMenuTriggerProps>) => ContextMenuTriggerProps;
  /** Portal menu node — render once at a stable ancestor. */
  menu: ReactNode;
  open: (position?: ContextMenuPosition) => void;
  close: () => void;
  isOpen: boolean;
  position: ContextMenuPosition | null;
}

const CONTEXT_MENU_KEYS = new Set(["ContextMenu", "F10"]);

function isContextMenuKey(event: ReactKeyboardEvent): boolean {
  if (event.key === "ContextMenu") return true;
  return event.key === "F10" && event.shiftKey;
}

function positionFromElement(element: EventTarget | null): ContextMenuPosition {
  if (!(element instanceof HTMLElement)) {
    return { x: 0, y: 0 };
  }
  const rect = element.getBoundingClientRect();
  return { x: rect.left, y: rect.bottom };
}

/**
 * Table-agnostic context menu hook built on Dropdown's cursor-position path.
 *
 * Prefer this for virtualized / fragile hosts: merge `triggerProps` (or
 * `getTriggerProps`) onto existing elements and render `menu` once at a
 * stable ancestor. For simple single-trigger hosts, use `<ContextMenu>`.
 */
export function useContextMenu(options: UseContextMenuOptions = {}): UseContextMenuReturn {
  const {
    content,
    disabled = false,
    constrainHeight = true,
    animated = true,
    open: controlledOpen,
    position: controlledPosition,
    onOpenChange,
    onOpen,
    onClose,
    menuDataAttribute = "data-context-menu",
  } = options;

  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [uncontrolledPosition, setUncontrolledPosition] = useState<ContextMenuPosition | null>(null);
  const [activeTrigger, setActiveTrigger] = useState<HTMLElement | null>(null);

  const isOpen = isControlled ? Boolean(controlledOpen) : uncontrolledOpen;
  const position = isControlled ? (controlledPosition ?? null) : uncontrolledPosition;

  // Keep consumer callbacks in refs so trigger handlers stay referentially
  // stable across open/close — critical for virtualized hosts that put
  // getTriggerProps into row-renderer deps (unstable Renderer remounts rows).
  const onOpenRef = useRef(onOpen);
  const onOpenChangeRef = useRef(onOpenChange);
  const onCloseRef = useRef(onClose);
  onOpenRef.current = onOpen;
  onOpenChangeRef.current = onOpenChange;
  onCloseRef.current = onClose;

  const dropdownRef = useRef<DropdownRef>(null);
  const triggerRef = useRef<HTMLElement | undefined>(activeTrigger ?? undefined);
  triggerRef.current = activeTrigger ?? undefined;
  const activeTriggerRef = useRef(activeTrigger);
  activeTriggerRef.current = activeTrigger;

  const setOpenState = useCallback(
    (next: boolean, nextPosition?: ContextMenuPosition | null) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
        if (nextPosition !== undefined) {
          setUncontrolledPosition(nextPosition);
        } else if (!next) {
          setUncontrolledPosition(null);
        }
      } else if (nextPosition !== undefined && nextPosition !== null) {
        // Controlled hosts own position via their state; nothing to store here.
      }

      onOpenChangeRef.current?.(next);
      if (!next) {
        onCloseRef.current?.();
        setActiveTrigger(null);
      }
    },
    [isControlled],
  );

  const open = useCallback(
    (nextPosition?: ContextMenuPosition) => {
      if (disabled) return;
      const resolved = nextPosition ?? position ?? { x: 0, y: 0 };
      setOpenState(true, resolved);
    },
    [disabled, position, setOpenState],
  );

  const close = useCallback(() => {
    // Only flip open state — do not call dropdown.close() here.
    // Dropdown's onToggle(false) also routes through close; calling both
    // recurses. Unmounting `menu` when isOpen becomes false is enough.
    setOpenState(false, null);
  }, [setOpenState]);

  const openFromEvent = useCallback(
    (event: ContextMenuOpenEvent, nextPosition: ContextMenuPosition) => {
      if (disabled) return;

      event.preventDefault();
      event.stopPropagation();

      const trigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
      setActiveTrigger(trigger);
      onOpenRef.current?.(event, nextPosition);
      setOpenState(true, nextPosition);
    },
    [disabled, setOpenState],
  );

  const handleContextMenu = useCallback(
    (event: ReactMouseEvent) => {
      openFromEvent(event, { x: event.clientX, y: event.clientY });
    },
    [openFromEvent],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (!isContextMenuKey(event)) return;
      // Only handle Shift+F10 / ContextMenu — never steal unrelated shortcuts.
      openFromEvent(event, positionFromElement(event.currentTarget));
    },
    [openFromEvent],
  );

  const getTriggerProps = useCallback(
    (extra?: Partial<ContextMenuTriggerProps>): ContextMenuTriggerProps => {
      return {
        onContextMenu: (event) => {
          // Consumer first, then primitive (plan: compose without replacing handlers).
          // Only treat defaultPrevented as a consumer cancel when the *extra*
          // handler newly set it — document-level outside-dismiss also calls
          // preventDefault on contextmenu to block the browser menu, and that
          // must not stop us from reopening on another trigger.
          const preventedBefore = event.defaultPrevented;
          extra?.onContextMenu?.(event);
          if (extra?.onContextMenu && event.defaultPrevented && !preventedBefore) return;
          handleContextMenu(event);
        },
        onKeyDown: (event) => {
          const preventedBefore = event.defaultPrevented;
          extra?.onKeyDown?.(event);
          if (extra?.onKeyDown && event.defaultPrevented && !preventedBefore) return;
          handleKeyDown(event);
        },
      };
    },
    [handleContextMenu, handleKeyDown],
  );

  const triggerProps = useMemo(() => getTriggerProps(), [getTriggerProps]);

  // Outside dismiss + Escape — only while open. No document key listeners when closed.
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDismiss = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(`[${menuDataAttribute}]`)) return;
      if (activeTriggerRef.current?.contains(target)) return;

      // Capture-phase dismiss runs before the target's onContextMenu.
      // Always block the browser menu here so a re-right-click on another
      // trigger cannot flash the native menu before the trigger reopens us.
      if (event.type === "contextmenu") {
        event.preventDefault();
      }
      close();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    };

    // Defer so the opening click/contextmenu does not immediately dismiss.
    const timerId = window.setTimeout(() => {
      document.addEventListener("click", handlePointerDismiss, true);
      document.addEventListener("contextmenu", handlePointerDismiss, true);
      document.addEventListener("keydown", handleEscape);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener("click", handlePointerDismiss, true);
      document.removeEventListener("contextmenu", handlePointerDismiss, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, close, menuDataAttribute]);

  const contextValue = useMemo((): DropdownContextValue => {
    return {
      triggerRef: triggerRef as RefObject<HTMLElement | undefined> as DropdownContextValue["triggerRef"],
      dropdown: dropdownRef,
      minIndex: 10000,
      cursorPosition: position,
      hasTarget: (target) => {
        if (activeTrigger?.contains(target)) return true;
        if (dropdownRef.current?.dropdown?.contains?.(target)) return true;
        return false;
      },
      addChild: () => {},
      removeChild: () => {},
      open: () => open(),
      close: () => close(),
    };
  }, [position, activeTrigger, open, close]);

  const resolvedContent = useMemo(() => {
    if (typeof content === "function") {
      return content({ close, position });
    }
    return content;
  }, [content, close, position]);

  // Mount closed, then open via Dropdown's appear transition. Passing
  // visible={true} skipped animation (initial state jumped to "visible").
  useEffect(() => {
    if (!isOpen || !position) return;
    void dropdownRef.current?.open();
  }, [isOpen, position?.x, position?.y]);

  const menu = useMemo(() => {
    if (!isOpen || !position || resolvedContent == null) return null;

    return (
      <DropdownContext.Provider value={contextValue}>
        <Dropdown
          ref={dropdownRef}
          animated={animated}
          constrainHeight={constrainHeight}
          dataAttributes={{ [menuDataAttribute]: "" }}
          onToggle={(visible) => {
            if (!visible) close();
          }}
        >
          {resolvedContent}
        </Dropdown>
      </DropdownContext.Provider>
    );
  }, [isOpen, position, resolvedContent, contextValue, animated, constrainHeight, menuDataAttribute, close]);

  return {
    triggerProps,
    getTriggerProps,
    menu,
    open,
    close,
    isOpen,
    position,
  };
}

// Re-export key set for tests / documentation
export { CONTEXT_MENU_KEYS };
