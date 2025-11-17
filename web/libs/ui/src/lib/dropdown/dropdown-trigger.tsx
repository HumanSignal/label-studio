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
import { cnb as cn } from "@humansignal/core/lib/utils/bem";
import { Dropdown, type DropdownProps, type DropdownRef } from "./dropdown";
import { DropdownContext, type DropdownContextValue } from "./dropdown-context";

const getMinIndex = (element?: HTMLElement) => {
  let index = 1000;

  if (element) {
    let parent = element.parentElement;

    while (parent) {
      const parentIndex = Number.parseInt(getComputedStyle(parent).zIndex);

      if (!isNaN(parentIndex)) {
        index = Math.max(index, parentIndex);
      }

      parent = parent?.parentElement ?? null;
    }
  }

  return index;
};

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
    const dropdownRef = (dropdown ??
      ref ??
      useRef<DropdownRef>()) as RefObject<DropdownRef>;
    const triggerEL = Children.only(children);
    const childset = useRef(new Set<DropdownContextValue>());
    const [minIndex, setMinIndex] = useState(1000);

    const triggerRef = useRef<HTMLElement>(
      (triggerEL as any)?.props?.ref?.current,
    );
    const parentDropdown = useContext(DropdownContext);

    const targetIsInsideDropdown = useCallback(
      (target: HTMLElement) => {
        const triggerClicked = triggerRef.current?.contains?.(target);
        const dropdownClicked =
          dropdownRef.current?.dropdown?.contains?.(target);

        const childDropdownClicked = Array.from(childset.current).reduce(
          (res, child) => {
            return res || child.hasTarget(target);
          },
          false,
        );

        return (
          triggerClicked ||
          dropdownClicked ||
          childDropdownClicked ||
          isChildValid(target)
        );
      },
      [triggerRef, dropdownRef, isChildValid],
    );

    const handleClick = useCallback(
      (e: any) => {
        if (!closeOnClickOutside) return;
        if (targetIsInsideDropdown(e.target)) return;

        dropdownRef.current?.close?.();
      },
      [closeOnClickOutside, targetIsInsideDropdown],
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

          if (triggerRef.current) {
            setMinIndex(Math.max(minIndex, getMinIndex(triggerRef.current)));
          }
        },
        className: cn("dropdown")
          .elem("trigger")
          .mix((triggerEL as any).props.className, props.className),
        onClickCapture: handleToggle,
      };
    }, [triggerEL, triggerRef, props.className, handleToggle, tag, minIndex]);

    const triggerClone = useMemo(() => {
      return cloneElement(triggerEL as any, cloneProps);
    }, [triggerEL, cloneProps]);

    const dropdownClone = (
      <Dropdown {...props} ref={dropdownRef}>
        {content}
      </Dropdown>
    );

    useEffect(() => {
      document.addEventListener("click", handleClick, { capture: true });
      return () =>
        document.removeEventListener("click", handleClick, { capture: true });
    }, [handleClick]);

    const contextValue = useMemo((): DropdownContextValue => {
      return {
        minIndex,
        triggerRef,
        dropdown: dropdownRef,
        hasTarget: targetIsInsideDropdown,
        addChild: (child) => childset.current.add(child),
        removeChild: (child) => childset.current.delete(child),
        open: () => dropdownRef?.current?.open?.(),
        close: () => dropdownRef?.current?.close?.(),
      };
    }, [triggerRef, dropdownRef, minIndex, targetIsInsideDropdown]);

    useEffect(() => {
      if (!parentDropdown) return;

      parentDropdown.addChild(contextValue);
      return () => parentDropdown.removeChild(contextValue);
    }, [parentDropdown, contextValue]);

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
