import { memo, useCallback, useMemo, type ReactNode } from "react";
import { FixedSizeList as List, type ListChildComponentProps } from "react-window";

import { IconChevronRight } from "@humansignal/icons";

import { Button } from "../button/button";
import { Checkbox } from "../checkbox/checkbox";
import { Spinner } from "../spinner/spinner";
import { cn } from "../../utils/utils";

export type TreeSelectCheckState = "checked" | "unchecked" | "indeterminate";

export type TreeSelectNode = {
  label: ReactNode;
  value: string;
  key: string;
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
  loadingKeys?: ReadonlySet<string>;
  onToggleExpand: (node: TreeSelectNode) => void | Promise<void>;
  onToggleSelect: (node: TreeSelectNode) => void;
  className?: string;
};

type FlatNode = {
  node: TreeSelectNode;
  depth: number;
};

type RowData = Omit<TreeSelectProps, "nodes" | "className" | "expandedKeys" | "selectedValues"> & {
  rows: FlatNode[];
  expandedSet: ReadonlySet<string>;
  selectedSet: ReadonlySet<string>;
};

type BranchProps = Omit<TreeSelectProps, "nodes" | "className" | "expandedKeys" | "selectedValues"> & {
  node: TreeSelectNode;
  depth: number;
  expandedSet: ReadonlySet<string>;
  selectedSet: ReadonlySet<string>;
};

function ariaLabelForNode(node: TreeSelectNode): string {
  return typeof node.label === "string" ? node.label : node.value;
}

function TreeSelectBranch({
  node,
  depth,
  expandedSet,
  loadingKeys,
  selectedSet,
  onToggleExpand,
  onToggleSelect,
}: BranchProps) {
  const key = String(node.key);
  const expanded = expandedSet.has(key);
  const hasChildren = !!node.children?.length;
  const showExpand = hasChildren || node.isLeaf === false;
  const loading = !!loadingKeys?.has(key) || !!node.loading;
  const explicit = node.checkState !== undefined;
  const checked = explicit ? node.checkState === "checked" : selectedSet.has(node.value);
  const indeterminate = explicit ? node.checkState === "indeterminate" : false;
  const disabled = !!node.disabled;
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
      className={cn(
        "group min-w-0 w-full max-w-full overflow-hidden rounded-smallest transition-colors duration-150 ease-out",
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
          >
            {node.label}
          </Button>
        ) : (
          <div
            data-testid="taxonomy-tree-row-label"
            className="htx-taxonomy-node-title min-w-0 flex-1 text-left text-body-small leading-tight text-neutral-content px-tighter py-0"
          >
            {node.label}
          </div>
        )}
        {node.rowSuffix != null ? (
          <div
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

function areTreeSelectBranchPropsEqual(prev: BranchProps, next: BranchProps): boolean {
  if (prev.depth !== next.depth) return false;
  if (prev.expandedSet !== next.expandedSet) return false;
  if (prev.loadingKeys !== next.loadingKeys) return false;
  if (prev.onToggleExpand !== next.onToggleExpand) return false;
  if (prev.onToggleSelect !== next.onToggleSelect) return false;

  const pn = prev.node;
  const nn = next.node;
  if (pn.key !== nn.key || pn.value !== nn.value) return false;
  if (pn.checkState !== nn.checkState) return false;
  if (!!pn.disabled !== !!nn.disabled) return false;
  if (!!pn.loading !== !!nn.loading) return false;
  if (pn.labelIsInteractive !== nn.labelIsInteractive) return false;
  if (pn.expandLabelTogglesExpand !== nn.expandLabelTogglesExpand) return false;
  if (pn.isLeaf !== nn.isLeaf) return false;
  if ((pn.children?.length ?? 0) !== (nn.children?.length ?? 0)) return false;
  if (pn.label !== nn.label) return false;
  if (pn.rowSuffix !== nn.rowSuffix) return false;

  const explicit = nn.checkState !== undefined;
  if (!explicit && prev.selectedSet !== next.selectedSet) return false;

  return true;
}

const TreeSelectBranchMemo = memo(TreeSelectBranch, areTreeSelectBranchPropsEqual);

function TreeSelectRow({ index, style, data }: ListChildComponentProps<RowData>) {
  const row = data.rows[index];

  return (
    <div style={{ ...style, width: "100%", maxWidth: "100%", overflow: "hidden" }}>
      <TreeSelectBranchMemo
        node={row.node}
        depth={row.depth}
        expandedSet={data.expandedSet}
        loadingKeys={data.loadingKeys}
        selectedSet={data.selectedSet}
        onToggleExpand={data.onToggleExpand}
        onToggleSelect={data.onToggleSelect}
      />
    </div>
  );
}

/** Must match rendered row height (`h-8` + no vertical padding) for react-window. */
const ROW_HEIGHT = 32;
const MAX_VISIBLE_ROWS = 12;

export const TreeSelect = ({
  nodes,
  expandedKeys,
  loadingKeys,
  selectedValues,
  onToggleExpand,
  onToggleSelect,
  className,
}: TreeSelectProps) => {
  const expandedSet = useMemo(() => new Set(expandedKeys), [expandedKeys]);
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const rows = useMemo(() => {
    const list: FlatNode[] = [];
    const walk = (treeNodes: TreeSelectNode[], depth: number) => {
      treeNodes.forEach((node) => {
        list.push({ node, depth });
        const isExpanded = expandedSet.has(String(node.key));
        if (isExpanded && node.children?.length) {
          walk(node.children, depth + 1);
        }
      });
    };

    walk(nodes, 0);
    return list;
  }, [expandedSet, nodes]);

  const useVirtualizedList = rows.length > MAX_VISIBLE_ROWS;
  const visibleCount = Math.min(rows.length, MAX_VISIBLE_ROWS);
  const listHeight = Math.max(ROW_HEIGHT, visibleCount * ROW_HEIGHT);
  const rowData = useMemo<RowData>(
    () => ({
      rows,
      expandedSet,
      selectedSet,
      loadingKeys,
      onToggleExpand,
      onToggleSelect,
    }),
    [rows, expandedSet, selectedSet, loadingKeys, onToggleExpand, onToggleSelect],
  );

  return (
    <div
      className={cn(
        "taxonomy-tree min-h-0 min-w-0 w-full max-w-full overflow-x-hidden",
        useVirtualizedList ? "max-h-96 overflow-y-hidden py-tighter" : "max-h-96 overflow-y-auto py-tighter",
        className,
      )}
    >
      {useVirtualizedList ? (
        <List
          itemData={rowData}
          itemCount={rows.length}
          itemSize={ROW_HEIGHT}
          height={listHeight}
          width="100%"
          overscanCount={6}
          style={{ overflowX: "hidden" }}
        >
          {TreeSelectRow}
        </List>
      ) : (
        rows.map((row) => (
          <TreeSelectBranchMemo
            key={row.node.key}
            node={row.node}
            depth={row.depth}
            expandedSet={expandedSet}
            loadingKeys={loadingKeys}
            selectedSet={selectedSet}
            onToggleExpand={onToggleExpand}
            onToggleSelect={onToggleSelect}
          />
        ))
      )}
    </div>
  );
};
