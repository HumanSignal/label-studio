import {
  cloneElement,
  type CSSProperties,
  forwardRef,
  type MouseEvent,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cnb as cn } from "@humansignal/core/lib/utils/bem";
import { alignElements, type Align } from "@humansignal/core/lib/utils/dom";
import { aroundTransition } from "@humansignal/core/lib/utils/transition";
import { DropdownContext } from "./dropdown-context";
import { DropdownTrigger } from "./dropdown-trigger";

import "./dropdown.scss";

let zIndexCounter = 0;

export interface DropdownRef {
  dropdown: HTMLElement;
  visible: boolean;
  toggle(newState?: boolean, disableAnimation?: boolean): void;
  open(disableAnimation?: boolean): void;
  close(disableAnimation?: boolean): void;
}

export interface DropdownProps {
  /** Enable animation on open/close */
  animated?: boolean;
  /** Control dropdown visibility */
  visible?: boolean;
  /** Dropdown alignment relative to trigger (e.g., "bottom-left", "top-right") */
  alignment?: Align;
  /** Enable/disable dropdown (when disabled, prevents opening) */
  enabled?: boolean;
  /** Render inline instead of using portal */
  inline?: boolean;
  /** CSS class name for dropdown element */
  className?: string;
  /** Additional CSS class name for dropdown element (from DataManager) */
  dropdownClassName?: string;
  /** Data-testid attribute for testing */
  dataTestId?: string;
  /** Custom styles for dropdown element */
  style?: CSSProperties;
  /** Dropdown content */
  children?: React.ReactNode;
  /** Callback when dropdown visibility changes */
  onToggle?: (visible: boolean) => void;
  /** Additional callback when visibility changes (from LabelStudio) */
  onVisibilityChanged?: (visible: boolean) => void;
  /**
   * Open dropdown upward for short viewports (from DataManager)
   * @deprecated This is now handled automatically by CSS anchor positioning with position-try fallbacks
   */
  openUpwardForShortViewport?: boolean;
  /** Constrain dropdown height to prevent overflow (from DataManager) */
  constrainHeight?: boolean;
  /** Sync dropdown width to match trigger width */
  syncWidth?: boolean;
}

const DropdownComponent = forwardRef<DropdownRef, DropdownProps>(
  ({ animated = true, visible = false, dropdownClassName, ...props }, ref) => {
    const rootName = cn("dropdown");

    const dropdown = useRef<HTMLElement>();
    const { triggerRef, minIndex } = useContext(DropdownContext) ?? {};
    const isInline = triggerRef === undefined;

    const { children } = props;
    const [currentVisible, setVisible] = useState(visible);
    const [offset, setOffset] = useState({});
    const [visibility, setVisibility] = useState(visible ? "visible" : null);
    const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined);
    const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);

    // Check if browser supports CSS anchor positioning
    const supportsAnchorPositioning = useMemo(() => {
      if (!CSS.supports) return false;
      return (
        CSS.supports("anchor-name: --test") ||
        CSS.supports("anchor-name", "--test") ||
        CSS.supports("position-anchor", "--test") ||
        CSS.supports("position-anchor: --test")
      );
    }, []);

    // Generate stable unique ID for this dropdown instance using React.useId()
    const dropdownId = useId();
    const anchorName = `--dropdown-trigger-${dropdownId.replace(/:/g, "-")}`;

    // Generate stable z-index for stacking
    const dropdownZIndex = useRef(1000 + zIndexCounter++).current;

    // Determine if anchor positioning should be used
    // Only enable when browser supports it AND there's a trigger element to anchor to
    const hasTrigger = triggerRef?.current != null;
    const isAnchorEnabled = supportsAnchorPositioning && hasTrigger;

    // Set anchor-name on trigger element for CSS anchor positioning
    useEffect(() => {
      if (isAnchorEnabled && triggerRef?.current) {
        (triggerRef.current as HTMLElement).style.anchorName = anchorName;
      }
    }, [isAnchorEnabled, triggerRef, anchorName]);

    // Set position-anchor on dropdown element dynamically
    useEffect(() => {
      if (isAnchorEnabled && dropdown.current) {
        (dropdown.current as HTMLElement).style.positionAnchor = anchorName;
      }
    }, [isAnchorEnabled, anchorName, visibility]);

    // Sync dropdown width with trigger width when syncWidth is enabled
    // Only use JavaScript measurement as fallback when anchor positioning is not supported
    useEffect(() => {
      if (!props.syncWidth || !triggerRef?.current || supportsAnchorPositioning) return;

      const updateWidth = () => {
        const width = (triggerRef.current as HTMLElement).offsetWidth;
        setTriggerWidth(width);
      };

      // Update width initially and when visibility changes
      updateWidth();

      // Use ResizeObserver to track trigger size changes
      const resizeObserver = new ResizeObserver(updateWidth);
      resizeObserver.observe(triggerRef.current as HTMLElement);

      return () => {
        resizeObserver.disconnect();
      };
    }, [props.syncWidth, triggerRef, visibility, supportsAnchorPositioning]);

    const calculatePosition = useCallback(() => {
      const dropdownEl = dropdown.current!;
      const parent = (triggerRef?.current ?? dropdownEl.parentNode) as HTMLElement;
      const result = alignElements(
        parent!,
        dropdownEl,
        props.alignment || "bottom-left",
        0,
        props.constrainHeight,
        props.openUpwardForShortViewport ?? true,
      );

      setOffset({ left: result.left, top: result.top });

      // Store maxHeight from alignElements for fallback positioning
      if (props.constrainHeight && result.maxHeight) {
        setMaxHeight(result.maxHeight);
      }
    }, [triggerRef, minIndex, props.alignment, props.constrainHeight, props.openUpwardForShortViewport]);

    const performAnimation = useCallback(
      async (visible = false, disableAnimation?: boolean) => {
        if (props.enabled === false && visible === true) return;

        return new Promise<void>((resolve) => {
          const menu = dropdown.current;

          // Guard: if dropdown ref isn't set yet, skip animation and set visibility directly
          if (!menu) {
            setVisibility(visible ? "visible" : null);
            resolve();
            return;
          }

          if (animated === false || disableAnimation === true) {
            setVisibility(visible ? "visible" : null);
            resolve();
            return;
          }

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
        });
      },
      [animated, props.enabled],
    );

    const toggle = useCallback(
      async (updatedState?: boolean, disableAnimation?: boolean) => {
        const newState = updatedState ?? !currentVisible;

        if (currentVisible !== newState) {
          props.onToggle?.(newState);
          const animStart = performance.now();
          await performAnimation(newState, disableAnimation);
          setVisible(newState);
          props.onVisibilityChanged?.(newState);
        }
      },
      [currentVisible, performAnimation, props],
    );

    const close = useCallback(
      async (disableAnimation?: boolean) => {
        await toggle(false, disableAnimation);
      },
      [toggle],
    );

    const open = useCallback(
      async (disableAnimation?: boolean) => {
        await toggle(true, disableAnimation);
      },
      [toggle],
    );

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
      // Calculate position if anchor positioning is not supported
      // OR if constrainHeight is enabled (we need maxHeight calculation)
      if (!isInline && visibility === "before-appear" && (!supportsAnchorPositioning || props.constrainHeight)) {
        calculatePosition();
      }
    }, [visibility, calculatePosition, isInline, supportsAnchorPositioning, props.constrainHeight]);

    useEffect(() => {
      if (props.enabled === false) performAnimation(false);
    }, [props.enabled, performAnimation]);

    // Recalculate position on window resize when constrainHeight is enabled
    useEffect(() => {
      if (!props.constrainHeight || !currentVisible) return;

      const handleResize = () => {
        calculatePosition();
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, [props.constrainHeight, currentVisible, calculatePosition]);

    const content = useMemo(() => {
      const ch = children as any;

      return ch?.props && ch.props.type === "Menu"
        ? cloneElement(ch, {
            ...ch.props,
            className: rootName.elem("menu").mix(ch.props.className),
          })
        : children;
    }, [children, rootName]);

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
          // Use 'mounted' class when visibility is null to keep element in DOM for anchor positioning
          return visible ? "visible" : "mounted";
      }
    }, [visibility, visible]);

    const compositeStyles = useMemo(() => {
      // Determine if we should use anchor positioning for this dropdown
      // Only use anchor positioning when there's a trigger element to anchor to
      const useAnchor = supportsAnchorPositioning && hasTrigger;

      // Build anchor positioning styles when enabled
      const anchorStyles: Record<string, string> = {};
      if (useAnchor) {
        const alignment = props.alignment || "bottom-left";
        const [vertical, horizontal] = alignment.split("-");

        // Set initial position based on alignment
        if (vertical === "bottom") {
          anchorStyles.top = "anchor(bottom)";
          anchorStyles.bottom = "auto";
        } else {
          anchorStyles.bottom = "anchor(top)";
          anchorStyles.top = "auto";
        }

        if (horizontal === "left") {
          anchorStyles.left = "anchor(left)";
          anchorStyles.right = "auto";
        } else if (horizontal === "right") {
          anchorStyles.right = "anchor(right)";
          anchorStyles.left = "auto";
        } else if (horizontal === "center") {
          anchorStyles.left = "anchor(center)";
          anchorStyles.right = "auto";
          anchorStyles.translate = "-50% 0";
        }

        // Generate exhaustive fallback order based on alignment preference
        const allPositions = ["bottom-left", "bottom-center", "bottom-right", "top-left", "top-center", "top-right"];
        const currentPosition = `${vertical}-${horizontal}`;
        const oppositeVertical = vertical === "bottom" ? "top" : "bottom";

        // Build prioritized fallback list
        const fallbacks: string[] = [];

        // 1. Opposite vertical with same horizontal (most likely to fit)
        fallbacks.push(`--dropdown-${oppositeVertical}-${horizontal}`);

        // 2. Same vertical, alternate horizontals
        const sameVerticalAlternates = allPositions
          .filter((pos) => pos.startsWith(vertical) && pos !== currentPosition)
          .map((pos) => `--dropdown-${pos}`);
        fallbacks.push(...sameVerticalAlternates);

        // 3. Opposite vertical, alternate horizontals (excluding already added)
        const oppositeVerticalAlternates = allPositions
          .filter((pos) => pos.startsWith(oppositeVertical) && pos !== `${oppositeVertical}-${horizontal}`)
          .map((pos) => `--dropdown-${pos}`);
        fallbacks.push(...oppositeVerticalAlternates);

        // 4. Generic flip fallbacks as last resort
        fallbacks.push("flip-block", "flip-inline");

        anchorStyles.positionTryFallbacks = fallbacks.join(", ");
      }

      return {
        // Apply anchor positioning styles OR JS-calculated offset for fallback
        ...(useAnchor ? anchorStyles : (offset ?? {})),
        zIndex: (minIndex ?? 0) + dropdownZIndex,
        // Apply width sync if enabled (only for fallback when anchor positioning is not used)
        ...(!useAnchor && props.syncWidth && triggerWidth ? { width: triggerWidth, minWidth: triggerWidth } : {}),
        // Apply height constraint when enabled
        // Always apply maxHeight for constrainHeight since CSS can't do dynamic calculations
        // Subtract 8px for bottom padding when constrainHeight is enabled
        ...(props.constrainHeight && maxHeight ? { maxHeight: maxHeight - 8 } : {}),
        // props.style last so it can override positioning if needed
        ...(props.style ?? {}),
      };
    }, [
      props.style,
      props.alignment,
      hasTrigger,
      dropdownZIndex,
      minIndex,
      offset,
      supportsAnchorPositioning,
      props.syncWidth,
      triggerWidth,
      props.constrainHeight,
      maxHeight,
    ]);

    // Only render content when dropdown has been opened at least once
    // This improves performance and ensures autofocus works correctly
    const shouldRenderContent = currentVisible || visibility !== null;

    const result = (
      <div
        ref={dropdown as any}
        data-testid={props.dataTestId}
        className={rootName
          .mod({
            "sync-width": props.syncWidth,
            "constrain-height": props.constrainHeight,
          })
          .mix(props.className, dropdownClassName, visibilityClasses)
          .toClassName()}
        style={compositeStyles}
        onClick={(e: MouseEvent) => e.stopPropagation()}
      >
        {shouldRenderContent ? content : null}
      </div>
    );

    return props.inline === true ? result : createPortal(result, document.body);
  },
);

DropdownComponent.displayName = "Dropdown";

// Create properly typed Dropdown with static Trigger property
export const Dropdown = Object.assign(DropdownComponent, {
  Trigger: DropdownTrigger,
});
