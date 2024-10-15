import React, { cloneElement, forwardRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Block, cn } from "../../utils/bem";
import { alignElements } from "../../utils/dom";
import { aroundTransition } from "../../utils/transition";
import "./Dropdown.scss";
import { DropdownContext } from "./DropdownContext";
import { DropdownTrigger } from "./DropdownTrigger";

let lastIndex = 1;

export const Dropdown = forwardRef(({ animated = true, visible = false, ...props }, ref) => {
  const rootName = cn("dropdown-ls");

  /**@type {import('react').RefObject<HTMLElement>} */
  const dropdown = useRef();
  const { triggerRef } = useContext(DropdownContext) ?? {};
  const isInline = triggerRef === undefined;

  const { children } = props;
  const [renderable, setRenderable] = useState(visible);
  const [currentVisible, setVisible] = useState(visible);
  const [offset, setOffset] = useState({});
  const [visibility, setVisibility] = useState(visible ? "visible" : null);

  const calculatePosition = useCallback(() => {
    const dropdownEl = dropdown.current;
    const parent = triggerRef?.current ?? dropdownEl.parentNode;
    const { left, top } = alignElements(parent, dropdownEl, `bottom-${props.align ?? "left"}`);

    setOffset({ left, top });
  }, [triggerRef]);

  const dropdownIndex = useMemo(() => {
    return lastIndex++;
  }, []);

  const performAnimation = useCallback(
    async (visible = false) => {
      if (props.enabled === false && visible === true) return;

      return new Promise((resolve) => {
        const menu = dropdown.current;

        if (animated !== false) {
          aroundTransition(menu, {
            transition: () => {
              setVisibility(visible ? "appear" : "disappear");
            },
            beforeTransition: () => {
              setVisibility(visible ? "before-appear" : "before-disappear");
            },
            afterTransition: () => {
              setVisibility(visible ? "visible" : null);
              resolve();
            },
          });
        } else {
          setVisibility(visible ? "visible" : null);
          resolve();
        }
      });
    },
    [animated],
  );

  const changeVisibility = useCallback(
    async (visibility) => {
      props.onToggle?.(visibility);
      await performAnimation(visibility);
      setVisible(visibility);
      props.onVisibilityChanged?.(visibility);
    },
    [props, performAnimation],
  );

  const close = useCallback(async () => {
    if (currentVisible === false || renderable === false) return;

    await changeVisibility(false);
    setRenderable(false);
  }, [currentVisible, performAnimation, props, renderable]);

  const open = useCallback(async () => {
    if (currentVisible === true || renderable === true) return;

    setRenderable(true);
  }, [currentVisible, performAnimation, props, renderable]);

  const toggle = useCallback(async () => {
    const newState = !currentVisible;

    if (newState) {
      open();
    } else {
      close();
    }
  }, [close, currentVisible, open]);

  useEffect(() => {
    if (!ref) return;

    ref.current = {
      dropdown: dropdown.current,
      visible: visibility !== null,
      toggle,
      open,
      close,
    };
  }, [close, open, ref, toggle, dropdown, visibility]);

  useEffect(() => {
    setVisible(visible);
  }, [visible]);

  useEffect(() => {
    if (!isInline && visibility === "before-appear") {
      calculatePosition();
    }
  }, [visibility, calculatePosition, isInline]);

  useEffect(() => {
    if (props.enabled === false) performAnimation(false);
  }, [props.enabled]);

  useEffect(() => {
    if (renderable) changeVisibility(true);
  }, [renderable]);

  const content =
    children.props && children.props.type === "Menu"
      ? cloneElement(children, {
          ...children.props,
          className: rootName.elem("menu").mix(children.props.className),
        })
      : children;

  const visibilityClasses = useMemo(() => {
    switch (visibility) {
      case "before-appear":
        return "before-appear";
      case "appear":
        return "appear before-appear";
      case "before-disappear":
        return "before-disappear";
      case "disappear":
        return "disappear before-disappear";
      case "visible":
        return "visible";
      default:
        return visible ? "visible" : null;
    }
  }, [visibility, visible]);

  const compositeStyles = {
    ...(props.style ?? {}),
    ...(offset ?? {}),
    zIndex: 1000 + dropdownIndex,
  };

  const result = (
    <Block
      ref={dropdown}
      name="dropdown-ls"
      mix={[props.className, visibilityClasses]}
      style={compositeStyles}
      onClick={(e) => e.stopPropagation()}
    >
      {content}
    </Block>
  );

  return renderable ? (props.inline === true ? result : ReactDOM.createPortal(result, document.body)) : null;
});

Dropdown.displayName = "Dropdown";

Dropdown.Trigger = DropdownTrigger;
