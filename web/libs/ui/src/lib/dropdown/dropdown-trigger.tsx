import {
  Children,
  cloneElement,
  forwardRef,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Dropdown, type DropdownProps, type DropdownRef } from "./dropdown";
import { DropdownContext, type DropdownContextValue } from "./dropdown-context";

// Simple incrementing counter for z-index stacking
// Dropdowns are portaled to document.body, so parent z-index doesn't matter
let zIndexCounter = 0;

interface DropdownTriggerProps extends DropdownProps {
  /** HTML tag to use for the trigger wrapper */
  tag?: string;
  /** External dropdown ref */
  dropdown?: RefObject<DropdownRef>;
  /** Content to render in the dropdown */
  content?: React.ReactNode;
  /** Data-testid attribute for testing */
  dataTestId?: string;
  /** If false, clicking trigger only opens dropdown (doesn't toggle) */
  toggle?: boolean;
  /** Close dropdown when clicking outside */
  closeOnClickOutside?: boolean;
  /** Disable the dropdown trigger */
  disabled?: boolean;
  /** CSS class name for the trigger */
  className?: string;
  /** Custom validation function to check if an element should be considered part of the dropdown (from DataManager) */
  isChildValid?: (element: HTMLElement) => boolean;
  /** Children elements (trigger element) */
  children?: React.ReactNode;
}

export const DropdownTrigger = forwardRef<DropdownRef, DropdownTriggerProps>(
  (
    {
      tag,
      children,
      content,
      toggle,
      closeOnClickOutside = true,
      disabled = false,
      isChildValid = () => false,
      dropdown,
      ...props
    },
    ref,
  ) => {
    const dropdownRef = (dropdown ?? ref ?? useRef<DropdownRef>()) as RefObject<DropdownRef>;
    const triggerEL = Children.only(children);
    const childset = useRef(new Set<DropdownContextValue>());
    const [isOpen, setIsOpen] = useState(false);

    // Assign a unique z-index for this dropdown
    const minIndex = useMemo(() => 1000 + zIndexCounter++, []);

    const triggerRef = useRef<HTMLElement>((triggerEL as any)?.props?.ref?.current);
    const parentDropdown = useContext(DropdownContext);

    const targetIsInsideDropdown = useCallback(
      (target: HTMLElement) => {
        const triggerClicked = triggerRef.current?.contains?.(target);
        if (triggerClicked) return true;

        const dropdownClicked = dropdownRef.current?.dropdown?.contains?.(target);
        if (dropdownClicked) return true;

        if (isChildValid(target)) return true;

        // Check child dropdowns - short-circuit on first match
        for (const child of childset.current) {
          if (child.hasTarget(target)) return true;
        }

        return false;
      },
      [triggerRef, dropdownRef, isChildValid],
    );

    const handleClick = useCallback(
      (e: any) => {
        // If dropdown is not visible, bail out immediately - this is critical for performance
        // when there are many nested dropdowns (e.g., 84+ in notifications list)
        if (!dropdownRef.current?.visible) return;
        if (!closeOnClickOutside) return;

        // Fast path: check our own trigger and dropdown first before expensive child iteration
        const target = e.target;
        if (triggerRef.current?.contains?.(target)) return;
        if (dropdownRef.current?.dropdown?.contains?.(target)) return;
        if (isChildValid(target)) return;

        // Only check children if we didn't match trigger/dropdown
        if (targetIsInsideDropdown(target)) return;

        dropdownRef.current?.close?.();
      },
      [closeOnClickOutside, targetIsInsideDropdown, triggerRef, dropdownRef, isChildValid],
    );

    const handleToggle = useCallback(
      (e: any) => {
        if (disabled) return;

        const inDropdown = dropdownRef.current?.dropdown?.contains?.(e.target);

        if (inDropdown) return e.stopPropagation();

        if (toggle === false) {
          return dropdownRef?.current?.open();
        }

        dropdownRef?.current?.toggle();
      },
      [dropdownRef, disabled, toggle],
    );

    const cloneProps = useMemo(() => {
      return {
        ...(triggerEL as any).props,
        tag,
        key: "dd-trigger",
        ref: (el: HTMLElement) => {
          triggerRef.current = triggerRef.current ?? el;
        },
        onClickCapture: handleToggle,
      };
    }, [triggerEL, triggerRef, handleToggle, tag]);

    const triggerClone = useMemo(() => {
      return cloneElement(triggerEL as any, cloneProps);
    }, [triggerEL, cloneProps]);

    const dropdownClone = content ? (
      <Dropdown
        {...props}
        ref={dropdownRef}
        onToggle={(visible) => {
          setIsOpen(visible);
          props.onToggle?.(visible);
        }}
      >
        {content}
      </Dropdown>
    ) : null;

    useEffect(() => {
      // For external dropdowns (no content), always add listener since we can't track visibility via onToggle
      // For internal dropdowns (with content), only add when open for performance
      const shouldAddListener = content ? isOpen : true;

      if (!shouldAddListener) return;

      document.addEventListener("click", handleClick, { capture: true });

      return () => {
        document.removeEventListener("click", handleClick, { capture: true });
      };
    }, [handleClick, isOpen, content]);

    const contextValue = useMemo((): DropdownContextValue => {
      return {
        minIndex,
        triggerRef,
        dropdown: dropdownRef,
        hasTarget: (target: HTMLElement) => {
          // Inline the function to avoid dependency issues
          const triggerClicked = triggerRef.current?.contains?.(target);
          if (triggerClicked) return true;

          const dropdownClicked = dropdownRef.current?.dropdown?.contains?.(target);
          if (dropdownClicked) return true;

          if (isChildValid(target)) return true;

          for (const child of childset.current) {
            if (child.hasTarget(target)) return true;
          }

          return false;
        },
        addChild: (child) => childset.current.add(child),
        removeChild: (child) => childset.current.delete(child),
        open: () => dropdownRef?.current?.open?.(),
        close: () => dropdownRef?.current?.close?.(),
      };
    }, [triggerRef, dropdownRef, minIndex, isChildValid]);

    useEffect(() => {
      if (!parentDropdown) return;

      parentDropdown.addChild(contextValue);
      return () => {
        parentDropdown.removeChild(contextValue);
      };
    }, []); // Empty deps - only register once on mount, unregister on unmount

    return (
      <DropdownContext.Provider value={contextValue}>
        {triggerClone}
        {dropdownClone}
      </DropdownContext.Provider>
    );
  },
);

DropdownTrigger.displayName = "DropdownTrigger";

export const useDropdown = () => {
  return useContext(DropdownContext);
};
