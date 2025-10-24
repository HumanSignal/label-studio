import {
  type FC,
  type MouseEvent as RMouseEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  useEffect,
} from "react";
import { cn } from "../../../utils/bem";
import {
  IconChevronLeft,
  IconChevronRight,
  IconOutlinerDrag,
  IconCollapseSmall,
  IconExpandSmall,
} from "@humansignal/icons";
import { useDrag } from "../../../hooks/useDrag";
import { clamp, isDefined } from "../../../utils/utilities";
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_MIN_HEIGHT, DEFAULT_PANEL_WIDTH, PANEL_HEADER_HEIGHT } from "../constants";
import { type BaseProps as OrigBaseProps, Side } from "./types";
import { resizers } from "./utils";
import "./PanelTabsBase.scss";
import React from "react";

const distance = (x1: number, x2: number, y1: number, y2: number) => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};

const TABS_ROW_HEIGHT = 33;
const MIN_HEIGHT = 100;
const MAX_HEIGHT = 800;

interface BasePropsWithChildren extends OrigBaseProps {
  children?: ReactNode;
  isBottomPanel?: boolean;
  contentRef?: React.RefObject<HTMLDivElement>;
}

export const PanelTabsBase: FC<BasePropsWithChildren> = ({
  name: key,
  root,
  width,
  maxWidth,
  height,
  visible,
  detached,
  alignment,
  top,
  left,
  relativeTop,
  relativeLeft,
  zIndex,
  locked = false,
  positioning = false,
  onSnap,
  onResize,
  onGroupHeightResize,
  onResizeStart,
  onResizeEnd,
  onVisibilityChange,
  onPositionChange,
  onPositionChangeBegin,
  children,
  panelViews,
  attachedKeys,
  sidePanelCollapsed,
  setSidePanelCollapsed,
  dragTop,
  dragBottom,
  lockPanelContents,
  isBottomPanel,
  contentRef,
  ...props
}) => {
  const headerRef = useRef<HTMLDivElement>();
  const panelRef = useRef<HTMLDivElement>();
  const resizerRef = useRef<HTMLDivElement>();
  const resizeGroup = useRef<HTMLDivElement>();
  const handlers = useRef({
    onResize,
    onGroupHeightResize,
    onResizeStart,
    onResizeEnd,
    onPositionChange,
    onPositionChangeBegin,
    onVisibilityChange,
    onSnap,
  });
  const [resizing, setResizing] = useState<string | undefined>();
  const keyRef = useRef(key);
  const collapsed = sidePanelCollapsed[alignment as Side] && !detached;
  const isParentOfCollapsedPanel = attachedKeys && attachedKeys[0] === key;
  const isChildOfGroup = attachedKeys && attachedKeys.includes(key) && attachedKeys[0] !== key;
  const collapsedHeader = !(collapsed && !isParentOfCollapsedPanel);
  const tooltipText = visible && !collapsed ? "Collapse" : "Expand";
  const settings = props.currentEntity?.store?.settings || props.currentEntity?.settings;
  const [bottomCollapsed, setBottomCollapsed] = useState(() => {
    if (isBottomPanel && settings?.defaultCollapsedBottomPanel) return true;
    return false;
  });
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const collapsibleBottomPanel = settings?.collapsibleBottomPanel ?? false;

  handlers.current = {
    onResize,
    onGroupHeightResize,
    onResizeStart,
    onResizeEnd,
    onPositionChange,
    onPositionChangeBegin,
    onVisibilityChange,
    onSnap,
  };
  keyRef.current = key;

  const style = useMemo(() => {
    // If bottom panel and collapsed, only show tabs row
    if (isBottomPanel && bottomCollapsed) {
      return {
        height: `${TABS_ROW_HEIGHT}px`,
        zIndex,
        borderTop: "1px solid var(--color-neutral-border)",
      };
    }
    if (isBottomPanel && collapsibleBottomPanel) {
      return {
        height: `${panelHeight}px`,
        zIndex,
      };
    }
    const dynamicStyle = visible
      ? {
          height: locked ? DEFAULT_PANEL_HEIGHT : collapsed ? "100%" : (height ?? "100%"),
          width: locked ? "100%" : !collapsed ? (width ?? "100%") : PANEL_HEADER_HEIGHT,
        }
      : {
          width: collapsed ? "100%" : (width ?? DEFAULT_PANEL_WIDTH),
          height: collapsed ? "100%" : PANEL_HEADER_HEIGHT,
        };

    return {
      ...dynamicStyle,
      zIndex,
    };
  }, [
    width,
    height,
    visible,
    locked,
    collapsed,
    zIndex,
    isBottomPanel,
    bottomCollapsed,
    collapsibleBottomPanel,
    panelHeight,
  ]);

  useEffect(() => {
    if (contentRef?.current) {
      if (isBottomPanel && bottomCollapsed) {
        contentRef.current.style.height = `calc(100% - ${TABS_ROW_HEIGHT}px)`;
      } else if (isBottomPanel && collapsibleBottomPanel) {
        contentRef.current.style.height = `calc(100% - ${panelHeight}px)`;
      }
    }
  }, [panelHeight, isBottomPanel, bottomCollapsed, collapsibleBottomPanel]);

  const coordinates = useMemo(() => {
    return detached && !locked
      ? {
          top: `${relativeTop}%`,
          left: `${relativeLeft}%`,
        }
      : {};
  }, [detached, relativeTop, relativeLeft, locked]);

  const mods = useMemo(() => {
    return {
      detached: locked ? false : detached,
      hidden: !visible,
      alignment: detached ? "left" : (alignment ?? "left"),
      disabled: locked,
      collapsed,
      dragTop: dragTop && attachedKeys && attachedKeys[0] === key,
      dragBottom: dragBottom && attachedKeys && attachedKeys[attachedKeys.length - 1] === key,
    };
  }, [alignment, visible, detached, resizing, locked, collapsed, dragTop, dragBottom]);

  // Panel positioning
  useDrag(
    {
      elementRef: headerRef,
      disabled: locked,

      onMouseDown(e: any) {
        const el = e.target as HTMLElement;
        const collapseClassName = "[class*=__toggle]";

        if (el.matches(collapseClassName) || el.closest(collapseClassName) || collapsed) return;

        const allowDrag = true;
        const panel = panelRef.current!;
        const parentBBox = root.current!.getBoundingClientRect();
        const bbox = panel.getBoundingClientRect();
        const clickTarget = e.target?.getBoundingClientRect();
        const tx = e.clientX - clickTarget.left;
        const ty = e.clientY - clickTarget.top;

        const [x, y] = [e.pageX, e.pageY];
        const [oX, oY] = [bbox.left - parentBBox.left, bbox.top - parentBBox.top];

        const { current: key } = keyRef;
        const [nX, nY] = [x - tx, y - ty];

        handlers.current.onPositionChangeBegin?.(key, nX, nY, alignment, detached);

        return { x, y, oX, oY, allowDrag, alignment, key };
      },

      onMouseMove(e, data) {
        if (!data) return;
        const { x, y, oX, oY, key: draggingKey } = data;
        const [mX, mY] = [e.pageX, e.pageY];
        const dist = distance(x, mX, y, mY);

        if (dist < 30) return;
        const [nX, nY] = [oX + (mX - x), oY + (mY - y)];

        handlers.current.onPositionChange?.(draggingKey, nY, nX, true, alignment);
      },

      onMouseUp(_, data) {
        if (!data) return;
        const { key: draggingKey } = data;

        handlers.current.onSnap?.(draggingKey);
      },
    },
    [detached, visible, locked, alignment, key, collapsed, headerRef.current],
  );

  // Panel resizing
  useDrag(
    {
      elementRef: resizerRef,
      disabled: locked || positioning,
      capture: true,
      passive: true,

      onMouseDown(e) {
        const target = e.target as HTMLElement;
        const type = target.dataset.resize;
        const shift = (() => {
          switch (type) {
            case "top-left":
              return "top-left";
            case "top":
            case "top-right":
              return "top";
            case "left":
            case "bottom-left":
              return "left";
          }
        })();
        const resizeDirections = (() => {
          return {
            x: type?.match(/left|right/i) !== null,
            y: type?.match(/top|bottom/i) !== null,
          };
        })();

        setResizing(type);
        handlers.current.onResizeStart?.();

        return { pos: [e.pageX, e.pageY], type, width, maxWidth, height, top, left, resizeDirections, shift };
      },
      onMouseMove(e, data) {
        if (data) {
          const { pos, width: w, height: h, maxWidth, top: t, left: l, resizeDirections, shift } = data;
          const [sX, sY] = pos;

          const wMod = resizeDirections.x ? e.pageX - sX : 0;
          const hMod = resizeDirections.y ? e.pageY - sY : 0;

          const shiftLeft = isDefined(shift) && ["left", "top-left"].includes(shift);
          const shiftTop = isDefined(shift) && ["top", "top-left"].includes(shift);

          const width = clamp(shiftLeft ? w - wMod : w + wMod, DEFAULT_PANEL_WIDTH, maxWidth);
          const height = clamp(shiftTop ? h - hMod : h + hMod, DEFAULT_PANEL_MIN_HEIGHT, t + h);

          const top = shiftTop ? t + (h - height) : t;
          const left = shiftLeft ? l + (w - width) : l;
          const { current: key } = keyRef;

          handlers.current.onResize(key, width, height, top, left);
        }
      },
      onMouseUp() {
        handlers.current.onResizeEnd?.();
        setResizing(undefined);
      },
    },
    [handlers, detached, width, maxWidth, height, top, left, visible, locked, positioning],
  );

  // Panel grouped resize height
  useDrag(
    {
      elementRef: resizeGroup,
      disabled: locked || positioning,
      capture: true,
      passive: true,

      onMouseDown(e) {
        setResizing("grouped-top");
        handlers.current.onResizeStart?.();
        return { sY: e.pageY, h: height };
      },
      onMouseMove(e, data) {
        if (!data) return;
        const { sY, h } = data;
        const top = e.pageY - sY;
        const height = h - top;
        const { current: key } = keyRef;

        handlers.current.onGroupHeightResize?.(key, height, top);
      },
      onMouseUp() {
        handlers.current.onResizeEnd?.();
        setResizing(undefined);
      },
    },
    [handlers, width, height, top, left, locked, positioning, resizeGroup.current],
  );

  const handleGroupPanelToggle = () => {
    setSidePanelCollapsed({ ...sidePanelCollapsed, [alignment]: !sidePanelCollapsed[alignment as Side] });
  };

  const handlePanelToggle = useCallback(
    (e: RMouseEvent<HTMLOrSVGElement>) => {
      e.stopPropagation();
      e.preventDefault();
      onVisibilityChange?.(key, !visible);
    },
    [onVisibilityChange, key, visible],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const deltaY = startY.current - e.clientY;
      const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeight.current + deltaY));
      setPanelHeight(newHeight);
    };
    const onMouseUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const handleDividerDoubleClick = () => {
    setPanelHeight(DEFAULT_PANEL_HEIGHT);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    startY.current = e.clientY;
    startHeight.current = panelHeight;
  };

  return (
    <div
      ref={panelRef as any}
      className={cn("tabs-panel").mod(mods).toClassName()}
      style={{ ...style, ...coordinates }}
    >
      {isBottomPanel && collapsibleBottomPanel && !bottomCollapsed && (
        <div
          className="w-full h-2 absolute -top-2 left-0 cursor-row-resize bg-neutral-emphasis hover:bg-primary-border active:bg-primary-border transition-colors duration-100 select-none z-10"
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDividerDoubleClick}
          role="separator"
          aria-orientation="horizontal"
          tabIndex={-1}
        />
      )}
      <div className={cn("tabs-panel").elem("content").toClassName()}>
        {!locked && collapsedHeader && (
          <>
            {isChildOfGroup && visible && (
              <div
                className={cn("tabs-panel")
                  .elem("grouped-top")
                  .mod({ drag: "grouped-top" === resizing })
                  .toClassName()}
                ref={resizeGroup as any}
                data-resize={"grouped-top"}
              />
            )}
            <div
              ref={headerRef as any}
              onClick={() => {
                if (collapsed) handleGroupPanelToggle();
              }}
              id={key}
              className={cn("tabs-panel").elem("header").mod({ collapsed }).toClassName()}
            >
              <div className={cn("tabs-panel").elem("header-left").toClassName()}>
                {!collapsed && (
                  <IconOutlinerDrag
                    className={cn("tabs-panel").elem("icon").toClassName()}
                    style={{ pointerEvents: "none" }}
                  />
                )}
                {!visible && !collapsed && (
                  <div className={cn("tabs-panel").elem("title").toClassName()}>
                    {panelViews.map((view) => view.title).join(" ")}
                  </div>
                )}
              </div>
              <div className={cn("tabs-panel").elem("header-right").toClassName()}>
                {(!detached || collapsed) && (
                  <div
                    className={cn("tabs-panel").elem("toggle").mod({ detached, collapsed, alignment }).toClassName()}
                    onClick={handleGroupPanelToggle}
                    data-tooltip={`${tooltipText} Group`}
                  >
                    {Side.left === alignment ? <IconChevronLeft /> : <IconChevronRight />}
                  </div>
                )}
                {!collapsed && (
                  <div
                    className={cn("tabs-panel").elem("toggle").mod({ detached, collapsed, alignment }).toClassName()}
                    onClick={handlePanelToggle}
                    data-tooltip={tooltipText}
                  >
                    {visible ? <IconCollapseSmall /> : <IconExpandSmall />}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {visible && !collapsed && (
          <div className={cn("tabs-panel").elem("body").toClassName()}>
            {lockPanelContents && <div className={cn("tabs-panel").elem("shield").toClassName()} />}
            {(() => {
              const onlyChild = React.Children.only(children);
              if (React.isValidElement(onlyChild) && (onlyChild.type as any).displayName === "Tabs") {
                return React.cloneElement(onlyChild, {
                  isBottomPanel: isBottomPanel as boolean,
                  bottomCollapsed,
                  setBottomCollapsed,
                  settings,
                  panelHeight,
                } as Partial<typeof onlyChild.props>);
              }
              return children;
            })()}
          </div>
        )}
      </div>
      {visible && !positioning && !locked && (
        <div
          className={cn("tabs-panel")
            .elem("resizers")
            .mod({ locked: positioning || locked })
            .toClassName()}
          ref={resizerRef as any}
        >
          {resizers.map((res) => {
            const shouldRender = collapsed
              ? false
              : ((res === "left" || res === "right") && alignment !== res) || detached;

            return shouldRender ? (
              <div
                key={res}
                className={cn("tabs-panel")
                  .elem("resizer")
                  .mod({ drag: res === resizing })
                  .toClassName()}
                data-resize={res}
              />
            ) : null;
          })}
        </div>
      )}
    </div>
  );
};
