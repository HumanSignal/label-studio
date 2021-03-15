import React, { Children, cloneElement, forwardRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Dropdown } from "./DropdownComponent";
import { DropdownContext } from "./DropdownContext";

export const DropdownTrigger = forwardRef(
  (
    {
      tag,
      children,
      dropdown,
      content,
      toggle,
      closeOnClickOutside = true,
      ...props
    },
    ref,
  ) => {
    const dropdownRef = ref ?? dropdown ?? useRef();
    const triggerEL = Children.only(children);
    const [childset] = useState(new Set());

    /** @type {import('react').RefObject<HTMLElement>} */
    const triggerRef = triggerEL.props.ref ?? useRef();
    const parentDropdown = useContext(DropdownContext);

    const targetIsInsideDropdown = useCallback((target) => {
      const triggerClicked = triggerRef.current?.contains?.(target);
      const dropdownClicked = dropdownRef.current?.dropdown?.contains?.(
        target,
      );
      const childDropdownClicked = Array.from(childset).reduce(
        (res, child) => {
          return res || child.hasTarget(target);
        },
        false,
      );

      return triggerClicked || dropdownClicked || childDropdownClicked;
    }, [triggerRef, dropdownRef]);

    const handleClick = useCallback((e) => {
      if (!closeOnClickOutside) return;
      if (targetIsInsideDropdown(e.target)) return;

      dropdownRef.current?.close?.();
    }, [closeOnClickOutside, targetIsInsideDropdown]);

    const handleToggle = useCallback((e) => {
      const inDropdown = dropdownRef.current?.dropdown?.contains?.(e.target);

      if (inDropdown) return e.stopPropagation();

      if (toggle === false) return dropdownRef?.current?.open();

      dropdownRef?.current?.toggle();
    }, [dropdownRef]);

    const triggerClone = cloneElement(triggerEL, {
      ...triggerEL.props,
      tag,
      key: "dd-trigger",
      ref: triggerRef,
      onClickCapture: triggerEL.props?.onClick ? null : handleToggle,
    });

    const dropdownClone = content ? (
      <Dropdown {...props} ref={dropdownRef}>
        {content}
      </Dropdown>
    ) : null;

    useEffect(() => {
      document.addEventListener("click", handleClick, { capture: true });
      return () =>
        document.removeEventListener("click", handleClick, { capture: true });
    }, [handleClick]);

    const contextValue = useMemo(() => ({
      triggerRef,
      dropdown: dropdownRef,
      hasTarget: targetIsInsideDropdown,
      addChild: (child) => childset.add(child),
      removeChild: (child) => childset.delete(child),
      open: () => dropdownRef?.current?.open?.(),
      close: () => dropdownRef?.current?.close?.(),
    }), [triggerRef, dropdownRef]);

    useEffect(() => {
      if (!parentDropdown) return;

      parentDropdown.addChild(contextValue);
      return () => parentDropdown.removeChild(contextValue);
    }, []);

    return (
      <DropdownContext.Provider value={contextValue}>
        {triggerClone}
        {dropdownClone}
      </DropdownContext.Provider>
    );
  },
);

export const useDropdown = () => {
  return useContext(DropdownContext);
};
