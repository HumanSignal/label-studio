import { observer } from 'mobx-react';
import { CSSProperties, FC, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Block, Elem } from '../../utils/bem';
import { DetailsPanel } from './DetailsPanel/DetailsPanel';
import { OutlinerPanel } from './OutlinerPanel/OutlinerPanel';

import { IconDetails, IconHamburger } from '../../assets/icons';
import { useMedia } from '../../hooks/useMedia';
import ResizeObserver from '../../utils/resize-observer';
import { clamp } from '../../utils/utilities';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_MAX_HEIGHT, DEFAULT_PANEL_MAX_WIDTH, DEFAULT_PANEL_WIDTH, PANEL_HEADER_HEIGHT, PANEL_HEADER_HEIGHT_PADDED } from './constants';
import { PanelProps } from './PanelBase';
import './SidePanels.styl';
import { SidePanelsContext } from './SidePanelsContext';
import { useRegionsCopyPaste } from '../../hooks/useRegionsCopyPaste';
import { FF_DEV_3873, isFF } from '../../utils/feature-flags';

const maxWindowWidth = 980;

interface SidePanelsProps {
  panelsHidden: boolean;
  store: any;
  currentEntity: any;
}

interface PanelBBox {
  width: number;
  height: number;
  left: number;
  top: number;
  relativeLeft: number;
  relativeTop: number;
  storedTop?: number;
  storedLeft?: number;
  maxHeight: number;
  zIndex: number;
  visible: boolean;
  detached: boolean;
  alignment: 'left' | 'right';
}

interface PanelView<T extends PanelProps = PanelProps> {
  title: string;
  component: FC<T>;
  icon: FC;
}

export type PanelType = 'outliner' | 'details';

type PanelSize = Record<PanelType, PanelBBox>;

const restorePanel = (name: PanelType, defaults: PanelBBox) => {
  const panelData = window.localStorage.getItem(`panel:${name}`);

  return panelData ? {
    ...defaults,
    ...JSON.parse(panelData),
  } : defaults;
};

const savePanel = (name: PanelType, panelData: PanelBBox) => {
  window.localStorage.setItem(`panel:${name}`, JSON.stringify(panelData));
};

const panelView: Record<PanelType, PanelView> = {
  outliner: {
    title: 'Outliner',
    component: OutlinerPanel as FC<PanelProps>,
    icon: IconHamburger,
  },
  details: {
    title: 'Details',
    component: DetailsPanel as FC<PanelProps>,
    icon: IconDetails,
  },
};

const SidePanelsComponent: FC<SidePanelsProps> = ({
  currentEntity,
  panelsHidden,
  children,
}) => {
  const snapTreshold = 5;
  const regions = currentEntity.regionStore;
  const viewportSize = useRef({ width: 0, height: 0 });
  const screenSizeMatch = useMedia(`screen and (max-width: ${maxWindowWidth}px)`);
  const [panelMaxWidth, setPanelMaxWidth] = useState(DEFAULT_PANEL_MAX_WIDTH);
  const [viewportSizeMatch, setViewportSizeMatch] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [positioning, setPositioning] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const rootRef = useRef<HTMLDivElement>();
  const [snap, setSnap] = useState<'left' | 'right' | undefined>();
  const localSnap = useRef(snap);
  const [panelData, setPanelData] = useState<PanelSize>({
    outliner: restorePanel('outliner', {
      top: 0,
      left: 0,
      relativeLeft: 0,
      relativeTop: 0,
      zIndex: 1,
      width: DEFAULT_PANEL_WIDTH,
      height: DEFAULT_PANEL_HEIGHT,
      visible: true,
      detached: false,
      alignment: 'left',
      maxHeight: DEFAULT_PANEL_MAX_HEIGHT,
    }),
    details: restorePanel('details', {
      top: 0,
      left: 0,
      relativeLeft: 0,
      relativeTop: 0,
      zIndex: 1,
      width: DEFAULT_PANEL_WIDTH,
      height: DEFAULT_PANEL_HEIGHT,
      visible: true,
      detached: false,
      alignment: 'right',
      maxHeight: DEFAULT_PANEL_MAX_HEIGHT,
    }),
  });

  useRegionsCopyPaste(currentEntity);

  const sidepanelsCollapsed = useMemo(() => {
    return viewportSizeMatch || screenSizeMatch.matches;
  }, [viewportSizeMatch, screenSizeMatch.matches]);

  const updatePanel = useCallback((
    name: PanelType,
    patch: Partial<PanelBBox>,
  ) => {
    setPanelData((state) => {
      const panel = { ...state[name], ...patch };

      savePanel(name, panel);

      return {
        ...state,
        [name]: panel,
      };
    });
  }, [panelData]);

  const onVisibilityChange = useCallback((name: PanelType, visible: boolean) => {
    const panel = panelData[name];
    const position = normalizeOffsets(name, panel.top, panel.left, visible);

    updatePanel(name, {
      visible,
      storedTop: position.top / viewportSize.current.height * 100,
      storedLeft: position.left / viewportSize.current.width * 100,
    });
  }, [updatePanel]);

  const spaceFree = useCallback((alignment: 'left' | 'right') => {
    return isFF(FF_DEV_3873) || Object.values(panelData).find(p => p.alignment === alignment && !p.detached) === undefined;
  }, [panelData]);

  const checkSnap = useCallback((left: number, parentWidth: number, panelWidth: number) => {
    const right = left + panelWidth;
    const rightLimit = parentWidth - snapTreshold;

    if (left >= 0 && left <= snapTreshold && spaceFree('left')) {
      setSnap('left');
    } else if (right <= parentWidth && right >= rightLimit && spaceFree('right')) {
      setSnap('right');
    } else {
      setSnap(undefined);
    }

  }, [spaceFree]);

  const normalizeOffsets = (name: PanelType, top: number, left: number, visible?: boolean) => {
    const panel = panelData[name];
    const parentWidth = rootRef.current?.clientWidth ?? 0;
    const height = panel.detached
      ? (visible ?? panel.visible) ? panel.height : PANEL_HEADER_HEIGHT_PADDED
      : panel.height;
    const normalizedLeft = clamp(left, 0, parentWidth - panel.width);
    const normalizedTop = clamp(top, 0, (rootRef.current?.clientHeight ?? 0) - height);

    return {
      left: normalizedLeft,
      top: normalizedTop,
    };
  };

  const onPositionChangeBegin = useCallback((name: PanelType) => {
    const patch = Object.entries(panelData).reduce<PanelSize>((res, [panelName, panelData]) => {
      const panel = { ...panelData, zIndex: 1 };

      setPositioning(true);
      savePanel(panelName as PanelType, panel);
      return { ...res, [panelName]: panel };
    }, { ...panelData });

    patch[name] = {
      ...patch[name],
      zIndex: 15,
    };

    savePanel(name, patch[name]);
    setPanelData(patch);
  }, [panelData]);

  const onPositionChange = useCallback((name: PanelType, t: number, l: number, detached: boolean) => {
    const panel = panelData[name];
    const parentWidth = rootRef.current?.clientWidth ?? 0;

    const { left, top } = normalizeOffsets(name, t, l, panel.visible);
    const maxHeight = viewportSize.current.height - top;

    checkSnap(left, parentWidth, panel.width);

    requestAnimationFrame(() => {
      updatePanel(name, {
        top,
        left,
        relativeTop: top / viewportSize.current.height * 100,
        relativeLeft: left / viewportSize.current.width * 100,
        storedLeft: undefined,
        storedTop: undefined,
        detached,
        maxHeight,
        alignment: detached ? undefined : panel.alignment,
      });
    });
  }, [updatePanel, checkSnap, panelData]);

  const onResizeStart = useCallback(() => {
    setResizing(() => true);
  }, []);

  const onResizeEnd = useCallback(() => {
    setResizing(() => false);
  }, []);

  const findPanelsOnSameSide = useCallback((panelAlignment : string) => {
    return Object.keys(panelData)
      .filter((panelName) => panelData[panelName as PanelType]?.alignment === panelAlignment);
  }, [panelData]);

  const onResize = useCallback((name: PanelType, w: number, h: number, t: number, l: number) => {
    const { left, top } = normalizeOffsets(name, t, l);
    const maxHeight = viewportSize.current.height - top;

    requestAnimationFrame(() => {
      if (isFF(FF_DEV_3873)) {
        const panelsOnSameAlignment = findPanelsOnSameSide(panelData[name]?.alignment);
  
        panelsOnSameAlignment.forEach((panelName) => {
          updatePanel(panelName as PanelType, {
            top,
            left,
            relativeTop: top / viewportSize.current.height * 100,
            relativeLeft: left / viewportSize.current.width * 100,
            storedLeft: undefined,
            storedTop: undefined,
            maxHeight,
            width: clamp(w, DEFAULT_PANEL_WIDTH, panelMaxWidth),
            height: clamp(h, DEFAULT_PANEL_HEIGHT, maxHeight),
          });
        });
      } else {
        updatePanel(name, {
          top,
          left,
          relativeTop: top / viewportSize.current.height * 100,
          relativeLeft: left / viewportSize.current.width * 100,
          storedLeft: undefined,
          storedTop: undefined,
          maxHeight,
          width: clamp(w, DEFAULT_PANEL_WIDTH, panelMaxWidth),
          height: clamp(h, DEFAULT_PANEL_HEIGHT, maxHeight),
        });
      }
    });
  }, [updatePanel, panelMaxWidth, panelData]);

  const onSnap = useCallback((name: PanelType) => {
    setPositioning(false);

    if (!localSnap.current) return;
    const bboxData: Partial<PanelBBox> = {
      alignment: localSnap.current,
      detached: false,
    };

    if (isFF(FF_DEV_3873)) {
      const firstPanelOnNewSideName = findPanelsOnSameSide(localSnap.current).filter(panelName => panelName !== name)?.[0];

      if (firstPanelOnNewSideName) {
        bboxData.width = clamp(panelData[firstPanelOnNewSideName as PanelType]?.width, DEFAULT_PANEL_WIDTH, panelMaxWidth);
      }
    }
    updatePanel(name, bboxData);
    setSnap(undefined);
  }, [updatePanel]);

  const eventHandlers = useMemo(() => {
    return {
      onResize,
      onResizeStart,
      onResizeEnd,
      onPositionChange,
      onVisibilityChange,
      onPositionChangeBegin,
      onSnap,
    };
  }, [onResize, onResizeStart, onResizeEnd, onPositionChange, onVisibilityChange, onSnap]);

  const commonProps = useMemo(() => {
    return {
      ...eventHandlers,
      root: rootRef,
      regions,
      selection: regions.selection,
      currentEntity,
    };
  }, [eventHandlers, rootRef, regions, regions.selectio, currentEntity]);

  const padding = useMemo(() => {
    if (panelsHidden && isFF(FF_DEV_3873)) return {};

    const result = {
      paddingLeft: 0,
      paddingRight: 0,
    };

    if (sidepanelsCollapsed) {
      return result;
    }

    return Object.values(panelData).reduce<CSSProperties>((res, data) => {
      const visible = isFF(FF_DEV_3873) || (!panelsHidden && !data.detached && data.visible);
      const padding = visible ? data.width : PANEL_HEADER_HEIGHT;
      const paddingProperty = data.alignment === 'left' ? 'paddingLeft' : 'paddingRight';

      return (!data.detached) ? {
        ...res,
        [paddingProperty]: padding,
      } : res;
    }, result);
  }, [
    panelsHidden,
    panelData,
    sidepanelsCollapsed,
  ]);

  const panels = useMemo(() => {
    if (panelsHidden) return {};

    const result: Record<string, {props: Record<string, any>, Component: FC<any>}[]> = {
      detached: [],
      left: [],
      right: [],
    };

    const panels = Object.entries(panelData);

    for (const [name, panelData] of panels) {
      const { alignment, detached } = panelData;
      const view = panelView[name as PanelType];
      const Component = view.component;
      const Icon = view.icon;
      const props = {
        ...panelData,
        ...commonProps,
        top: panelData.storedTop ?? panelData.top,
        left: panelData.storedLeft ?? panelData.left,
        tooltip: view.title,
        icon: <Icon/>,
        positioning,
        maxWidth: panelMaxWidth,
        zIndex: panelData.zIndex,
        expanded: sidepanelsCollapsed,
        alignment: sidepanelsCollapsed ? 'left' : panelData.alignment,
        locked: sidepanelsCollapsed,
      };
      const panel = {
        props,
        Component,
      };

      if (detached) result.detached.push(panel);
      else if (alignment === 'left') result.left.push(panel);
      else if (alignment === 'right') result.right.push(panel);
    }

    return result;
  }, [panelData, commonProps, panelsHidden, sidepanelsCollapsed, positioning, panelMaxWidth]);

  useEffect(() => {
    localSnap.current = snap;
  }, [snap]);

  useEffect(() => {
    const root = rootRef.current!;
    const checkContenFit = () => {
      return (root.clientWidth ?? 0) < maxWindowWidth;
    };

    const observer = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = root ?? {};

      // we don't need to check or resize anything in collapsed state
      if (clientWidth <= maxWindowWidth) return;

      // Remember current width and height of the viewport
      viewportSize.current.width = clientWidth ?? 0;
      viewportSize.current.height = clientHeight ?? 0;

      setViewportSizeMatch(checkContenFit());
      setPanelMaxWidth(root.clientWidth * 0.4);
    });

    if (root) {
      observer.observe(root);
      setViewportSizeMatch(checkContenFit());
      setPanelMaxWidth(root.clientWidth * 0.4);
      setInitialized(true);
    }

    return () => {
      if (root) observer.unobserve(root);
      observer.disconnect();
    };
  }, []);

  const contextValue = useMemo(() => {
    return {
      locked: sidepanelsCollapsed,
    };
  }, [sidepanelsCollapsed]);

  return (
    <SidePanelsContext.Provider value={contextValue}>
      <Block
        ref={(el: HTMLDivElement | null) => {
          if (el) {
            rootRef.current = el;
            setViewportSizeMatch(el.clientWidth <= maxWindowWidth);
          }
        }}
        name="sidepanels"
        style={{
          ...padding,
        }}
        mod={{ collapsed: sidepanelsCollapsed, newLabelingUI: isFF(FF_DEV_3873) }}
      >
        {initialized && (
          <>
            <Elem name="content" mod={{ resizing: resizing || positioning }}>
              {children}
            </Elem>
            {panelsHidden !== true && (
              <>
                {Object.entries(panels).map(([key, panel]) => {
                  const content = panel.map(({ props, Component }, i) => <Component key={i} {...props} />);

                  if (key === 'detached') {
                    return <Fragment key={key}>{content}</Fragment>;
                  }

                  return (
                    <Elem key={key} name="wrapper" mod={{ align: key, snap: snap === key }}>
                      {content}
                    </Elem>
                  );
                })}
              </>
            )}
          </>
        )}
      </Block>
    </SidePanelsContext.Provider>
  );
};

export const SidePanels = observer(SidePanelsComponent);
