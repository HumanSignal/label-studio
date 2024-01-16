import { FC, MutableRefObject, ReactNode } from 'react';
import { clamp } from '../../../utils/utilities';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_MAX_HEIGHT, DEFAULT_PANEL_MAX_WIDTH, DEFAULT_PANEL_MIN_HEIGHT, DEFAULT_PANEL_WIDTH, PANEL_HEADER_HEIGHT } from '../constants';
import { Comments, History, Info, Relations } from '../DetailsPanel/DetailsPanel';
import { OutlinerComponent } from '../OutlinerPanel/OutlinerPanel';
import { PanelProps } from '../PanelBase';
import { emptyPanel, JoinOrder, PanelBBox, PanelsCollapsed, PanelView, Side, StoredPanelState, ViewportSize } from './types';

export const determineLeftOrRight = (event: any, droppableElement?: ReactNode) => {
  const element = droppableElement || event.target as HTMLElement;  
  const dropWidth = (element as HTMLElement).clientWidth as number;
  const x = event.pageX as number - (element as HTMLElement).getBoundingClientRect().left;
  const half = dropWidth / 2;
    
  return x > half ? Side.right : Side.left;
};
  
export const determineDroppableArea = (droppingElement: HTMLElement) => droppingElement?.id?.includes('droppable');

export const stateRemovedTab = (state: Record<string, PanelBBox>, movingPanel: string, movingTab: number) => {
  const newState = { ...state };

  if (!newState[movingPanel]) return newState;

  return {
    ...newState,
    [movingPanel]: {
      ...newState[movingPanel],
      panelViews: newState[movingPanel].panelViews.filter((_, tabIterator) => tabIterator !== movingTab),
    },
  };
};

export const setActive = (state: Record<string, PanelBBox>, key: string, tabIndex: number) => {
  const newState = {
    ...state, [key]: {
      ...state[key], panelViews: state[key].panelViews.map((view, index) => {
        view.active = index === tabIndex;
        return view;
      }),
    },
  };

  return newState;
};

export const setActiveDefaults = (state: Record<string, PanelBBox>) => {
  const newState: Record<string, PanelBBox> = { ...state };

  Object.values(newState).forEach(panel => {
    const noActiveTabs = !panel.panelViews.find(view => view.active);

    if (noActiveTabs) panel.panelViews[0].active = true;
  });

  return newState;
};


export const renameKeys = (state: Record<string, PanelBBox>) => {
  const newState = {};

  Object.keys(state).forEach((panelKey: string) => {
    const newKey = `${state[panelKey].panelViews.map(view => view.name).join('-')}`;
    const panel = { ...state[panelKey] };

    Object.assign(newState, { [newKey]: panel });
  });

  return newState;
};

export const stateAddedTab = (
  state: Record<string, PanelBBox>,
  movingPanel: string,
  receivingPanel: string,
  movingTabData: PanelView,
  receivingTab: number,
  dropSide: Side,
) => {
  const newState = { ...state };
  const panel = newState[receivingPanel];
  
  panel.panelViews = newState[receivingPanel].panelViews.map((view) => {
    view.active = false;
    return view;
  });
  
  let index = receivingTab + (dropSide === Side.right ? 1 : 0);

  if (movingPanel === receivingPanel && index > 0) index -= 1; 
  panel.panelViews.splice(index, 0, movingTabData);
  return newState;
};

export const stateRemovePanelEmptyViews = (state: Record<string, PanelBBox> | null) => {
  const newState: Record<string, PanelBBox> = { ...state };

  Object.keys(newState).forEach((panel) => {
    if (newState[panel].panelViews.length === 0) delete newState[panel];
  });
  return newState;
};

export const panelComponents: {[key:string]: FC<PanelProps>} = {
  'regions': OutlinerComponent as FC<PanelProps>,
  'history': History as FC<PanelProps>,
  'relations': Relations as FC<PanelProps>,
  'comments': Comments as FC<PanelProps>,
  'info': Info as FC<PanelProps>,
};

const panelViews = [
  {
    name: 'regions',
    title: 'Regions',
    component: panelComponents['regions'] as FC<PanelProps>,
    active: true,
  },
  {
    name: 'history',
    title: 'History',
    component: panelComponents['history'] as FC<PanelProps>,
    active: false,
  },

  {
    name: 'relations',
    title: 'Relations',
    component: panelComponents['relations'] as FC<PanelProps>,
    active: false,
  },
  {
    name: 'info',
    title: 'Info',
    component: panelComponents['info'] as FC<PanelProps>,
    active: true,
  },
  {
    name: 'comments',
    title: 'Comments',
    component: panelComponents['comments'] as FC<PanelProps>,
    active: false,
  },
];

export const enterprisePanelDefault: Record<string, PanelBBox> = {
  'info-comments-history': {
    order: 1,
    top: 0,
    left: 0,
    relativeLeft: 0,
    relativeTop: 0,
    zIndex: 10,
    width: DEFAULT_PANEL_WIDTH,
    height: DEFAULT_PANEL_HEIGHT,
    visible: true,
    detached: false,
    alignment: Side.right,
    maxHeight: DEFAULT_PANEL_MAX_HEIGHT,
    panelViews: [panelViews[3], panelViews[4], panelViews[1]],
  },
  'regions-relations': {
    order: 2,
    top: 0,
    left: 0,
    relativeLeft: 0,
    relativeTop: 0,
    zIndex: 10,
    width: DEFAULT_PANEL_WIDTH,
    height: DEFAULT_PANEL_HEIGHT,
    visible: true,
    detached: false,
    alignment: Side.right,
    maxHeight: DEFAULT_PANEL_MAX_HEIGHT,
    panelViews: [panelViews[0], panelViews[2]],
  },
};

export const openSourcePanelDefault: Record<string, PanelBBox> = {
  'info-history': {
    order: 1,
    top: 0,
    left: 0,
    relativeLeft: 0,
    relativeTop: 0,
    zIndex: 10,
    width: DEFAULT_PANEL_WIDTH,
    height: DEFAULT_PANEL_HEIGHT,
    visible: true,
    detached: false,
    alignment: Side.right,
    maxHeight: DEFAULT_PANEL_MAX_HEIGHT,
    panelViews: [panelViews[3], panelViews[1]],
  },
  'regions-relations': {
    order: 2,
    top: 0,
    left: 0,
    relativeLeft: 0,
    relativeTop: 0,
    zIndex: 10,
    width: DEFAULT_PANEL_WIDTH,
    height: DEFAULT_PANEL_HEIGHT,
    visible: true,
    detached: false,
    alignment: Side.right,
    maxHeight: DEFAULT_PANEL_MAX_HEIGHT,
    panelViews: [panelViews[0], panelViews[2]],
  },
};

export const partialEmptyBaseProps = {
  ...emptyPanel,
  name: 'breakpointCollapsed',
  positioning: false,
  height: DEFAULT_PANEL_HEIGHT,
  maxHeight: DEFAULT_PANEL_HEIGHT,
  detached: false,
  maxWidth: DEFAULT_PANEL_MAX_WIDTH,
  zIndex: 10,
  expanded: true,
  locked: true,
  alignment: Side.left,
  lockPanelContents: false,
  attachedKeys: [],
  sidePanelCollapsed: { [Side.left]: false, [Side.right]: false },
  setSidePanelCollapsed: () => { },
  dragTop: false,
  dragBottom: false,
  panelViews: [panelViews[0], panelViews[1], panelViews[2], panelViews[3], panelViews[4]],
};

export const resizers = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'top',
  'bottom',
  'right',
  'left',
];


export const checkCollapsedPanelsHaveData = (
  collapsedSide: PanelsCollapsed,
  panelData: Record<string, PanelBBox>,
) => {
  const collapsedCopy = { ...collapsedSide };
  const collapsedPanels = (Object.keys(collapsedCopy) as Side[]).filter(side => collapsedCopy[side]);

  collapsedPanels.forEach((side) => {
    const hasData = Object.keys(panelData).some((panel) => {
      return panelData[panel].alignment === side && !panelData[panel].detached;
    });

    if (!hasData) collapsedCopy[side] = false;
  });

  return collapsedCopy;
};

export const restorePanel = (showComments: boolean): StoredPanelState => {
  const previousState = window.localStorage.getItem('panelState');
  const parsed: StoredPanelState | null = previousState && JSON.parse(previousState);
  const panelData = parsed && parsed.panelData;
  const defaultCollapsedSide = { [Side.left]: false, [Side.right]: false };
  const collapsedSide = parsed?.collapsedSide ?? defaultCollapsedSide;
  const allTabs = panelData && Object.values(panelData).map(panel => panel.panelViews).flat(1);
  // don't use comments tab anywhere if it's disabled
  const countOfAllAvailableTabs = panelViews.length - (showComments ? 0 : 1);

  // stored state can have less tabs than available, for example if it was stored on old version
  // or if comments were enabled; then return default state
  if (!allTabs || allTabs.length !== countOfAllAvailableTabs) {
    const defaultPanel = showComments ? enterprisePanelDefault : openSourcePanelDefault;

    return { panelData: defaultPanel, collapsedSide: defaultCollapsedSide };
  }

  const noEmptyPanels = stateRemovePanelEmptyViews(panelData);
  const withActiveDefaults = setActiveDefaults(noEmptyPanels);
  const safeCollapsedSide = checkCollapsedPanelsHaveData(collapsedSide, withActiveDefaults);

  return { panelData: restoreComponentsToState(withActiveDefaults), collapsedSide: safeCollapsedSide };
};

export const restoreComponentsToState = (panelData: Record<string, PanelBBox>) => {
  const updatedPanels: Record<string, PanelBBox> = { ...panelData };

  Object.keys(updatedPanels).forEach(panelName => {
    const panel = updatedPanels[panelName];

    panel.panelViews.forEach((view: { name: string, component: FC<PanelProps> }) => {
      view.component = panelComponents[view.name];
    });
  });

  return updatedPanels; 
};

export const savePanels = (panelData: Record<string, PanelBBox>, collapsedSide: { [Side.left]: boolean, [Side.right]: boolean }) => {
  window.localStorage.setItem('panelState', JSON.stringify({ panelData, collapsedSide }));
};

export const getLeftKeys = (state: Record<string, PanelBBox>) => Object.keys(state).filter((key) => !state[key].detached && state[key].alignment === Side.left);
export const getRightKeys = (state: Record<string, PanelBBox>) => Object.keys(state).filter((key) => !state[key].detached && state[key].alignment === Side.right);

export const getAttachedPerSide = (state: Record<string, PanelBBox>, side: string) => {
  if (side === Side.left) return getLeftKeys(state).sort((a, b) => state[a].order - state[b].order);
  if (side === Side.right) return getRightKeys(state).sort((a, b) => state[a].order - state[b].order);
};

export const getSnappedHeights = (
  state: Record<string, PanelBBox>,
  totalHeight: number,
) => {
  const newState = { ...state };
  const leftKeys = getLeftKeys(newState);
  const rightKeys = getRightKeys(newState);

  [leftKeys, rightKeys].forEach((list) => {
    const totalCollapsed = list.filter(panelKey => !state[panelKey].visible).length;
    const visible = list.filter(panelKey => state[panelKey].visible);
    const collapsedAdjustments = PANEL_HEADER_HEIGHT * totalCollapsed;
    const visibleGroupHeight = visible.reduce((acc, key) => acc + newState[key].height, 0);
    const visibleGroupDifference = totalHeight - collapsedAdjustments - visibleGroupHeight;
    const negativeNumber = visibleGroupDifference < 0;
    const adjustment = Math.abs(visibleGroupDifference) / (visible.length || 1);
    let top = 0;
    
    visible.forEach(panelKey => {
      const newHeight = negativeNumber
        ? newState[panelKey].height - adjustment
        : newState[panelKey].height + adjustment;

      if (newState[panelKey].visible) {
        newState[panelKey].height = newHeight;
        newState[panelKey].top = top;
        top += newHeight;
      } else top += PANEL_HEADER_HEIGHT;
    });
  });

  return newState ;
};

export const redistributeHeights = (
  state: Record<string, PanelBBox>,
  totalHeight: number,
  alignment: Side,
) => {
  const newState = { ...state };
  const sideKeys = getAttachedPerSide(newState, alignment);

  if (!sideKeys?.length) return state;
  const visible = sideKeys.filter(panelKey => newState[panelKey].visible);
  const totalCollapsed = sideKeys.filter(panelKey => !newState[panelKey].visible).length;
  const collapsedAdjustments = PANEL_HEADER_HEIGHT * totalCollapsed;
  const distributedHeight = (totalHeight - collapsedAdjustments) / visible.length || 1;

  visible.forEach(panelKey => {
    let top = 0;

    if (newState[panelKey].visible) {
      newState[panelKey].height = distributedHeight;
      newState[panelKey].top = top;
      top += distributedHeight;
    } else top += PANEL_HEADER_HEIGHT;
  });

  return newState;
};

const setOrder = (state: Record<string, PanelBBox>, panelAddKey: string, columnsToOrder: string[], order: JoinOrder) => {
  const newState = { ...state };

  newState[panelAddKey].order = order === JoinOrder.top ? 0 : columnsToOrder.length;
  let orderCounter = order === JoinOrder.bottom ? 0 : 1;

  columnsToOrder.forEach((panelKey) => {
    if (panelAddKey === panelKey) return;
    newState[panelKey].order = orderCounter;
    orderCounter += 1;
  });

  return newState;
};

export const joinPanelColumns = (
  state: Record<string, PanelBBox>,
  panelAddKey: string,
  alignment: Side,
  width: number,
  totalHeight: number,
  order: JoinOrder = JoinOrder.bottom,
): Record<string, PanelBBox> => {
  const newState = { ...state };
  const columns = getAttachedPerSide(newState, alignment);

  const newWidth = !columns ? width || DEFAULT_PANEL_WIDTH : columns.reduce((acc, key) => {
    if (acc < state[key].width) return state[key].width;
    return acc;
  }, 0) || width;
  
  const addedPanel = {
    ...newState, [panelAddKey]: {
      ...newState[panelAddKey],
      width: newWidth,
      alignment,
      detached: false,
    },
  };
  const newColumns = getAttachedPerSide(addedPanel, alignment) as string[];
  const orderedState = setOrder(addedPanel, panelAddKey, newColumns, order);
  const adjustZIndex = findZIndices(orderedState, panelAddKey);

  return redistributeHeights(adjustZIndex, totalHeight, alignment);
};

export const splitPanelColumns = (
  state: Record<string, PanelBBox>,
  removingKey: string,
  totalHeight: number,
) => {
  const newState = { ...state };
  const alignment = newState[removingKey].alignment as Side;
  const movingTabAttributes = {
    width: DEFAULT_PANEL_WIDTH,
    detached: true,
    height: DEFAULT_PANEL_HEIGHT,
  };
  const removedState = { ...newState, [removingKey]: { ...newState[removingKey], ...movingTabAttributes } };
  const column = getAttachedPerSide(newState, alignment);

  column?.forEach((key, index) => { newState[key].order = index; });
  return redistributeHeights(removedState, totalHeight, alignment);
};

export const resizePanelColumns = (
  state: Record<string, PanelBBox>,
  key: string,
  height: number,
  top: number,
  availableHeight: number,
) => {
  const newState = { ...state };
  const panelsOnSameAlignment = getAttachedPerSide(newState, newState[key]?.alignment as Side);
  const maxHeight = availableHeight;

  if (!panelsOnSameAlignment) return state;
  const difference = (height - newState[key].height);
  const visiblePanels = panelsOnSameAlignment.filter((panelKey) => newState[panelKey].visible);
  const panelAboveKeyIndex = visiblePanels?.findIndex((visibleKey) => visibleKey === key) - 1;
  
  if (panelAboveKeyIndex === undefined) return state;

  const panelAboveKey = visiblePanels[panelAboveKeyIndex];

  panelsOnSameAlignment.forEach((panelKey) => {
    let newHeight = newState[panelKey].height;

    if (panelKey === key) newHeight = height;
    if (panelKey === panelAboveKey) newHeight = newHeight - difference;
    if (height <= DEFAULT_PANEL_MIN_HEIGHT) height = DEFAULT_PANEL_MIN_HEIGHT;
    if (!newState[panelKey].visible) return;

    newState[panelKey] = {
      ...newState[panelKey],
      relativeTop: (top / availableHeight) * 100,
      storedLeft: undefined,
      storedTop: undefined,
      maxHeight,
      height: clamp(newHeight, DEFAULT_PANEL_MIN_HEIGHT, availableHeight),
    };
  });
  const collapsedAdjustments = panelsOnSameAlignment
    .filter(panelKey => !newState[panelKey].visible).length * PANEL_HEADER_HEIGHT;
  const totalHeight = panelsOnSameAlignment
    .filter(panelKey => newState[panelKey].visible)
    .reduce((acc, panelKey) => acc + newState[panelKey].height, 0);
  
  if (totalHeight + collapsedAdjustments > availableHeight) return getSnappedHeights(state, availableHeight);
  return getSnappedHeights(newState, availableHeight);
};

export const newPanelFromTab = (
  state: Record<string, PanelBBox>,
  name: string,
  movingPanel: string,
  movingTab: number,
  left: number,
  top: number,
  viewportSize: MutableRefObject<ViewportSize>,
) => ({
  ...emptyPanel,
  name,
  panelViews: [{ ...state[movingPanel].panelViews[movingTab], active: true }],
  top,
  left,
  relativeTop: (top / viewportSize.current.height) * 100,
  relativeLeft: (left / viewportSize.current.width) * 100,
  visible: true,
  detached: true,
  zIndex: 12,
});

export const newPanelInState = (
  state: Record<string, PanelBBox>,
  name: string,
  movingPanel: string,
  movingTab: number,
  left: number,
  top: number,
  viewportSize: MutableRefObject<ViewportSize>,
) => {
  const newPanel = newPanelFromTab(state, name, movingPanel, movingTab, left, top, viewportSize);
  const stateWithRemovals = stateRemovedTab(state, movingPanel, movingTab);
  const panelsWithRemovals = stateRemovePanelEmptyViews(stateWithRemovals);
  const panelWithAdditions = { ...panelsWithRemovals, [`${newPanel.name}`]: newPanel };
  const renamedKeys = renameKeys(panelWithAdditions);
  const activeDefaults = setActiveDefaults(renamedKeys);
  const adjustZIndex = findZIndices(activeDefaults, newPanel.name);

  return getSnappedHeights(adjustZIndex, viewportSize.current.height);
};

const partitionByAttached = (state: Record<string, PanelBBox>) => {
  return Object.keys(state).reduce(
    (result: [{ zIndex: number, panelKey: string }[], { zIndex: number, panelKey: string }[]], panelKey) => {
      state[panelKey].detached
        ? result[0].push({ zIndex: state[panelKey].zIndex, panelKey })
        : result[1].push({ zIndex: state[panelKey].zIndex, panelKey });

      return result;
    },
    [[], []],
  );
};

export const findZIndices = (state: Record<string, PanelBBox>, focusedKey: string) => {
  const newState = { ...state };
  const [detached, attached] = partitionByAttached(newState);

  let detachedCounter = 12;

  attached.forEach(panel => (newState[panel.panelKey].zIndex = 10));
  detached
    .sort((a, b) => a.zIndex - b.zIndex)
    .forEach(panel => {
      newState[panel.panelKey].zIndex = detachedCounter;
      detachedCounter++;
    });
  if (newState[focusedKey].detached) newState[focusedKey].zIndex = detached.length + 12;

  return newState;
};

export const findPanelViewByName = (state: Record<string, PanelBBox>, name: string): { panelName: string, tab: PanelView, panelViewIndex: number } | undefined => {
  const panelName = Object.keys(state).find(panelKey => panelKey.includes(name)) || '';
  const panelViewIndex = state[panelName]?.panelViews.findIndex((view: { name: string }) => view.name === name);

  return panelViewIndex >= 0 ? { panelName, tab: state[panelName].panelViews[panelViewIndex], panelViewIndex } : undefined;
};
