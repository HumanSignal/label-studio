import {
  Children,
  cloneElement,
  type DetailedReactHTMLElement,
  forwardRef,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Block, Elem } from "../../utils/bem";
import { type Align, alignElements } from "../../utils/dom";
import { isDefined } from "../../utils/helpers";
import { aroundTransition } from "../../utils/transition";
import { setRef } from "../../utils/unwrapRef";
import "./Tooltip.scss";

export type TooltipProps = PropsWithChildren<{
  title: string;
  alignment?: Align;
  defaultVisible?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}>;

export const Tooltip = forwardRef(
  ({ title, children, alignment, defaultVisible, disabled, style }: TooltipProps, ref) => {
    if (!children || Array.isArray(children)) {
      throw new Error("Tooltip accepts a single child only");
    }

    const triggerElement = useRef<any>();
    const tooltipElement = useRef<HTMLDivElement>();
    const [offset, setOffset] = useState({});
    const [visibility, setVisibility] = useState(defaultVisible ? "visible" : null);
    const [injected, setInjected] = useState(false);
    const [align, setAlign] = useState(alignment ?? "top-center");

    const calculatePosition = useCallback(() => {
      const parent = triggerElement.current as HTMLElement | null;
      const target = tooltipElement.current as HTMLElement | null;

      if (isDefined(parent) && isDefined(target)) {
        const { left, top, align: resultAlign } = alignElements(parent, target, align, 10);

        setOffset({ left, top });
        setAlign(resultAlign);
      }
    }, [triggerElement.current, tooltipElement.current]);

    const performAnimation = useCallback(
      async (visible) => {
        if (tooltipElement.current) {
          await aroundTransition(tooltipElement.current, {
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
      [injected, calculatePosition, tooltipElement],
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
            ref={(el) => setRef(tooltipElement, el)}
            name="tooltip"
            mod={{ align }}
            mix={visibilityClasses}
            style={{ ...offset, ...(style ?? {}) }}
          >
            <Elem name="body" data-testid="tooltip-body">
              {title}
            </Elem>
          </Block>
        ) : null,
      [injected, offset, title, visibilityClasses, tooltipElement],
    );

    useEffect(() => {
      if (disabled === true && visibility === "visible") performAnimation(false).then();
    }, [disabled]);

    const child = Children.only(children) as DetailedReactHTMLElement<any, HTMLElement>;

    const clone = cloneElement(child, {
      ...child.props,
      ref(el: any) {
        setRef(triggerElement, el);
        setRef(ref, el);
      },
      onMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
        if (disabled === true) return;
        setInjected(true);
        child.props.onMouseEnter?.(e);
      },
      onMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
        if (disabled === true) return;
        performAnimation(false).then();
        child.props.onMouseLeave?.(e);
      },
    });

    useEffect(() => {
      if (injected) performAnimation(true).then();
    }, [injected]);

    return (
      <>
        {clone}
        {createPortal(tooltip, document.body)}
      </>
    );
  },
);

Tooltip.displayName = "Tooltip";
