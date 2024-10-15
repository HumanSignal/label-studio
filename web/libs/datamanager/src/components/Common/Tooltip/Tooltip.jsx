import { Children, cloneElement, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Block, Elem } from "../../../utils/bem";
import { alignElements } from "../../../utils/dom";
import { aroundTransition } from "../../../utils/transition";
import "./Tooltip.scss";

export const Tooltip = forwardRef(({ title, children, defaultVisible, disabled, style }, ref) => {
  const child = Children.only(children);
  const triggerElement = ref ?? useRef();
  const tooltipElement = useRef();
  const [offset, setOffset] = useState({});
  const [visibility, setVisibility] = useState(defaultVisible ? "visible" : null);
  const [injected, setInjected] = useState(false);
  const [align, setAlign] = useState("top-center");

  const calculatePosition = useCallback(() => {
    // If the tooltip is not injected, we cannot yet calculate the position
    // Without this check the alignElements function will throw an error if the async transition is not finished but the component is already unmounted
    if (!triggerElement.current || !tooltipElement.current) return;
    const { left, top, align: resultAlign } = alignElements(triggerElement.current, tooltipElement.current, align, 10);

    setOffset({ left, top });
    setAlign(resultAlign);
  }, []);

  const performAnimation = useCallback(
    (visible) => {
      if (tooltipElement.current) {
        aroundTransition(tooltipElement.current, {
          beforeTransition() {
            setVisibility(visible ? "before-appear" : "before-disappear");
          },
          transition() {
            if (visible) calculatePosition();
            setVisibility(visible ? "appear" : "disappear");
          },
          afterTransition() {
            setVisibility(visible ? "visible" : null);
            if (visible === false) setInjected(false);
          },
        });
      }
    },
    [injected, calculatePosition],
  );

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
        return visibility ? "visible" : null;
    }
  }, [visibility]);

  const tooltip = useMemo(
    () =>
      injected ? (
        <Block
          ref={tooltipElement}
          name="tooltip"
          mod={{ align }}
          mix={visibilityClasses}
          style={{ ...offset, ...(style ?? {}) }}
        >
          <Elem name="body">{title}</Elem>
        </Block>
      ) : null,
    [injected, offset, title, visibilityClasses],
  );

  useEffect(() => {
    if (disabled === true && visibility === "visible") performAnimation(false);
  }, [disabled]);

  const clone = cloneElement(child, {
    ...child.props,
    ref: triggerElement,
    onMouseEnter(e) {
      if (disabled === true) return;
      setInjected(true);
      child.props.onMouseEnter?.(e);
    },
    onMouseLeave(e) {
      if (disabled === true) return;
      performAnimation(false);
      child.props.onMouseLeave?.(e);
    },
  });

  useEffect(() => {
    if (injected) performAnimation(true);
  }, [injected]);

  return (
    <>
      {clone}
      {createPortal(tooltip, document.body)}
    </>
  );
});
Tooltip.displayName = "Tooltip";
