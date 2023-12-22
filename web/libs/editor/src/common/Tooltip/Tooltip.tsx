import { Children, cloneElement, CSSProperties, forwardRef, MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Block, Elem } from '../../utils/bem';
import { aroundTransition } from '../../utils/transition';
import { alignElements, ElementAlignment } from '../../utils/dom';
import './Tooltip.styl';
import { useFullscreen } from '../../hooks/useFullscreen';

export interface TooltipProps {
  title: string;
  children: JSX.Element;
  theme?: 'light' | 'dark';
  defaultVisible?: boolean;
  // activates intent detecting mode
  mouseEnterDelay?: number;
  enabled?: boolean;
  style?: CSSProperties;
  // allows to convert triggerElementRef into a real HTMLElement for listeners and getting bbox
  triggerElementGetter?: (refValue:any)=>HTMLElement;
}

export const Tooltip = forwardRef<HTMLElement, TooltipProps>(({
  title,
  children,
  defaultVisible,
  mouseEnterDelay = 0,
  enabled = true,
  theme = 'dark',
  style,
  triggerElementGetter = refValue => refValue as HTMLElement,
}, ref) => {
  if (!children || Array.isArray(children)) {
    throw new Error('Tooltip does accept a single child only');
  }

  const refIsObject = !!ref && Object.hasOwnProperty.call(ref, 'current');
  const refIsFunction = ref instanceof Function;
  const triggerElement = (refIsObject ? ref : useRef<HTMLElement>()) as MutableRefObject<HTMLElement>;
  const forwardingRef = !refIsFunction ? triggerElement : (el) => {
    ref(el);
    triggerElement.current = el;
  };
  const tooltipElement = useRef<HTMLElement>();
  const [offset, setOffset] = useState({});
  const [visibility, setVisibility] = useState(defaultVisible ? 'visible' : null);
  const [injected, setInjected] = useState(false);
  const [align, setAlign] = useState<ElementAlignment>('top-center');
  const mouseEnterTimeoutRef = useRef<number|undefined>();

  const calculatePosition = useCallback(() => {
    const { left, top, align: resultAlign } = alignElements(
      triggerElementGetter(triggerElement.current),
      tooltipElement.current!,
      align,
      10,
    );

    setOffset({ left, top });
    setAlign(resultAlign);
  }, [triggerElement.current, tooltipElement.current]);

  const performAnimation = useCallback((visible: boolean, disableAnimation?: boolean) => {
    if (tooltipElement.current) {
      if (disableAnimation) {
        setInjected(false);
        return;
      }

      aroundTransition(tooltipElement.current, {
        beforeTransition() {
          setVisibility(visible ? 'before-appear' : 'before-disappear');
        },
        transition() {
          if (visible) calculatePosition();
          setVisibility(visible ? 'appear' : 'disappear');
        },
        afterTransition() {
          setVisibility(visible ? 'visible' : null);
          if (visible === false) setInjected(false);
        },
      });
    }
  }, [calculatePosition, tooltipElement]);

  const visibilityClasses = useMemo(() => {
    switch (visibility) {
      case 'before-appear':
        return 'before-appear';
      case 'appear':
        return 'appear before-appear';
      case 'before-disappear':
        return 'before-disappear';
      case 'disappear':
        return 'disappear before-disappear';
      case 'visible':
        return 'visible';
      default:
        return visibility ? 'visible' : null;
    }
  }, [visibility]);

  const tooltip = useMemo(() => {
    return injected ? (
      <Block
        ref={tooltipElement}
        name="tooltip"
        mod={{ align, theme }}
        mix={visibilityClasses}
        style={{ ...offset, ...(style ?? {}) }}
      >
        <Elem name="body">{title}</Elem>
      </Block>
    ) : null;
  }, [injected, offset, title, visibilityClasses, tooltipElement]);

  const child = Children.only(children);
  const clone = cloneElement(child, {
    ...child.props,
    ref: forwardingRef,
  });

  useEffect(() => {
    if (injected) performAnimation(true);
  }, [injected]);

  useEffect(() => {
    const el = triggerElementGetter(triggerElement.current);

    const handleTooltipAppear = () => {
      if (enabled === false) return;

      mouseEnterTimeoutRef.current = window.setTimeout(() => {
        mouseEnterTimeoutRef.current = undefined;
        setInjected(true);
      }, mouseEnterDelay);
    };

    const handleTooltipHiding = () => {
      if (enabled === false) return;

      if (mouseEnterTimeoutRef.current) {
        mouseEnterTimeoutRef.current = window.clearTimeout(mouseEnterTimeoutRef.current);
      }
      performAnimation(false);
    };

    if (el) {
      el.addEventListener('mouseenter', handleTooltipAppear);
      el.addEventListener('mouseleave', handleTooltipHiding);
      window.addEventListener('scroll', handleTooltipHiding);
    }

    return () => {
      if (el) {
        el.removeEventListener('mouseenter', handleTooltipAppear);
        el.removeEventListener('mouseleave', handleTooltipHiding);
        window.removeEventListener('scroll', handleTooltipHiding);
      }
    };
  }, [enabled, mouseEnterDelay]);

  useFullscreen({
    onEnterFullscreen: () => performAnimation(false, true),
    onExitFullscreen: () => performAnimation(false, true),
  }, []);


  return (
    <>
      {clone}
      {createPortal(tooltip, document.body)}
    </>
  );
});

Tooltip.displayName = 'Tooltip';
