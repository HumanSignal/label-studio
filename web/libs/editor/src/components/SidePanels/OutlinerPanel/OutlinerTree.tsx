import { IconArrow, IconChevronLeft, IconEyeClosed, IconEyeOpened, IconSparks, IconWarning } from "@humansignal/icons";
import { Tooltip } from "@humansignal/ui";
import chroma from "chroma-js";
import { inject, observer } from "mobx-react";
import Tree from "rc-tree";
import {
  createContext,
  type FC,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Registry from "../../../core/Registry";
import { PER_REGION_MODES } from "../../../mixins/PerRegionModes";
import { cn } from "../../../utils/bem";
import { FF_DEV_2755, FF_DEV_3873, isFF } from "../../../utils/feature-flags";
import { flatten, isDefined, isMacOS } from "../../../utils/utilities";
import { NodeIcon } from "../../Node/Node";
import { LockButton } from "../Components/LockButton";
import { RegionContextMenu } from "../Components/RegionContextMenu";
import { RegionControlButton } from "../Components/RegionControlButton";
import "./TreeView.scss";
import type { EventDataNode, Key } from "rc-tree/es/interface";
import ResizeObserver from "../../../utils/resize-observer";
import { RegionLabel } from "./RegionLabel";

const { localStorage } = window;
const localStoreName = "collapsed-label-pos";
const MIN_REGIONS_TREE_ROW_HEIGHT = 34;

interface OutlinerContextProps {
  regions: any;
}

const OutlinerContext = createContext<OutlinerContextProps>({
  regions: null,
});

interface OutlinerTreeProps {
  regions: any;
  footer: ReactNode;
}

const OutlinerTreeComponent: FC<OutlinerTreeProps> = ({ regions, footer }) => {
  const rootClass = cn("tree");
  const regionsTree = useDataTree({
    regions,
    rootClass,
    footer,
    // that's a trick to have a dependency that causes recalculating of tree data on grouping mode change
    // it's for rerender OutlinerTreeComponent
    grouping: regions.group,
  });

  return (
    <OutlinerContext.Provider value={{ regions }}>
      <OutlinerInnerTreeComponent regions={regions} regionsTree={regionsTree} />
    </OutlinerContext.Provider>
  );
};

interface OutlinerInnerTreeProps {
  regions: any;
  regionsTree: any[];
}

const iconGetter = ({ entity }: any) => <NodeIconComponent node={entity} />;
const switcherIconGetter = ({ isLeaf }: any) => <SwitcherIcon isLeaf={isLeaf} />;
const OutlinerInnerTreeComponent: FC<OutlinerInnerTreeProps> = observer(({ regions, regionsTree }) => {
  const blockRef = useRef<HTMLElement>();
  const [height, setHeight] = useState(0);
  let resizeObserver: ResizeObserver | null = useMemo(() => {
    let lastHeight = 0;

    return new ResizeObserver((entities) => {
      requestAnimationFrame(() => {
        if (!entities?.[0]?.contentRect || entities?.[0]?.contentRect?.height === lastHeight) {
          return;
        }
        lastHeight = entities?.[0]?.contentRect?.height || 1;

        // ensure the component is still mounted
        if (blockRef.current) {
          setHeight(lastHeight);
        }
      });
    });
  }, []);

  useEffect(() => {
    return () => {
      resizeObserver?.disconnect();
      resizeObserver = null;
    };
  }, []);
  const setRef = useCallback((ref) => {
    if (ref) {
      resizeObserver?.observe(ref);
    } else if (blockRef.current) {
      resizeObserver?.unobserve(blockRef.current);
    }
    blockRef.current = ref;
    setHeight(ref?.clientHeight || 1);
  }, []);
  const eventHandlers = useEventHandlers();
  const selectedKeys = regions.selection.keys;
  const rootClass = cn("tree");
  let expandedKeys;
  let onExpand;
  // It works only for 'label' mode yet.
  // To enable this feature at other group modes, it needs to set correct pos at regionsTree for these modes
  // It also doesn't work with nesting level more than 1
  const isPersistCollapseEnabled = isFF(FF_DEV_2755) && regions.group === "label";

  if (isFF(FF_DEV_2755)) {
    const [collapsedPos, setCollapsedPos] = useState(
      localStorage
        .getItem(localStoreName)
        ?.split?.(",")
        ?.filter((pos) => !!pos) ?? [],
    );

    const updateLocalStorage = (collapsedPos: Array<string>) => {
      localStorage.setItem(localStoreName, collapsedPos.join(","));
    };

    const collapse = (pos: string) => {
      const newCollapsedPos = [...collapsedPos, pos];

      setCollapsedPos(newCollapsedPos);
      updateLocalStorage(newCollapsedPos);
    };

    const expand = (pos: string) => {
      const newCollapsedPos = collapsedPos.filter((cPos) => cPos !== pos);

      setCollapsedPos(newCollapsedPos);
      updateLocalStorage(newCollapsedPos);
    };

    expandedKeys =
      regionsTree.filter((item: any) => !collapsedPos.includes(item.pos)).map((item: any) => item.key) ?? [];

    onExpand = (
      _internalExpandedKeys: Key[],
      {
        node,
      }: {
        node: EventDataNode;
      },
    ): void => {
      const region = regionsTree.find((region: any) => region.key === node.key);

      if (!region) return;

      // pos is equal to label name
      const pos = region.pos;

      collapsedPos.includes(pos) ? expand(pos) : collapse(pos);
    };
  }

  return (
    <div className={cn("outliner-tree").toClassName()} ref={setRef}>
      {!!height && (
        <Tree
          key={regions.group}
          draggable={regions.group === "manual"}
          multiple
          defaultExpandAll
          defaultExpandParent={!isPersistCollapseEnabled}
          autoExpandParent
          checkable={false}
          prefixCls={rootClass.toClassName()}
          className={rootClass.toClassName()}
          treeData={regionsTree}
          selectedKeys={selectedKeys}
          icon={iconGetter}
          switcherIcon={switcherIconGetter}
          virtual
          itemHeight={MIN_REGIONS_TREE_ROW_HEIGHT}
          height={height}
          {...eventHandlers}
          {...(isPersistCollapseEnabled
            ? {
                expandedKeys,
                onExpand,
              }
            : {})}
        />
      )}
    </div>
  );
});

const useDataTree = ({ regions, rootClass, footer }: any) => {
  const processor = useCallback((item: any, idx, _false, _null, _onClick) => {
    const { id, type, hidden, isDrawing, locked, incomplete } = item ?? {};
    const style = item?.background ?? item?.getOneColor?.();
    const color = chroma(style ?? "#666").alpha(1);
    const mods: Record<string, any> = { hidden, type, isDrawing: isDrawing || incomplete };

    const label = <RegionLabel item={item} />;

    return {
      idx,
      key: id,
      type,
      label,
      hidden,
      entity: item,
      color: color.css(),
      style: {
        "--icon-color": color.css(),
        "--text-color": color.css(),
        "--selection-color": color.alpha(0.1).css(),
      },
      className: rootClass.elem("node").mod(mods).toClassName(),
      title: (data: any) => <RootTitle {...data} />,
      locked,
    };
  }, []);

  const regionsTreeData = regions.getRegionsTree(processor);

  if (footer) {
    regionsTreeData.push({
      key: "__footer__",
      disabled: true,
      className: rootClass.elem("node").mod({ type: "footer" }).toClassName(),
      title: footer,
    });
  }

  return regionsTreeData;
};

const useEventHandlers = () => {
  const onSelect = useCallback((_, evt) => {
    const multi = evt.nativeEvent.ctrlKey || (isMacOS() && evt.nativeEvent.metaKey);
    const { node } = evt;

    const self = node?.item;

    if (!self?.annotation) return;

    const annotation = self.annotation;

    if (multi) {
      annotation.toggleRegionSelection(self);
      return;
    }

    if (!self.isReadOnly() && annotation.isLinkingMode) {
      annotation.addLinkedRegion(self);
      annotation.stopLinkingMode();
      annotation.regionStore.unselectAll();
      return;
    }

    const wasNotSelected = !self.selected;

    if (wasNotSelected) {
      annotation.selectArea(self);
      // post-select hook
      self.onSelectInOutliner?.(wasNotSelected);
    } else {
      annotation.unselectAll();
    }
  }, []);

  // see onScroll for explanation
  const highlightedRef = useRef<any>();
  const onMouseEnter = useCallback(({ node }: any) => {
    if (highlightedRef.current) {
      highlightedRef.current?.setHighlight(false);
    }
    node.item?.setHighlight(true);
    highlightedRef.current = node.item;
  }, []);

  const onMouseLeave = useCallback(({ node }: any) => {
    node?.item?.setHighlight(false);
    if (highlightedRef.current !== node?.item) {
      highlightedRef.current?.setHighlight(false);
    }
    highlightedRef.current = undefined;
  }, []);

  // This is a necessary trick since the virtual mode may prevent emitting MouseLeave event due to the node couldn't exist at this moment
  const onScroll = onMouseLeave;

  // find the height of the tree formed by dragReg for
  // example if we have a tree of A -> B -> C -> D and
  // we're moving B -> C part somewhere then it'd have a
  // height of 1
  const treeHeight = useCallback((node: any): number => {
    if (!node) return 0;

    const regions = node.item.annotation.regionStore;
    // TODO this can blow up if we have lots of stuff there
    const nodes: any[] = regions.filterByParentID(node.pid);
    const childrenHeight = nodes.map((c) => treeHeight(c));

    if (!childrenHeight.length) return 0;

    return 1 + Math.max(...childrenHeight);
  }, []);

  const onDrop = useCallback(({ node, dragNode, dropPosition, dropToGap }) => {
    if (node.classification) return false;
    const dropKey = node.props.eventKey;
    const dragKey = dragNode.props.eventKey;
    const dropPos = node.props.pos.split("-");
    const regions = node.item.annotation.regionStore;

    dropPosition = dropPosition - Number.parseInt(dropPos[dropPos.length - 1]);
    const treeDepth = dropPos.length;

    const dragReg = regions.findRegionID(dragKey);
    const dropReg = regions.findRegionID(dropKey);

    regions.unhighlightAll();

    if (treeDepth === 2 && dropToGap && dropPosition === -1) {
      dragReg.setParentID("");
    } else if (dropPosition !== -1) {
      // check if the dragReg can be a child of dropReg
      const selDrop: any[] = dropReg.labeling?.selectedLabels || [];
      const labelWithConstraint = selDrop.filter((l) => l.groupcancontain);

      if (labelWithConstraint.length) {
        const selDrag: any[] = dragReg.labeling.selectedLabels;

        const set1 = flatten(labelWithConstraint.map((l) => l.groupcancontain.split(",")));
        const set2 = flatten(selDrag.map((l) => (l.alias ? [l.alias, l.value] : [l.value])));

        if (set1.filter((value) => -1 !== set2.indexOf(value)).length === 0) return;
      }

      // check drop regions tree depth
      if (dropReg.labeling?.from_name?.groupdepth) {
        let maxDepth = Number(dropReg.labeling.from_name.groupdepth);

        if (maxDepth >= 0) {
          maxDepth = maxDepth - treeHeight(dragReg);
          let reg = dropReg;

          while (reg) {
            reg = regions.findRegion(reg.parentID);
            maxDepth = maxDepth - 1;
          }

          if (maxDepth < 0) return;
        }
      }

      dragReg.setParentID(dropReg.id);
    }
  }, []);

  return {
    onSelect,
    onMouseEnter,
    onMouseLeave,
    onDrop,
    onScroll,
  };
};

const SwitcherIcon: FC<any> = observer(({ isLeaf }) => {
  return isLeaf ? null : <IconArrow />;
});

const NodeIconComponent: FC<any> = observer(({ node }) => {
  return node ? <NodeIcon node={node} /> : null;
});

const RootTitle: FC<any> = observer(
  ({
    item, // can be undefined for group titles in Labels or Tools mode
    label,
    isArea,
    ...props
  }) => {
    const hovered = item?.highlighted;
    const [collapsed, setCollapsed] = useState(false);

    const controls = useMemo(() => {
      if (!isArea) return [];
      return item.perRegionDescControls ?? [];
    }, [item?.perRegionDescControls, isArea]);

    const hasControls = useMemo(() => {
      return controls.length > 0;
    }, [controls.length]);

    const toggleCollapsed = useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        setCollapsed(!collapsed);
      },
      [collapsed],
    );

    return (
      <div className={cn("outliner-item").toClassName()}>
        <div className={cn("outliner-item").elem("content").toClassName()}>
          {!props.isGroup && <div className={cn("outliner-item").elem("index").toClassName()}>{props.idx + 1}</div>}
          <div className={cn("outliner-item").elem("title").toClassName()}>
            {label}
            {item?.text && (
              <div className={cn("outliner-item").elem("text").toClassName()}>{item.text.replace(/\\n/g, "\n")}</div>
            )}
            {(item?.isDrawing || item?.incomplete) && (
              <span className={cn("outliner-item").elem("incomplete").toClassName()}>
                <Tooltip title={`Incomplete ${item.type?.replace("region", "") ?? "region"}`}>
                  <IconWarning />
                </Tooltip>
              </span>
            )}
          </div>
          {item?.hideable !== false && (
            <RegionControls
              item={item}
              entity={props.entity}
              regions={props.children}
              type={props.type}
              collapsed={collapsed}
              hasControls={hasControls && isArea}
              toggleCollapsed={toggleCollapsed}
            />
          )}
        </div>

        {!collapsed && hasControls && isArea && (
          <div className={cn("outliner-item").elem("ocr").toClassName()}>
            <RegionItemDesc
              item={item}
              controls={controls}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              selected={props.selected}
            />
          </div>
        )}
      </div>
    );
  },
);

interface RegionControlsProps {
  item: any;
  entity?: any;
  type: string;
  hovered: boolean;
  hasControls: boolean;
  collapsed: boolean;
  regions?: Record<string, any>;
  toggleCollapsed: (e: any) => void;
}

const injector = inject(({ store }) => {
  return {
    store,
  };
});

const RegionControls: FC<RegionControlsProps> = injector(
  observer(({ hovered, item, entity, collapsed, regions, hasControls, type, toggleCollapsed, store }) => {
    const { regions: regionStore } = useContext(OutlinerContext);

    const hidden = useMemo(() => {
      if (type?.includes("region") || type?.includes("range")) {
        return entity.hidden;
      }
      if ((!type || type.includes("label") || type?.includes("tool")) && regions) {
        return Object.values(regions).every(({ hidden }) => hidden);
      }
      return false;
    }, [entity, type, regions]);

    const onToggleHidden = useCallback(() => {
      if (type?.includes("region") || type?.includes("range")) {
        entity.toggleHidden();
      } else if (!type || type.includes("label")) {
        regionStore.setHiddenByLabel(!hidden, entity);
      } else if (type?.includes("tool")) {
        regionStore.setHiddenByTool(!hidden, entity);
      }
    }, [item, item?.toggleHidden, hidden]);

    const onToggleCollapsed = useCallback(
      (e: MouseEvent) => {
        toggleCollapsed(e);
      },
      [toggleCollapsed],
    );

    const onToggleLocked = useCallback(() => {
      item.setLocked((locked: boolean) => !locked);
    }, []);

    return (
      <div
        className={cn("outliner-item")
          .elem("controls")
          .mod({ withControls: hasControls, newUI: isFF(FF_DEV_3873) })
          .toClassName()}
      >
        {isFF(FF_DEV_3873) ? (
          <Tooltip title={"Confidence Score"}>
            <div className={cn("outliner-item").elem("control-wrapper").toClassName()}>
              <div className={cn("outliner-item").elem("control").mod({ type: "predict" }).toClassName()}>
                {item?.origin === "prediction" && <IconSparks style={{ width: 18, height: 18 }} />}
              </div>
              <div className={cn("outliner-item").elem("control").mod({ type: "score" }).toClassName()}>
                {isDefined(item?.score) && item.score.toFixed(2)}
              </div>
            </div>
          </Tooltip>
        ) : (
          <>
            <div className={cn("outliner-item").elem("control").mod({ type: "score" }).toClassName()}>
              {isDefined(item?.score) && item.score.toFixed(2)}
            </div>
            <div className={cn("outliner-item").elem("control").mod({ type: "dirty" }).toClassName()}>
              {/* dirtyness is not implemented yet */}
            </div>
            <div className={cn("outliner-item").elem("control").mod({ type: "predict" }).toClassName()}>
              {item?.origin === "prediction" && <IconSparks style={{ width: 18, height: 18 }} />}
            </div>
          </>
        )}
        <div className={cn("outliner-item").elem("wrapper").toClassName()}>
          {store.hasInterface("annotations:copy-link") && isDefined(item?.annotation?.pk) && (
            <div className={cn("outliner-item").elem("control").mod({ type: "menu" }).toClassName()}>
              <RegionContextMenu item={item} />
            </div>
          )}
          <div className={cn("outliner-item").elem("control").mod({ type: "lock" }).toClassName()}>
            <LockButton
              item={item}
              annotation={item?.annotation}
              hovered={hovered}
              locked={item?.locked}
              onClick={onToggleLocked}
              variant="neutral"
              look="string"
              tooltip={item?.locked ? "Unlock Region" : "Lock Region"}
            />
          </div>
          <div className={cn("outliner-item").elem("control").mod({ type: "visibility" }).toClassName()}>
            {isFF(FF_DEV_3873) ? (
              <RegionControlButton
                variant="neutral"
                look="string"
                onClick={onToggleHidden}
                style={hidden ? undefined : { display: "none" }}
              >
                {hidden ? (
                  <IconEyeClosed style={{ width: 20, height: 20 }} />
                ) : (
                  <IconEyeOpened style={{ width: 20, height: 20 }} />
                )}
              </RegionControlButton>
            ) : (
              <RegionControlButton variant="neutral" look="string" onClick={onToggleHidden}>
                {hidden ? (
                  <IconEyeClosed style={{ width: 20, height: 20 }} />
                ) : (
                  <IconEyeOpened style={{ width: 20, height: 20 }} />
                )}
              </RegionControlButton>
            )}
          </div>
          {hasControls && (
            <div className={cn("outliner-item").elem("control").mod({ type: "visibility" }).toClassName()}>
              <RegionControlButton variant="neutral" look="string" onClick={onToggleCollapsed}>
                <IconChevronLeft
                  style={{
                    transform: `rotate(${collapsed ? -90 : 90}deg)`,
                  }}
                />
              </RegionControlButton>
            </div>
          )}
        </div>
      </div>
    );
  }),
);

interface RegionItemOCSProps {
  item: any;
  collapsed: boolean;
  controls: any[];
  selected: boolean;
  setCollapsed: (value: boolean) => void;
}

const RegionItemDesc: FC<RegionItemOCSProps> = observer(({ item, collapsed, setCollapsed, selected }) => {
  const controls: any[] = item.perRegionDescControls || [];

  const onClick = useCallback(
    (e) => {
      e.stopPropagation();

      if (!selected) {
        item.annotation.selectArea(item);
      }
    },
    [item, selected, collapsed],
  );

  return (
    <div
      className={cn("ocr")
        .mod({ collapsed, empty: !(controls?.length > 0) })
        .toClassName()}
      onClick={onClick}
      onDragStart={(e: any) => e.stopPropagation()}
    >
      <div className={cn("ocr").elem("controls").toClassName()}>
        {controls.map((tag, idx) => {
          const View = Registry.getPerRegionView(tag.type, PER_REGION_MODES.REGION_LIST);
          const color = item.getOneColor();
          const css = color ? chroma(color).alpha(0.2).css() : undefined;

          return View ? (
            <View
              key={idx}
              item={tag}
              area={item}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              color={css}
              outliner
              canDelete={false}
            />
          ) : null;
        })}
      </div>
    </div>
  );
});

export const OutlinerTree = observer(OutlinerTreeComponent);
