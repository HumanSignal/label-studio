import { cloneElement, CSSProperties, forwardRef, MouseEvent, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFullscreen } from '../../hooks/useFullscreen';
import { Block, cn } from '../../utils/bem';
import { alignElements, ElementAlignment } from '../../utils/dom';
import { aroundTransition } from '../../utils/transition';
import './Dropdown.styl';
import { DropdownContext } from './DropdownContext';
import { FF_DEV_3873, isFF } from '../../utils/feature-flags';

let lastIndex = 1;

export interface DropdownRef {
  dropdown: HTMLElement;
  visible: boolean;
  toggle(): void;
  open(): void;
  close(): void;
}

export interface DropdownProps {
  animated?: boolean;
  visible?: boolean;
  alignment?: ElementAlignment;
  enabled?: boolean;
  inline?: boolean;
  className?: string;
  dataTestId?: string;
  style?: CSSProperties;
  children?: JSX.Element;
  onToggle?: (visible: boolean) => void;
}

export const Dropdown = forwardRef<DropdownRef, DropdownProps>(({
  animated = true,
  visible = false,
  ...props
}, ref) => {
  const rootName = cn('dropdown');

  const dropdown = useRef<HTMLElement>();
  const { triggerRef, minIndex } = useContext(DropdownContext) ?? {};
  const isInline = triggerRef === undefined;

  const { children } = props;
  const [currentVisible, setVisible] = useState(visible);
  const [offset, setOffset] = useState({});
  const [visibility, setVisibility] = useState(
    visible ? 'visible' : null,
  );

  const calculatePosition = useCallback(() => {
    const dropdownEl = dropdown.current!;
    const parent = (triggerRef?.current ?? dropdownEl.parentNode) as HTMLElement;
    const { left, top } = alignElements(parent!, dropdownEl, props.alignment || 'bottom-left');

    setOffset({ left, top });
  }, [triggerRef, minIndex]);

  const dropdownIndex = useMemo(() => {
    return lastIndex++;
  }, []);

  const performAnimation = useCallback(
    async (visible = false, disableAnimation?: boolean) => {
      if (props.enabled === false && visible === true) return;

      return new Promise<void>((resolve) => {
        const menu = dropdown.current!;

        if (animated === false || disableAnimation === true) {
          setVisibility(visible ? 'visible' : null);
          resolve();
          return;
        }

        aroundTransition(menu, {
          transition: () => {
            setVisibility(visible ? 'appear' : 'disappear');
          },
          beforeTransition: () => {
            setVisibility(visible ? 'before-appear' : 'before-disappear');
          },
          afterTransition: () => {
            setVisibility(visible ? 'visible' : null);
            resolve();
          },
        });
      });
    },
    [animated],
  );

  const toggle = useCallback(async (updatedState?: boolean, disableAnimation?: boolean) => {
    const newState = updatedState ?? !currentVisible;

    if (currentVisible !== newState) {
      props.onToggle?.(newState);
      await performAnimation(newState, disableAnimation);
      setVisible(newState);
    }
  }, [currentVisible, performAnimation, props.onToggle]);

  const close = useCallback(async (disableAnimation?: boolean) => {
    await toggle(false, disableAnimation);
  }, [toggle]);

  const open = useCallback(async (disableAnimation?: boolean) => {
    await toggle(true, disableAnimation);
  }, [toggle]);

  useFullscreen({
    onEnterFullscreen: () => close(true),
    onExitFullscreen: () => close(true),
  }, []);

  useEffect(() => {
    toggle(false);
  }, [isInline]);

  useEffect(() => {
    if (!ref) return;

    const refValue: DropdownRef = {
      dropdown: dropdown.current!,
      visible: visibility !== null,
      toggle,
      open,
      close,
    };

    if (ref instanceof Function) {
      ref(refValue);
    } else {
      ref.current = refValue;
    }
  }, [close, open, ref, toggle, dropdown, visibility]);

  useEffect(() => {
    setVisible(visible);
  }, [visible]);

  useEffect(() => {
    if (!isInline && visibility === 'before-appear') {
      calculatePosition();
    }
  }, [visibility, calculatePosition, isInline]);

  useEffect(() => {
    if (props.enabled === false) performAnimation(false);
  }, [props.enabled]);

  useEffect(() => {
    if (visible) {
      open();
    } else {
      close();
    }
  }, [visible]);

  const content = useMemo(() => {
    const ch = children as any;

    return ch.props && ch.props.type === 'Menu'
      ? cloneElement(ch, {
        ...ch.props,
        className: rootName.elem('menu').mix(ch.props.className),
      })
      : children;
  }, [children]);


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
        return visible ? 'visible' : null;
    }
  }, [visibility, visible]);

  const compositeStyles = useMemo(() => {

    return {
      ...(props.style ?? {}),
      ...(offset ?? {}),
      zIndex: (minIndex ?? 1000) + dropdownIndex,
    };
  }, [props.style, dropdownIndex, minIndex, offset]);

  const result = (
    <Block
      ref={dropdown}
      name="dropdown"
      data-testid={props.dataTestId}
      mix={[props.className, visibilityClasses]}
      style={{
        ...compositeStyles,
        borderRadius: isFF(FF_DEV_3873) && 4,
      }}
      onClick={(e: MouseEvent) => e.stopPropagation()}
    >
      {content}
    </Block>
  );

  return props.inline === true
    ? result
    : createPortal(result, document.body);
});

Dropdown.displayName = 'Dropdown';
