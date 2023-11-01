import { FC, MutableRefObject, ReactNode } from 'react';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_MAX_HEIGHT, DEFAULT_PANEL_WIDTH } from '../constants';

export type TabProps = {
  name: string,
  rootRef: MutableRefObject<HTMLDivElement | undefined>,
  tabTitle: string,
  panelKey: string,
  tabIndex: number,
  active: boolean,
  children: ReactNode,
  panelWidth: number,
  viewLength: number,
  locked: boolean,
  breakPointActiveTab?: number,
  setBreakPointActiveTab?: React.Dispatch<React.SetStateAction<number>>,
  transferTab: EventHandlers['transferTab'],
  createNewPanel: EventHandlers['createNewPanel'],
  setActiveTab: EventHandlers['setActiveTab'],
  checkSnap: EventHandlers['checkSnap'],
}
export interface SidePanelsProps {
  panelsHidden: boolean;
  store: any;
  currentEntity: any;
  showComments: boolean;
  focusTab: string;
}

export interface ViewportSize { width: number, height: number }
export interface PanelView {
  title: string;
  name: string;
  component: FC<any>;
  active: boolean;
}

export enum Side {
  left = 'left',
  right = 'right',
}

export enum DropSide {
  left = 'left',
  right = 'right',
  topRight = 'right-top',
  topLeft = 'left-top',
  bottomRight = 'right-bottom',
  bottomLeft = 'left-bottom',
}

export enum JoinOrder {
  top = 'top',
  bottom = 'bottom',
}
export interface PanelBBox {
  order: number;
  width: number;
  height:  number;
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
  alignment: Side;
  panelViews: PanelView[];
}
export interface EventHandlers {
  onResize: (key: string, w: number, h: number, t: number, l: number) => void;
  onGroupHeightResize: (key: string, h: number, t: number) => void;
  onResizeStart: ()=> void;
  onResizeEnd: ()=> void;
  onPositionChange: (key: string, t: number, l: number, detached: boolean, alignment: Side ) => void;
  onVisibilityChange: (key: string, visible: boolean) => void;
  onPositionChangeBegin: (key: string, x: number, y: number, side: Side, detached: boolean) => void;
  onSnap: (key: string) => void;
  transferTab: (
    movingTab: number,
    movingPanel: string,
    receivingPanel: string,
    receivingTab: number,
    dropSide: Side,
  ) => void;
  createNewPanel(
    name: string,
    movingPanel: string,
    movingTab: number,
    left: number,
    top: number,
  ): void;
  setActiveTab: (key: string, tabIndex: number) => void;
  checkSnap: (left: number, panelWidth: number, top: number, height: number) => void;
}
export type CommonProps = EventHandlers & {
  root: MutableRefObject<HTMLDivElement | undefined>,
  regions: any,
  selection: any,
  currentEntity: any,
}

interface PanelsCollapsed { [Side.left]: boolean, [Side.right]: boolean }
    
export type BaseProps = PanelBBox & CommonProps & {
  name: string,
  top: number,
  left: number,
  positioning: boolean,
  maxWidth: number,
  zIndex: number,
  expanded: boolean,
  alignment: Side,
  locked: boolean,
  panelViews: PanelView[],
  attachedKeys: string[] | undefined,
  sidePanelCollapsed: PanelsCollapsed,
  breakPointActiveTab: number,
  setBreakPointActiveTab?: React.Dispatch<React.SetStateAction<number>>,
  setSidePanelCollapsed: React.Dispatch<React.SetStateAction<PanelsCollapsed>>,
  dragTop: boolean,
  dragBottom: boolean,
  lockPanelContents: boolean,
}
    
export type Result = {
  detached: BaseProps[],
  left:BaseProps[],
  right:BaseProps[],
}
    
export const emptyPanel: PanelBBox = {
  order: 0,
  top: 0,
  left: 0,
  relativeLeft: 0,
  relativeTop: 0,
  zIndex: 1,
  width: DEFAULT_PANEL_WIDTH,
  height: DEFAULT_PANEL_HEIGHT,
  visible: true,
  detached: true,
  alignment: Side.left,
  maxHeight: DEFAULT_PANEL_MAX_HEIGHT,
  panelViews: [],
};

export type PanelBaseExclusiveProps = 'name' | 'title'

export type ResizeHandler = (name: string, width: number, height: number, top: number, left: number) => void;

export type SnapHandler = (name: string) => void

export type PositionChangeHandler = (name: string, top: number, left: number, detached: boolean) => void;

export type VisibilityChangeHandler = (name: string, visible: boolean) => void;