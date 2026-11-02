import { memo, useCallback, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { FixedSizeList as List, type ListChildComponentProps, type ListOnItemsRenderedProps } from "react-window";

import { IconChevronRight } from "@humansignal/icons";

import { Button } from "../button/button";
import { Checkbox } from "../checkbox/checkbox";
import { Spinner } from "../spinner/spinner";
import { cn } from "../../utils/utils";

export type TreeSelectCheckState = "checked" | "unchecked" | "indeterminate";

export type TreeSelectNode = {
  label: ReactNode;
  /** Render a mounted row label with its current state, without rebuilding the node tree. */
  renderLabel?: (state: { selected: boolean; expanded: boolean }) => ReactNode;
  value: string;
  key: string;
  /** Plain text name when the visible label contains markup. */
  ariaLabel?: string;
  testId?: string;
  isLeaf?: boolean;
  children?: TreeSelectNode[];
  disabled?: boolean;
  loading?: boolean;
  /** When set, checkbox reflects hierarchy instead of membership in `selectedValues` alone. */
  checkState?: TreeSelectCheckState;
  /** Optional control after the label (e.g. row actions). Clicks should stop propagation when needed. */
  rowSuffix?: ReactNode;
  /**
   * When false, `label` is not wrapped in a button (use for embedded inputs or custom controls).
   * Checkbox column is unchanged; expand chevron still applies when applicable.
   */
  labelIsInteractive?: boolean;
  /**
   * When true with an expandable row, label click toggles expand/collapse instead of selection.
   * Checkbox remains controlled by `disabled` / selection handlers separately (e.g. leafs-only parents).
   */
  expandLabelTogglesExpand?: boolean;
};

export type TreeSelectProps = {
  nodes: TreeSelectNode[];
  expandedKeys: string[];
  selectedValues: string[];
  /** Resolve dynamic state only for mounted rows (and keyboard activation). */
  getNodeState?: (node: TreeSelectNode) => { checkState?: TreeSelectCheckState; disabled?: boolean };
  loadingKeys?: ReadonlySet<string>;
  onToggleExpand: (node: TreeSelectNode) => void | Promise<void>;
  onToggleSelect: (node: TreeSelectNode) => void;
  className?: string;
  /** A named tree enables tree semantics and roving keyboard navigation. */
  ariaLabel?: string;
  ariaLabelledBy?: string;
  required?: boolean;
  multiple?: boolean;
};

type FlatNode = {
  node: TreeSelectNode;
  depth: number;
  parentKey?: string;
  position: number;
  siblingCount: number;
};

type TreeNavigation = {
  accessible: boolean;
  focusedKey: string | undefined;
  registerRow: (key: string, element: HTMLDivElement | null) => void;
  onRowFocus: (key: string) => void;
  onRowKeyDown: (event: KeyboardEvent<HTMLDivElement>, node: TreeSelectNode) => void;
};

type RowData = Omit<TreeSelectProps, "nodes" | "className" | "expandedKeys" | "selectedValues"> & {
  rows: FlatNode[];
  expandedSet: ReadonlySet<string>;
  selectedSet: ReadonlySet<string>;
} & TreeNavigation;

export type TreeSelectItemProps = Omit<TreeSelectProps, "nodes" | "className" | "expandedKeys" | "selectedValues"> & {
  node: TreeSelectNode;
  depth: number;
  expandedSet: ReadonlySet<string>;
  selectedSet: ReadonlySet<string>;
  position: number;
  siblingCount: number;
  focused: boolean;
} & Omit<TreeNavigation, "focusedKey" | "onRowFocus" | "onRowKeyDown"> &
  Partial<Pick<TreeNavigation, "onRowFocus" | "onRowKeyDown">>;

function ariaLabelForNode(node: TreeSelectNode): string {
  return node.ariaLabel ?? (typeof node.label === "string" ? node.label : node.value);
}

type TreeSelectBranchProps = Omit<
  TreeSelectItemProps,
  "expandedSet" | "loadingKeys" | "selectedSet" | "getNodeState"
> & {
  expanded: boolean;
  loading: boolean;
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
};

function TreeSelectBranch({
  node,
  depth,
  expanded,
  loading,
  checked,
  indeterminate,
  disabled,
  onToggleExpand,
  onToggleSelect,
  accessible,
  focused,
  position,
  siblingCount,
  registerRow,
  onRowFocus,
  onRowKeyDown,
}: TreeSelectBranchProps) {
  const key = String(node.key);
  const hasChildren = !!node.children?.length;
  const showExpand = hasChildren || node.isLeaf === false;
  const labelInteractive = node.labelIsInteractive !== false;
  const expandLabelTogglesExpand = !!node.expandLabelTogglesExpand;
  /**
   * Hover when the row is still interactable: selectable, expandable (chevron / expand-only parents),
   * or label expands in leafs-only mode. Fully locked leaf rows (e.g. max usage) get no hover.
   * Match Select/ColumnPicker options: `hover:bg-primary-emphasis-subtle` on the interactive surface.
   */
  const rowShowsHover = !disabled || showExpand;

  const handleExpandClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      await onToggleExpand(node);
    },
    [node, onToggleExpand],
  );

  const handleSelect = useCallback(
    (e: React.SyntheticEvent) => {
      e.stopPropagation();
      if (disabled) return;
      onToggleSelect(node);
    },
    [disabled, node, onToggleSelect],
  );

  return (
    <div
      ref={accessible ? (element) => registerRow(key, element) : undefined}
      role={accessible ? "treeitem" : undefined}
      aria-label={accessible ? ariaLabelForNode(node) : undefined}
      aria-level={accessible ? depth + 1 : undefined}
      aria-posinset={accessible ? position : undefined}
      aria-setsize={accessible ? siblingCount : undefined}
      aria-expanded={accessible && showExpand ? expanded : undefined}
      aria-checked={accessible ? (indeterminate ? "mixed" : checked) : undefined}
      aria-disabled={accessible ? disabled && !showExpand : undefined}
      tabIndex={accessible ? (focused ? 0 : -1) : undefined}
      data-testid={node.testId}
      data-key={key}
      onFocus={accessible ? () => onRowFocus?.(key) : undefined}
      onKeyDown={accessible ? (event) => onRowKeyDown?.(event, node) : undefined}
      className={cn(
        "group min-w-0 w-full max-w-full overflow-hidden rounded-smallest transition-colors duration-150 ease-out",
        accessible &&
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-focus",
        rowShowsHover && "hover:bg-primary-emphasis-subtle",
      )}
    >
      <div
        className="flex h-8 w-full max-w-full min-w-0 items-center gap-tighter py-0 pr-tight"
        style={{ paddingLeft: depth * 10 + 2 }}
      >
        {showExpand ? (
          <Button
            type="button"
            variant="neutral"
            look="string"
            size="smaller"
            align="center"
            className={cn(
              "size-5 shrink-0 !min-h-5 !min-w-5 rounded-smallest border-0 !p-0 shadow-none",
              "text-neutral-content-subtle hover:bg-primary-emphasis-subtle",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-focus",
              "[&>span]:!min-h-0 [&>span]:min-w-0 [&>span]:!flex-1 [&>span]:!justify-center [&>span]:!p-0 [&>span]:!px-0",
            )}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse" : "Expand"}
            onClick={handleExpandClick}
            tabIndex={accessible ? -1 : undefined}
          >
            {loading ? (
              <Spinner size={12} />
            ) : (
              <IconChevronRight
                className={`size-3.5 shrink-0 text-neutral-content-subtle transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
              />
            )}
          </Button>
        ) : (
          <span className="w-5 shrink-0" aria-hidden />
        )}
        <Checkbox
          checked={checked}
          indeterminate={indeterminate}
          disabled={disabled}
          ariaLabel={`Select ${ariaLabelForNode(node)}`}
          onChange={handleSelect}
          className="shrink-0"
          tabIndex={accessible ? -1 : undefined}
        />
        {labelInteractive ? (
          <Button
            type="button"
            data-testid="taxonomy-tree-row-label"
            variant="neutral"
            look="string"
            size="small"
            align="left"
            className={cn(
              "htx-taxonomy-node-title min-h-8 min-w-0 flex-1 !h-8 rounded-smallest border-0 !shadow-none",
              "text-left font-normal text-body-small leading-tight text-neutral-content",
              "hover:!bg-transparent disabled:opacity-50 disabled:hover:!bg-transparent",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-focus",
              "[&>span]:min-w-0 [&>span]:flex-1 [&>span]:justify-start [&>span]:px-tighter [&>span]:py-0 [&>span]:text-left",
            )}
            disabled={expandLabelTogglesExpand ? false : disabled}
            onClick={expandLabelTogglesExpand && showExpand ? handleExpandClick : handleSelect}
            tabIndex={accessible ? -1 : undefined}
          >
            {node.renderLabel ? node.renderLabel({ selected: checked, expanded }) : node.label}
          </Button>
        ) : (
          <div
            data-tree-row-action
            data-testid="taxonomy-tree-row-label"
            className="htx-taxonomy-node-title min-w-0 flex-1 text-left text-body-small leading-tight text-neutral-content px-tighter py-0"
          >
            {node.renderLabel ? node.renderLabel({ selected: checked, expanded }) : node.label}
          </div>
        )}
        {node.rowSuffix != null ? (
          <div
            data-tree-row-action
            className="flex shrink-0 items-center self-stretch opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {node.rowSuffix}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function areTreeSelectBranchPropsEqual(prev: TreeSelectBranchProps, next: TreeSelectBranchProps): boolean {
  if (prev.accessible !== next.accessible || prev.focused !== next.focused) return false;
  if (prev.position !== next.position || prev.siblingCount !== next.siblingCount) return false;
  if (prev.registerRow !== next.registerRow || prev.onRowFocus !== next.onRowFocus) return false;
  if (prev.onRowKeyDown !== next.onRowKeyDown) return false;
  if (prev.depth !== next.depth) return false;
  if (prev.expanded !== next.expanded || prev.loading !== next.loading) return false;
  if (prev.checked !== next.checked || prev.indeterminate !== next.indeterminate || prev.disabled !== next.disabled)
    return false;
  if (prev.onToggleExpand !== next.onToggleExpand) return false;
  if (prev.onToggleSelect !== next.onToggleSelect) return false;

  const pn = prev.node;
  const nn = next.node;
  if (pn.key !== nn.key || pn.value !== nn.value) return false;
  if (pn.ariaLabel !== nn.ariaLabel || pn.testId !== nn.testId) return false;
  if (pn.checkState !== nn.checkState) return false;
  if (!!pn.disabled !== !!nn.disabled) return false;
  if (!!pn.loading !== !!nn.loading) return false;
  if (pn.labelIsInteractive !== nn.labelIsInteractive) return false;
  if (pn.expandLabelTogglesExpand !== nn.expandLabelTogglesExpand) return false;
  if (pn.isLeaf !== nn.isLeaf) return false;
  if ((pn.children?.length ?? 0) !== (nn.children?.length ?? 0)) return false;
  if (pn.label !== nn.label || pn.renderLabel !== nn.renderLabel) return false;
  if (pn.rowSuffix !== nn.rowSuffix) return false;

  return true;
}

const MemoTreeSelectBranch = memo(TreeSelectBranch, areTreeSelectBranchPropsEqual);

export function TreeSelectItem({ expandedSet, loadingKeys, selectedSet, getNodeState, ...props }: TreeSelectItemProps) {
  const { node } = props;
  const state = getNodeState?.(node);
  const checkState = state?.checkState ?? node.checkState;
  return (
    <MemoTreeSelectBranch
      {...props}
      expanded={expandedSet.has(String(node.key))}
      loading={!!loadingKeys?.has(String(node.key)) || !!node.loading}
      checked={checkState === undefined ? selectedSet.has(node.value) : checkState === "checked"}
      indeterminate={checkState === "indeterminate"}
      disabled={state?.disabled ?? !!node.disabled}
    />
  );
}

function TreeSelectRow({ index, style, data }: ListChildComponentProps<RowData>) {
  const row = data.rows[index];

  return (
    <div style={{ ...style, width: "100%", maxWidth: "100%", overflow: "hidden" }}>
      <TreeSelectItem
        node={row.node}
        depth={row.depth}
        expandedSet={data.expandedSet}
        loadingKeys={data.loadingKeys}
        selectedSet={data.selectedSet}
        getNodeState={data.getNodeState}
        onToggleExpand={data.onToggleExpand}
        onToggleSelect={data.onToggleSelect}
        accessible={data.accessible}
        focused={data.focusedKey === String(row.node.key)}
        position={row.position}
        siblingCount={row.siblingCount}
        registerRow={data.registerRow}
        onRowFocus={data.onRowFocus}
        onRowKeyDown={data.onRowKeyDown}
      />
    </div>
  );
}

const rowKey = (index: number, data: RowData) => data.rows[index].node.key;

/** Must match rendered row height (`h-8` + no vertical padding) for react-window. */
const ROW_HEIGHT = 32;
const MAX_VISIBLE_ROWS = 12;

export const TreeSelect = ({
  nodes,
  expandedKeys,
  loadingKeys,
  selectedValues,
  getNodeState,
  onToggleExpand,
  onToggleSelect,
  className,
  ariaLabel,
  ariaLabelledBy,
  required,
  multiple = true,
}: TreeSelectProps) => {
  const accessible = !!(ariaLabel || ariaLabelledBy);
  const [focusedKey, setFocusedKey] = useState<string>();
  const [renderedRange, setRenderedRange] = useState<ListOnItemsRenderedProps>();
  const listRef = useRef<List<RowData>>(null);
  const rowElements = useRef(new Map<string, HTMLDivElement>());
  const pendingFocus = useRef<string>();
  const expandedSet = useMemo(() => new Set(expandedKeys), [expandedKeys]);
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const rows = useMemo(() => {
    const list: FlatNode[] = [];
    const walk = (treeNodes: TreeSelectNode[], depth: number, parentKey?: string) => {
      treeNodes.forEach((node, index) => {
        list.push({ node, depth, parentKey, position: index + 1, siblingCount: treeNodes.length });
        const isExpanded = expandedSet.has(String(node.key));
        if (isExpanded && node.children?.length) {
          walk(node.children, depth + 1, String(node.key));
        }
      });
    };

    walk(nodes, 0);
    return list;
  }, [expandedSet, nodes]);
  const rowIndices = useMemo(() => new Map(rows.map((row, index) => [String(row.node.key), index])), [rows]);
  const focusedIndex = focusedKey === undefined ? 0 : (rowIndices.get(focusedKey) ?? 0);
  const activeIndex =
    rows.length > MAX_VISIBLE_ROWS &&
    renderedRange &&
    (focusedIndex < renderedRange.overscanStartIndex || focusedIndex > renderedRange.overscanStopIndex)
      ? Math.min(renderedRange.visibleStartIndex, rows.length - 1)
      : focusedIndex;
  const activeKey = String(rows[activeIndex]?.node.key ?? "");
  const registerRow = useCallback((key: string, element: HTMLDivElement | null) => {
    if (element) {
      rowElements.current.set(key, element);
      if (pendingFocus.current === key) {
        pendingFocus.current = undefined;
        element.focus({ preventScroll: true });
      }
    } else {
      rowElements.current.delete(key);
    }
  }, []);
  const focusRow = useCallback(
    (index: number) => {
      const row = rows[index];
      if (!row) return;
      const key = String(row.node.key);
      pendingFocus.current = key;
      setFocusedKey(key);
      listRef.current?.scrollToItem(index, "smart");
      const element = rowElements.current.get(key);
      if (element) {
        pendingFocus.current = undefined;
        element.focus({ preventScroll: true });
      }
    },
    [rows],
  );
  const handleRowKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, node: TreeSelectNode) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable=true], [data-tree-row-action]")) return;
      const index = rowIndices.get(String(node.key));
      if (index === undefined) return;
      const row = rows[index];
      const expandable = !!node.children?.length || node.isLeaf === false;
      const expanded = expandedSet.has(String(node.key));
      const toggleExpand = () => {
        // Expanding can switch between plain and virtual rows, replacing the focused DOM element.
        pendingFocus.current = String(node.key);
        void onToggleExpand(node);
      };
      switch (event.key) {
        case "ArrowDown":
          focusRow(Math.min(index + 1, rows.length - 1));
          break;
        case "ArrowUp":
          focusRow(Math.max(index - 1, 0));
          break;
        case "Home":
          focusRow(0);
          break;
        case "End":
          focusRow(rows.length - 1);
          break;
        case "ArrowRight":
          if (expandable && !expanded) toggleExpand();
          else if (expanded && node.children?.length) focusRow(index + 1);
          break;
        case "ArrowLeft":
          if (expandable && expanded) toggleExpand();
          else if (row.parentKey !== undefined) {
            const parentIndex = rowIndices.get(row.parentKey);
            if (parentIndex !== undefined) focusRow(parentIndex);
          }
          break;
        case "Enter":
        case " ":
          if (node.expandLabelTogglesExpand && expandable) toggleExpand();
          else if (!(getNodeState?.(node).disabled ?? node.disabled) && node.labelIsInteractive !== false)
            onToggleSelect(node);
          break;
        default:
          return;
      }
      event.preventDefault();
      event.stopPropagation();
    },
    [expandedSet, focusRow, getNodeState, onToggleExpand, onToggleSelect, rowIndices, rows],
  );

  const keyDownRef = useRef(handleRowKeyDown);
  keyDownRef.current = handleRowKeyDown;
  const onRowKeyDown = useCallback<NonNullable<TreeSelectItemProps["onRowKeyDown"]>>(
    (event, node) => keyDownRef.current(event, node),
    [],
  );

  const useVirtualizedList = rows.length > MAX_VISIBLE_ROWS;
  const visibleCount = Math.min(rows.length, MAX_VISIBLE_ROWS);
  const listHeight = Math.max(ROW_HEIGHT, visibleCount * ROW_HEIGHT);
  const rowData = useMemo<RowData>(
    () => ({
      rows,
      expandedSet,
      selectedSet,
      getNodeState,
      loadingKeys,
      onToggleExpand,
      onToggleSelect,
      accessible,
      focusedKey: activeKey,
      registerRow,
      onRowFocus: setFocusedKey,
      onRowKeyDown,
    }),
    [
      rows,
      expandedSet,
      selectedSet,
      getNodeState,
      loadingKeys,
      onToggleExpand,
      onToggleSelect,
      accessible,
      activeKey,
      registerRow,
      onRowKeyDown,
    ],
  );

  return (
    <div
      role={accessible ? "tree" : undefined}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-required={accessible ? required : undefined}
      aria-multiselectable={accessible ? multiple : undefined}
      className={cn(
        "taxonomy-tree min-h-0 min-w-0 w-full max-w-full overflow-x-hidden",
        useVirtualizedList ? "max-h-96 overflow-y-hidden py-tighter" : "max-h-96 overflow-y-auto py-tighter",
        className,
      )}
    >
      {useVirtualizedList ? (
        <List
          ref={listRef}
          itemData={rowData}
          itemKey={rowKey}
          itemCount={rows.length}
          itemSize={ROW_HEIGHT}
          height={listHeight}
          width="100%"
          overscanCount={6}
          onItemsRendered={accessible ? setRenderedRange : undefined}
          style={{ overflowX: "hidden" }}
        >
          {TreeSelectRow}
        </List>
      ) : (
        rows.map((row) => (
          <TreeSelectItem
            key={row.node.key}
            node={row.node}
            depth={row.depth}
            expandedSet={expandedSet}
            loadingKeys={loadingKeys}
            selectedSet={selectedSet}
            getNodeState={getNodeState}
            onToggleExpand={onToggleExpand}
            onToggleSelect={onToggleSelect}
            accessible={accessible}
            focused={activeKey === String(row.node.key)}
            position={row.position}
            siblingCount={row.siblingCount}
            registerRow={registerRow}
            onRowFocus={setFocusedKey}
            onRowKeyDown={onRowKeyDown}
          />
        ))
      )}
    </div>
  );
};
