import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeGrid as Grid, type GridChildComponentProps } from "react-window";

import { IconChevronDown, IconEllipsis, IconEmptyFolder, IconSearch } from "@humansignal/icons";
import { Badge, Button, EmptyState, Popover, Tooltip } from "@humansignal/ui";

import { TaxonomySearch, type TaxonomySearchRef } from "./TaxonomySearch";
import { TaxonomyTree, type TaxonomyTreeNode } from "./taxonomy-tree";

import "./TaxonomyEcho466.prefix.css";

export type TaxonomyPath = string[];
type onAddLabelCallback = (path: string[]) => any;
type onDeleteLabelCallback = (path: string[]) => any;

export type TaxonomyItem = {
  label: string;
  path: TaxonomyPath;
  depth: number;
  isLeaf?: boolean;
  children?: TaxonomyItem[];
  origin?: "config" | "user" | "session";
  hint?: string;
  color?: string;
};

/** Labels merged from `userLabels` (not from XML / API tree alone). */
function isUserAddedTaxonomyItem(item: TaxonomyItem): boolean {
  return item.origin === "user" || item.origin === "session";
}

export type { TaxonomyTreeNode };

type TaxonomyOptions = {
  leafsOnly?: boolean;
  showFullPath?: boolean;
  pathSeparator: string;
  /** From XML / MobX this is often a string (e.g. `"1"`); numeric comparisons must coerce. */
  maxUsages?: number | string;
  maxWidth?: number;
  minWidth?: number;
  dropdownWidth?: number;
  placeholder?: string;
};

export type SelectedItem = {
  label: string;
  value: string;
}[];

type TaxonomyProps = {
  items: TaxonomyItem[];
  selected: SelectedItem[];
  onChange: (node: any, selected: TaxonomyPath[]) => any;
  onLoadData?: (item: TaxonomyPath) => any;
  onAddLabel?: onAddLabelCallback;
  onDeleteLabel?: onDeleteLabelCallback;
  options: TaxonomyOptions;
  isEditable?: boolean;
};

type TaxonomyExtendedOptions = TaxonomyOptions & {
  maxUsagesReached?: boolean;
};

/** Tag model stores `maxUsages` as string; `>=` coerces, but `typeof === "number"` checks miss the limit. */
function parsePositiveMaxUsages(raw: unknown): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(String(raw));
  if (!Number.isFinite(n) || n < 1) return undefined;
  return Math.trunc(n);
}

/** Synthetic child row for inline "add label" input; must not collide with real `value` strings. */
const TAXONOMY_ADD_ROW_VALUE_SUFFIX = "\u0007taxonomy-add-row";

const ROW_ACTIONS_MENU_MIN_WIDTH_PX = 160;

/** Max height of selected-tags area in the trigger (prevents full-page growth). */
const SELECTION_VIEWPORT_MAX_PX = 120;
/** Row height for virtualized tag grid (single-line badge + gap). */
const SELECTION_CHIP_ROW_HEIGHT_PX = 30;
const SELECTION_GRID_MIN_COL_WIDTH_PX = 100;
const SELECTION_GRID_GAP_PX = 6;
/** Use react-window grid above this count to cap DOM nodes while keeping wrap-like layout. */
const SELECTION_VIRTUALIZE_THRESHOLD = 12;

type DisplayedSelection = { value: string; label: string; isUserAdded?: boolean };

type SelectionGridData = {
  displayed: DisplayedSelection[];
  columnCount: number;
  isEditable: boolean;
  removeTag: (pathValue: string) => void;
};

function TaxonomySelectionBadgeCell({
  columnIndex,
  rowIndex,
  style,
  data,
}: GridChildComponentProps<SelectionGridData>) {
  const index = rowIndex * data.columnCount + columnIndex;
  const { displayed, isEditable, removeTag } = data;
  if (index >= displayed.length) {
    return <div style={style as React.CSSProperties} className="box-border" />;
  }
  const d = displayed[index]!;
  return (
    <div
      style={style as React.CSSProperties}
      className="box-border flex min-w-0 items-center justify-start pr-tighter pb-tighter"
    >
      <Badge
        variant="grape"
        look="filled"
        size="small"
        shape="squared"
        className="htx-taxonomy-selection-item max-w-full min-w-0 shrink"
        maxWidth={220}
        onClose={
          isEditable
            ? (e) => {
                e.stopPropagation();
                removeTag(d.value);
              }
            : undefined
        }
      >
        <span className={`htx-taxonomy-selection-item-label truncate${d.isUserAdded ? " italic" : ""}`}>{d.label}</span>
      </Badge>
    </div>
  );
}

type UserLabelsTreeContext = {
  pendingAddParentValueStr: string | null;
  isEditable: boolean;
  onStartAddUnder: (parentValueStr: string) => void;
  onCancelAdd: () => void;
  onCommitChildLabel: (parentPath: TaxonomyPath, label: string) => void;
  onAddLabel: onAddLabelCallback;
  onDeleteLabel?: onDeleteLabelCallback;
  openRowActions: (args: { value: string; path: TaxonomyPath; canDelete: boolean; anchorEl: HTMLElement }) => void;
};

function TaxonomyInlineAddLabel({ onCommit, onCancel }: { onCommit: (name: string) => void; onCancel: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onInteraction = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => {
      if (!inputRef.current) return;
      const value = inputRef.current.value.trim();
      const key = "key" in e ? e.key : undefined;
      const isEscape = key === "Escape";
      const isEnter = key === "Enter";
      const isBlur = e.type === "blur";

      if (isEscape) e.stopPropagation();
      if (isEnter && !value) return;

      if ((isBlur || isEnter) && value) {
        onCommit(value);
      }

      if (isBlur || isEnter || isEscape) {
        inputRef.current.value = "";
        onCancel();
      }
    },
    [onCancel, onCommit],
  );

  return (
    <input
      ref={inputRef}
      name="taxonomy-add-label"
      type="text"
      className="h-6 w-full min-w-0 rounded-smallest border border-neutral-border bg-neutral-background px-tighter text-body-small text-neutral-content outline-none focus:ring-2 focus:ring-primary-focus"
      onKeyDown={onInteraction}
      onBlur={onInteraction}
      placeholder="New label"
      aria-label="New taxonomy label"
    />
  );
}

/**
 * Compact structural hash for memo deps. MobX can reuse the same `items` reference while
 * mutating nested `children`; `items` alone misses updates. Uses a 32-bit FNV-style mix instead
 * of concatenating full path strings (less allocation than a string fingerprint on large trees).
 */
function taxonomyItemsStructureHash(items: TaxonomyItem[]): number {
  let h = 2166136261;
  const mix = (n: number) => {
    h ^= n;
    h = Math.imul(h, 16777619);
  };
  const mixStr = (s: string) => {
    mix(s.length);
    for (let i = 0; i < s.length; i++) mix(s.charCodeAt(i));
  };
  const walk = (nodes: TaxonomyItem[]) => {
    for (const n of nodes) {
      mix(n.path.length);
      for (const p of n.path) mixStr(p);
      mixStr(n.label);
      mix(n.children?.length ?? 0);
      const leaf = n.isLeaf === false ? 2 : n.isLeaf === true ? 1 : 0;
      mix(leaf);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(items);
  return h | 0;
}

/** Resolve the taxonomy node for a selection path (branch checks, user-added metadata). */
function findTaxonomyItemByPathSegments(items: TaxonomyItem[], pathValues: string[]): TaxonomyItem | null {
  if (!pathValues.length) return null;
  let level = items;
  let match: TaxonomyItem | null = null;
  for (const segment of pathValues) {
    match =
      level.find((n) => {
        const last = n.path[n.path.length - 1];
        return last === segment || n.label === segment;
      }) ?? null;
    if (!match) return null;
    level = match.children ?? [];
  }
  return match;
}

/** Selectable values in the subtree rooted at `item` (leaves only when `leafsOnly`). */
function getSubtreeSelectableValues(item: TaxonomyItem, pathSeparator: string, leafsOnly: boolean): string[] {
  const value = item.path.join(pathSeparator);
  const hasChildren = !!item.children?.length;
  const isLeafNode = item.isLeaf !== false && !hasChildren;

  if (leafsOnly) {
    const acc: string[] = [];
    if (isLeafNode) acc.push(value);
    item.children?.forEach((c) => acc.push(...getSubtreeSelectableValues(c, pathSeparator, leafsOnly)));
    return acc;
  }
  const acc: string[] = [value];
  item.children?.forEach((c) => acc.push(...getSubtreeSelectableValues(c, pathSeparator, leafsOnly)));
  return acc;
}

/** Leaf path strings under `item` (not including `item` unless it is a leaf). */
function getSubtreeLeafPathStrings(item: TaxonomyItem, pathSeparator: string): string[] {
  const hasChildren = !!item.children?.length;
  const isLeafNode = item.isLeaf !== false && !hasChildren;
  if (isLeafNode) {
    return [item.path.join(pathSeparator)];
  }
  if (!item.children?.length) return [];
  return item.children.flatMap((c) => getSubtreeLeafPathStrings(c, pathSeparator));
}

/**
 * When `leafsOnly` is false, the parent path may be omitted while every leaf underneath is selected.
 * Then the branch should still read as fully checked and collapse to one parent chip.
 */
function nodeFullySelected(item: TaxonomyItem, pathSeparator: string, set: ReadonlySet<string>): boolean {
  const p = item.path.join(pathSeparator);
  if (set.has(p)) return true;
  const hasChildren = !!item.children?.length;
  const isLeafNode = item.isLeaf !== false && !hasChildren;
  if (isLeafNode) return false;
  if (!hasChildren) return false;
  return item.children!.every((c) => nodeFullySelected(c, pathSeparator, set));
}

/**
 * For each selected path, all proper prefix paths (ancestors) get marked — O(total segments)
 * so non–leafs-only indeterminate state is O(1) per tree node instead of O(|selections|).
 */
function buildAncestorPrefixSetFromSelected(selectedSet: ReadonlySet<string>, sep: string): Set<string> {
  const prefixSet = new Set<string>();
  for (const w of selectedSet) {
    const parts = w.split(sep);
    if (parts.length < 2) continue;
    let acc = parts[0]!;
    prefixSet.add(acc);
    for (let i = 1; i < parts.length - 1; i++) {
      acc = acc + sep + parts[i]!;
      prefixSet.add(acc);
    }
  }
  return prefixSet;
}

/** Per-node counts for leafs-only mode: total selectable leaves in subtree vs how many are selected. */
type LeafSelectionRowStats = { total: number; selected: number };

/**
 * Single post-order walk — O(nodes). Replaces per-branch O(|subtree leaves|) loops in check-state, which
 * was O(nodes × leaves) and caused severe lag with many selections on large taxonomies.
 */
function buildLeafSelectionStatsMap(
  items: TaxonomyItem[],
  pathSeparator: string,
  selectedSet: ReadonlySet<string>,
): Map<TaxonomyItem, LeafSelectionRowStats> {
  const map = new Map<TaxonomyItem, LeafSelectionRowStats>();

  const visit = (item: TaxonomyItem): LeafSelectionRowStats => {
    const value = item.path.join(pathSeparator);
    const hasChildren = !!item.children?.length;
    const isLeafNode = item.isLeaf !== false && !hasChildren;

    if (isLeafNode) {
      const stats = { total: 1, selected: selectedSet.has(value) ? 1 : 0 };
      map.set(item, stats);
      return stats;
    }

    let total = 0;
    let selected = 0;
    for (const c of item.children ?? []) {
      const cs = visit(c);
      total += cs.total;
      selected += cs.selected;
    }
    const stats = { total, selected };
    map.set(item, stats);
    return stats;
  };

  for (const root of items) visit(root);
  return map;
}

function taxonomyItemCheckState(
  item: TaxonomyItem,
  selectedSet: ReadonlySet<string>,
  _selectedDescendantCountByPrefix: ReadonlyMap<string, number>,
  pathSeparator: string,
  leafsOnly: boolean,
  _rootItems: TaxonomyItem[],
  ancestorPrefixSet: ReadonlySet<string> | null,
  leafRowStats: ReadonlyMap<TaxonomyItem, LeafSelectionRowStats> | null,
): "checked" | "unchecked" | "indeterminate" {
  const value = item.path.join(pathSeparator);
  const hasChildren = !!item.children?.length;
  const isLeafNode = item.isLeaf !== false && !hasChildren;

  if (leafsOnly) {
    if (!isLeafNode) {
      const st = leafRowStats?.get(item);
      if (!st || st.total === 0) return "unchecked";
      if (st.selected === 0) return "unchecked";
      return "indeterminate";
    }
    return selectedSet.has(value) ? "checked" : "unchecked";
  }

  if (selectedSet.has(value)) return "checked";
  if (ancestorPrefixSet?.has(value)) return "indeterminate";
  return "unchecked";
}

/** Remove stale branch-only paths in leafs-only mode when not all leaves are selected. */
function normalizeTaxonomySelectionPaths(
  pathStrings: string[],
  itemsByValue: ReadonlyMap<string, TaxonomyItem>,
  pathSeparator: string,
  leafsOnly: boolean,
  /** When set, O(1) per candidate path instead of collecting every leaf under each branch. */
  leafRowStats: ReadonlyMap<TaxonomyItem, LeafSelectionRowStats> | null,
): string[] {
  if (!leafsOnly) {
    return [...new Set(pathStrings)];
  }
  const set = new Set(pathStrings);
  return pathStrings.filter((v) => {
    const item = itemsByValue.get(v);
    if (!item) return true;
    const isBranch = (item.children?.length ?? 0) > 0 || item.isLeaf === false;
    if (!isBranch) return true;
    if (leafRowStats) {
      const st = leafRowStats.get(item);
      if (!st || st.total === 0) return true;
      if (st.selected === st.total) return true;
      return false;
    }
    const subtree = getSubtreeSelectableValues(item, pathSeparator, leafsOnly);
    if (subtree.length === 0) return true;
    if (subtree.every((x) => set.has(x))) return true;
    return false;
  });
}

type SelectionDisplayChip = { value: string; label: string; isUserAdded?: boolean };

/** One chip per branch when its whole selectable subtree is selected; otherwise one chip per selected leaf/node (taxonomy order). */
function collapsedSelectionDisplayChips(
  items: TaxonomyItem[],
  selectedSet: ReadonlySet<string>,
  selected: SelectedItem[],
  options: Pick<TaxonomyOptions, "showFullPath" | "pathSeparator">,
  leafsOnly: boolean,
  /** Precomputed leaf counts (same as convert); avoids O(nodes×leaves) getSubtree calls per render. */
  leafRowStats: ReadonlyMap<TaxonomyItem, LeafSelectionRowStats> | null,
): SelectionDisplayChip[] {
  const sep = options.pathSeparator;
  const accounted = new Set<string>();
  const out: SelectionDisplayChip[] = [];

  const walk = (nodes: TaxonomyItem[], ancestorLabels: string[]) => {
    for (const item of nodes) {
      const labelsHere = [...ancestorLabels, item.label];
      const valueStr = item.path.join(sep);
      const isBranch = (item.children?.length ?? 0) > 0 || item.isLeaf === false;

      if (leafsOnly && leafRowStats) {
        const st = leafRowStats.get(item);
        if (isBranch) {
          if ((st?.total ?? 0) > 0) {
            walk(item.children ?? [], labelsHere);
          }
          continue;
        }
        if (selectedSet.has(valueStr)) {
          out.push({
            value: valueStr,
            label: options.showFullPath ? labelsHere.join(sep) : item.label,
            isUserAdded: isUserAddedTaxonomyItem(item),
          });
          accounted.add(valueStr);
        }
        continue;
      }

      const subtree = getSubtreeSelectableValues(item, sep, leafsOnly);

      if (isBranch && subtree.length > 0) {
        if (leafsOnly) {
          walk(item.children ?? [], labelsHere);
          continue;
        }
        if (nodeFullySelected(item, sep, selectedSet)) {
          out.push({
            value: valueStr,
            label: options.showFullPath ? labelsHere.join(sep) : item.label,
            isUserAdded: isUserAddedTaxonomyItem(item),
          });
          for (const v of getSubtreeSelectableValues(item, sep, false)) {
            if (selectedSet.has(v)) accounted.add(v);
          }
          for (const l of getSubtreeLeafPathStrings(item, sep)) {
            if (selectedSet.has(l)) accounted.add(l);
          }
          continue;
        }
        walk(item.children ?? [], labelsHere);
        continue;
      }

      if (selectedSet.has(valueStr)) {
        out.push({
          value: valueStr,
          label: options.showFullPath ? labelsHere.join(sep) : item.label,
          isUserAdded: isUserAddedTaxonomyItem(item),
        });
        accounted.add(valueStr);
      }
    }
  };

  walk(items, []);

  for (const path of selected) {
    const v = path.map((p) => p.value).join(sep);
    if (accounted.has(v)) continue;
    const pathValues = path.map((p) => p.value);
    const node = findTaxonomyItemByPathSegments(items, pathValues);
    const isBranchInTree = node != null && ((node.children?.length ?? 0) > 0 || node.isLeaf === false);
    if (isBranchInTree && node) {
      let covered: boolean;
      if (leafsOnly && leafRowStats) {
        const st = leafRowStats.get(node);
        covered = !st || st.total === 0 || st.selected === st.total;
      } else {
        const subtree = getSubtreeSelectableValues(node, sep, leafsOnly);
        covered =
          subtree.length === 0 ||
          (leafsOnly ? subtree.every((x) => selectedSet.has(x)) : nodeFullySelected(node, sep, selectedSet));
      }
      if (!covered) {
        continue;
      }
    }
    out.push({
      value: v,
      label: options.showFullPath ? path.map((p) => p.label).join(sep) : path[path.length - 1]!.label,
      isUserAdded: node ? isUserAddedTaxonomyItem(node) : false,
    });
    accounted.add(v);
  }

  return out;
}

/** Reuse label/tooltip elements when `TaxonomyItem` instances are stable (e.g. API-loaded tree) — cuts React work on each selection change. */
const taxonomyRowTitleCache = new WeakMap<TaxonomyItem, React.ReactNode>();

function cachedTaxonomyRowTitle(item: TaxonomyItem, enrich: (item: TaxonomyItem) => React.ReactNode): React.ReactNode {
  const hit = taxonomyRowTitleCache.get(item);
  if (hit !== undefined) return hit;
  const node = enrich(item);
  taxonomyRowTitleCache.set(item, node);
  return node;
}

const convert = (
  items: TaxonomyItem[],
  options: TaxonomyExtendedOptions,
  selectedSet: ReadonlySet<string>,
  selectedDescendantCountByPrefix: ReadonlyMap<string, number>,
  userLabels: UserLabelsTreeContext | null,
  itemsByValue: Map<string, TaxonomyItem> | undefined,
  leafRowStats: ReadonlyMap<TaxonomyItem, LeafSelectionRowStats> | null,
): TaxonomyTreeNode[] => {
  const ancestorPrefixSet = options.leafsOnly
    ? null
    : buildAncestorPrefixSetFromSelected(selectedSet, options.pathSeparator);

  const enrich = (item: TaxonomyItem) => {
    const userAdded = isUserAddedTaxonomyItem(item);
    const emphasize = (node: React.ReactNode) => (userAdded ? <span className="italic">{node}</span> : node);

    const color = (it: TaxonomyItem) => (
      <span className="htx-taxonomy-item-color" style={{ background: it.color }}>
        {it.label}
      </span>
    );

    const body = item.color ? color(item) : item.label;
    const formatted = emphasize(body);

    if (!item.hint) return formatted;

    return (
      <Tooltip title={item.hint}>
        <span className="min-w-0 truncate">{formatted}</span>
      </Tooltip>
    );
  };

  const convertItem = (item: TaxonomyItem): TaxonomyTreeNode => {
    const value = item.path.join(options.pathSeparator);
    itemsByValue?.set(value, item);
    const isLeaf = item.isLeaf !== false && !item.children?.length;
    const leafsOnlyMode = !!options.leafsOnly;
    const noSelectableSubtree = leafsOnlyMode ? !isLeaf : false;
    const checkState = taxonomyItemCheckState(
      item,
      selectedSet,
      selectedDescendantCountByPrefix,
      options.pathSeparator,
      leafsOnlyMode,
      items,
      ancestorPrefixSet,
      leafRowStats,
    );
    // Match legacy Taxonomy: at the limit, only explicitly selected rows stay enabled (to unselect).
    // Indeterminate parents must be disabled — selecting them would add another path and break maxUsages.
    const disableCheckbox = noSelectableSubtree || (options.maxUsagesReached && checkState !== "checked");
    const expandLabelTogglesExpand = leafsOnlyMode && !isLeaf && (!!item.children?.length || item.isLeaf === false);

    const mappedChildren = item.children?.map(convertItem);
    let children = mappedChildren;
    if (userLabels && userLabels.pendingAddParentValueStr === value && userLabels.isEditable) {
      const addKey = `${value}${TAXONOMY_ADD_ROW_VALUE_SUFFIX}`;
      children = [
        ...(mappedChildren ?? []),
        {
          title: (
            <TaxonomyInlineAddLabel
              onCommit={(label) => userLabels.onCommitChildLabel(item.path, label)}
              onCancel={userLabels.onCancelAdd}
            />
          ),
          value: addKey,
          key: addKey,
          isLeaf: true,
          disableCheckbox: true,
          labelIsInteractive: false,
          checkState: undefined,
        },
      ];
    }

    const rowSuffix =
      userLabels?.onAddLabel && userLabels.isEditable ? (
        <Button
          type="button"
          variant="neutral"
          look="string"
          size="smaller"
          className="shrink-0 rounded-smallest text-neutral-content-subtle"
          data-taxonomy-row-actions-trigger="true"
          aria-label="Taxonomy row actions"
          aria-haspopup="menu"
          onClick={(e) => {
            e.stopPropagation();
            userLabels.openRowActions({
              value,
              path: item.path,
              canDelete: item.origin === "session" && !!userLabels.onDeleteLabel,
              anchorEl: e.currentTarget,
            });
          }}
        >
          <IconEllipsis className="size-4" aria-hidden />
        </Button>
      ) : undefined;

    return {
      title: cachedTaxonomyRowTitle(item, enrich) as TaxonomyTreeNode["title"],
      value,
      key: value,
      isLeaf,
      disableCheckbox,
      checkState,
      rowSuffix,
      expandLabelTogglesExpand,
      children,
    };
  };

  return items.map(convertItem);
};

const TaxonomyEcho466 = ({
  items,
  selected,
  onChange,
  onLoadData,
  onAddLabel,
  onDeleteLabel,
  options,
  isEditable = true,
}: TaxonomyProps) => {
  const refInput = useRef<TaxonomySearchRef>(null);
  const [filteredTreeData, setFilteredTreeData] = useState<TaxonomyTreeNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [rowActionsMenu, setRowActionsMenu] = useState<{
    value: string;
    path: TaxonomyPath;
    canDelete: boolean;
    top: number;
    left: number;
  } | null>(null);
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(() => new Set());
  const [addingUnderParentValue, setAddingUnderParentValue] = useState<string | null>(null);
  const [addingRootLabel, setAddingRootLabel] = useState(false);
  const [searchQueryTrimmed, setSearchQueryTrimmed] = useState("");
  const separator = options.pathSeparator;
  const style: React.CSSProperties = { minWidth: options.minWidth ?? 200, maxWidth: options.maxWidth };
  const dropdownWidth = options.dropdownWidth === undefined ? true : +options.dropdownWidth;
  const maxUsagesLimit = parsePositiveMaxUsages(options.maxUsages);
  const maxUsagesReached = maxUsagesLimit !== undefined && selected.length >= maxUsagesLimit;
  const selectedValues = useMemo(
    () => selected.map((path) => path.map((p) => p.value).join(separator)),
    [selected, separator],
  );
  const selectedDescendantCountByPrefix = useMemo(() => {
    const map = new Map<string, number>();
    for (const path of selected) {
      const segments = path.map((p) => p.value);
      if (segments.length < 2) continue;
      let prefix = "";
      for (let i = 0; i < segments.length - 1; i++) {
        prefix = i === 0 ? segments[i]! : `${prefix}${separator}${segments[i]}`;
        map.set(prefix, (map.get(prefix) ?? 0) + 1);
      }
    }
    return map;
  }, [selected, separator]);
  const selectedValuesKey = useMemo(() => selectedValues.join("\u0000"), [selectedValues]);
  /** Same ref as `items` is enough when the tree is replaced; avoids a full-tree hash walk on every render (popover/search UI state). */
  const itemsStructureHash = useMemo(() => taxonomyItemsStructureHash(items), [items]);

  /** Shared O(nodes) pass for check state, chip collapse, and normalize — avoids duplicate full-tree walks per update. */
  const leafSelectionRowStats = useMemo(
    () => (options.leafsOnly ? buildLeafSelectionStatsMap(items, separator, new Set(selectedValues)) : null),
    [items, options.leafsOnly, separator, selectedValuesKey],
  );

  const handleStartAddUnder = useCallback((parentValueStr: string) => {
    setAddingUnderParentValue(parentValueStr);
    setExpandedKeys((prev) => (prev.includes(parentValueStr) ? prev : [...prev, parentValueStr]));
  }, []);

  const openRowActions = useCallback(
    ({
      value: rowValue,
      path,
      canDelete,
      anchorEl,
    }: {
      value: string;
      path: TaxonomyPath;
      canDelete: boolean;
      anchorEl: HTMLElement;
    }) => {
      setRowActionsMenu((prev) => {
        if (prev?.value === rowValue) return null;
        const r = anchorEl.getBoundingClientRect();
        return {
          value: rowValue,
          path,
          canDelete,
          top: r.bottom + 4,
          left: Math.max(8, r.right - ROW_ACTIONS_MENU_MIN_WIDTH_PX),
        };
      });
    },
    [],
  );

  const handleCancelAdd = useCallback(() => {
    setAddingUnderParentValue(null);
  }, []);

  const handleCommitChildLabel = useCallback(
    (parentPath: TaxonomyPath, label: string) => {
      onAddLabel?.([...parentPath, label]);
      setAddingUnderParentValue(null);
    },
    [onAddLabel],
  );

  const { treeData, itemsByValue } = useMemo(() => {
    const itemsByValue = new Map<string, TaxonomyItem>();
    const selectedSet = new Set(selectedValues);
    const userLabels: UserLabelsTreeContext | null =
      onAddLabel && isEditable
        ? {
            pendingAddParentValueStr: addingUnderParentValue,
            isEditable,
            onStartAddUnder: handleStartAddUnder,
            onCancelAdd: handleCancelAdd,
            onCommitChildLabel: handleCommitChildLabel,
            onAddLabel,
            onDeleteLabel,
            openRowActions,
          }
        : null;
    const treeData = convert(
      items,
      { ...options, maxUsagesReached },
      selectedSet,
      selectedDescendantCountByPrefix,
      userLabels,
      itemsByValue,
      leafSelectionRowStats,
    );
    return { treeData, itemsByValue };
  }, [
    addingUnderParentValue,
    handleCancelAdd,
    handleCommitChildLabel,
    handleStartAddUnder,
    openRowActions,
    isEditable,
    itemsStructureHash,
    leafSelectionRowStats,
    maxUsagesReached,
    onAddLabel,
    onDeleteLabel,
    options.dropdownWidth,
    options.leafsOnly,
    options.maxUsages,
    options.maxWidth,
    options.minWidth,
    options.pathSeparator,
    options.placeholder,
    options.showFullPath,
    selectedDescendantCountByPrefix,
    selectedValuesKey,
  ]);
  const displayed = useMemo(() => {
    if (!options.leafsOnly) {
      const out: SelectionDisplayChip[] = [];
      const seen = new Set<string>();
      for (const path of selected) {
        const value = path.map((p) => p.value).join(separator);
        if (seen.has(value)) continue;
        seen.add(value);
        const node = itemsByValue.get(value);
        out.push({
          value,
          label: options.showFullPath ? path.map((p) => p.label).join(separator) : path[path.length - 1]!.label,
          isUserAdded: node ? isUserAddedTaxonomyItem(node) : false,
        });
      }
      return out;
    }

    const selectedSet = new Set(selectedValues);
    return collapsedSelectionDisplayChips(
      items,
      selectedSet,
      selected,
      { pathSeparator: options.pathSeparator, showFullPath: !!options.showFullPath },
      true,
      leafSelectionRowStats,
    );
  }, [
    items,
    itemsByValue,
    leafSelectionRowStats,
    options.leafsOnly,
    options.pathSeparator,
    options.showFullPath,
    selected,
    selectedValues,
    separator,
    itemsStructureHash,
  ]);

  const loadData = useCallback(
    async (path: TaxonomyPath) => {
      return onLoadData?.(path);
    },
    [onLoadData],
  );

  const handleSearch = useCallback((list: TaxonomyTreeNode[], expandedFromSearch: React.Key[] | null) => {
    setFilteredTreeData(list);
    if (expandedFromSearch?.length) setExpandedKeys(expandedFromSearch.map(String));
  }, []);

  const commitPaths = useCallback(
    (pathStrings: string[]) => {
      const statsForNormalize = options.leafsOnly
        ? buildLeafSelectionStatsMap(items, separator, new Set(pathStrings))
        : null;
      const normalized = normalizeTaxonomySelectionPaths(
        pathStrings,
        itemsByValue,
        separator,
        !!options.leafsOnly,
        statsForNormalize,
      );
      onChange(
        null,
        normalized.map((s) => s.split(separator)),
      );
    },
    [items, itemsByValue, onChange, options.leafsOnly, separator],
  );

  const handleToggleSelect = useCallback(
    (node: TaxonomyTreeNode) => {
      if (node.disableCheckbox) return;
      const item = itemsByValue.get(node.value);
      if (!item) return;
      const value = item.path.join(separator);
      const selectedSet = new Set(selectedValues);
      const maxN = parsePositiveMaxUsages(options.maxUsages);
      const atMax = maxN !== undefined && selectedValues.length >= maxN;

      if (options.leafsOnly) {
        const isLeaf = item.isLeaf !== false && !item.children?.length;
        if (!isLeaf) return;
        let next: string[];
        if (selectedSet.has(value)) {
          next = selectedValues.filter((v) => v !== value);
        } else {
          if (atMax) return;
          next = [...selectedValues, value];
        }
        commitPaths(next);
        return;
      }

      let next: string[];
      if (selectedSet.has(value)) {
        next = selectedValues.filter((v) => v !== value);
      } else {
        if (atMax) return;
        next = [...selectedValues, value];
      }
      commitPaths(next);
    },
    [commitPaths, itemsByValue, options.leafsOnly, options.maxUsages, selectedValues, separator],
  );

  const addLoadingKey = useCallback((k: string) => {
    setLoadingKeys((prev) => new Set(prev).add(k));
  }, []);

  const removeLoadingKey = useCallback((k: string) => {
    setLoadingKeys((prev) => {
      const next = new Set(prev);
      next.delete(k);
      return next;
    });
  }, []);

  const handleToggleExpand = useCallback(
    async (node: TaxonomyTreeNode) => {
      const k = String(node.key);
      const isExpanded = expandedKeys.includes(k);
      if (isExpanded) {
        setExpandedKeys((prev) => prev.filter((x) => x !== k));
        return;
      }
      const hasChildren = !!node.children?.length;
      const needsLoad = Boolean(onLoadData) && node.isLeaf === false && !hasChildren;
      if (needsLoad) {
        addLoadingKey(k);
        try {
          await loadData(node.value.split(separator));
        } finally {
          removeLoadingKey(k);
        }
      }
      setExpandedKeys((prev) => (prev.includes(k) ? prev : [...prev, k]));
    },
    [addLoadingKey, expandedKeys, loadData, onLoadData, removeLoadingKey],
  );

  /** Optional XML `dropdownWidth` number (px); default width comes from Radix trigger + Tailwind on the popover. */
  const dropdownMinWidthStyle: React.CSSProperties | undefined =
    typeof dropdownWidth === "number" && dropdownWidth > 0 ? { minWidth: dropdownWidth } : undefined;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) {
        setTimeout(() => {
          refInput.current?.focus();
        }, 200);
      } else {
        refInput.current?.resetValue();
        setAddingRootLabel(false);
        setRowActionsMenu(null);
      }
    },
    [refInput],
  );

  useEffect(() => {
    if (!rowActionsMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest("[data-taxonomy-row-menu]")) return;
      if (t.closest("[data-taxonomy-row-actions-trigger]")) return;
      setRowActionsMenu(null);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [rowActionsMenu]);

  useEffect(() => {
    if (!rowActionsMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRowActionsMenu(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [rowActionsMenu]);

  useEffect(() => {
    if (!rowActionsMenu) return;
    const onScroll = () => setRowActionsMenu(null);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [rowActionsMenu]);

  useEffect(() => {
    if (searchQueryTrimmed !== "") setAddingRootLabel(false);
  }, [searchQueryTrimmed]);

  /** Row action menus render in a body portal; Radix would otherwise treat them as "outside" and close the taxonomy popover. */
  const handleTaxonomyPopoverDismissInterruption = useCallback(
    (event: { preventDefault: () => void; target: EventTarget | null }) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-taxonomy-row-menu]")) {
        event.preventDefault();
      }
    },
    [],
  );

  const removeTag = useCallback(
    (pathValue: string) => {
      commitPaths(selectedValues.filter((v) => v !== pathValue));
    },
    [commitPaths, selectedValues],
  );

  const searchPreview = searchQueryTrimmed.length > 48 ? `${searchQueryTrimmed.slice(0, 48)}…` : searchQueryTrimmed;

  const treeListIsEmpty = filteredTreeData.length === 0;
  const isSearchActive = searchQueryTrimmed.length > 0;

  const treeBody = treeListIsEmpty ? (
    <div className="flex min-h-[min(12rem,35vh)] flex-1 flex-col items-center justify-center px-tight py-wide">
      <EmptyState
        size="small"
        variant="neutral"
        data-testid="taxonomy-tree-empty"
        icon={
          isSearchActive ? (
            <IconSearch className="text-neutral-content-subtle" aria-hidden />
          ) : (
            <IconEmptyFolder className="text-neutral-content-subtle" aria-hidden />
          )
        }
        title={isSearchActive ? "No matching results" : "No options available"}
        description={
          isSearchActive
            ? treeData.length === 0
              ? `Nothing matches "${searchPreview}". This taxonomy has no labels yet.`
              : `Nothing matches "${searchPreview}". Try a different search.`
            : onAddLabel && isEditable
              ? "There are no labels yet. Use + Add below to create one."
              : "There are no labels to choose from for this taxonomy."
        }
        className="max-w-sm"
      />
    </div>
  ) : (
    <TaxonomyTree
      nodes={filteredTreeData}
      expandedKeys={expandedKeys}
      loadingKeys={loadingKeys}
      selectedValues={selectedValues}
      onToggleExpand={handleToggleExpand}
      onToggleSelect={handleToggleSelect}
    />
  );

  return (
    <div className="htx-taxonomy" data-taxonomy-open={open ? "true" : "false"} data-testid="taxonomy-root">
      <Popover
        open={open}
        onOpenChange={handleOpenChange}
        align="start"
        sideOffset={4}
        onInteractOutside={handleTaxonomyPopoverDismissInterruption}
        onPointerDownOutside={handleTaxonomyPopoverDismissInterruption}
        className="htx-taxonomy-dropdown w-[var(--radix-popover-trigger-width,100%)] max-w-[min(100vw-2rem,40rem)] min-w-0 min-h-0 rounded-smaller border border-neutral-border bg-neutral-background p-0 flex flex-col overflow-hidden shadow-md"
        trigger={
          <div
            role="button"
            tabIndex={isEditable ? 0 : -1}
            aria-disabled={!isEditable || undefined}
            data-testid="taxonomy-trigger"
            className={`htx-taxonomy-trigger flex flex-nowrap items-center gap-tighter w-full pl-base pr-tight py-tight text-left rounded-smaller border border-neutral-border bg-neutral-background text-body-small text-neutral-content transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:border-neutral-border-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus [&_.htx-taxonomy-selection-item]:max-w-[min(100%,18rem)] ${open ? "border-neutral-border-bold bg-neutral-surface-active shadow-[inset_0_1px_2px_1px_rgb(0_0_0/0.06)]" : ""} ${!isEditable ? "cursor-not-allowed pointer-events-none bg-neutral-surface opacity-50 shadow-[inset_0_1px_2px_1px_rgb(0_0_0/0.06)]" : "cursor-pointer"}`}
            style={style}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <div className="min-w-0 flex-1 self-stretch">
              {displayed.length === 0 ? (
                <div className="flex items-center">
                  <span className="text-neutral-content-subtle">{options.placeholder || "Click to add..."}</span>
                </div>
              ) : displayed.length < SELECTION_VIRTUALIZE_THRESHOLD ? (
                <div className="flex max-h-[7.5rem] min-w-0 flex-1 flex-wrap items-center gap-tighter overflow-y-auto content-center">
                  {displayed.map((d) => (
                    <Badge
                      key={d.value}
                      variant="grape"
                      look="filled"
                      size="small"
                      shape="squared"
                      className="htx-taxonomy-selection-item max-w-full min-w-0 shrink"
                      maxWidth={220}
                      onClose={
                        isEditable
                          ? (e) => {
                              e.stopPropagation();
                              removeTag(d.value);
                            }
                          : undefined
                      }
                    >
                      <span className={`htx-taxonomy-selection-item-label${d.isUserAdded ? " italic" : ""}`}>
                        {d.label}
                      </span>
                    </Badge>
                  ))}
                </div>
              ) : (
                <div
                  className="max-h-[7.5rem] min-h-0 min-w-0 w-full overflow-hidden"
                  style={{ height: SELECTION_VIEWPORT_MAX_PX }}
                >
                  <AutoSizer>
                    {({ width, height: viewportH }) => {
                      const columnCount = Math.max(
                        1,
                        Math.min(
                          displayed.length,
                          Math.floor(
                            (width + SELECTION_GRID_GAP_PX) / (SELECTION_GRID_MIN_COL_WIDTH_PX + SELECTION_GRID_GAP_PX),
                          ),
                        ),
                      );
                      const rowCount = Math.ceil(displayed.length / columnCount);
                      const columnWidth = width / columnCount;
                      const gridData: SelectionGridData = {
                        displayed,
                        columnCount,
                        isEditable,
                        removeTag,
                      };
                      return (
                        <Grid
                          className="htx-taxonomy-selection-virtual-grid"
                          columnCount={columnCount}
                          columnWidth={columnWidth}
                          height={Math.min(SELECTION_VIEWPORT_MAX_PX, viewportH)}
                          rowCount={rowCount}
                          rowHeight={SELECTION_CHIP_ROW_HEIGHT_PX}
                          width={width}
                          itemData={gridData}
                          overscanColumnCount={1}
                          overscanRowCount={2}
                        >
                          {TaxonomySelectionBadgeCell}
                        </Grid>
                      );
                    }}
                  </AutoSizer>
                </div>
              )}
            </div>
            <IconChevronDown
              className={`pointer-events-none ml-auto size-4 shrink-0 text-neutral-content-subtle transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </div>
        }
      >
        <div
          className="htx-taxonomy-popover-body box-border flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col gap-tight overflow-hidden p-tight"
          style={dropdownMinWidthStyle}
        >
          <TaxonomySearch
            ref={refInput}
            treeData={treeData}
            onChange={handleSearch}
            onQueryChange={setSearchQueryTrimmed}
          />
          <div className="htx-taxonomy-tree-panel min-h-0 min-w-0 flex-1 overflow-hidden border-t border-neutral-border bg-neutral-background shadow-inner">
            {treeBody}
          </div>
          {onAddLabel && isEditable && searchQueryTrimmed === "" ? (
            <div className="shrink-0 border-t border-neutral-border pt-tight">
              {addingRootLabel ? (
                <TaxonomyInlineAddLabel
                  onCommit={(label) => {
                    onAddLabel([label]);
                    setAddingRootLabel(false);
                  }}
                  onCancel={() => setAddingRootLabel(false)}
                />
              ) : (
                <Button
                  type="button"
                  size="small"
                  variant="neutral"
                  look="string"
                  aria-label="Add new label"
                  onClick={() => setAddingRootLabel(true)}
                >
                  + Add
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </Popover>
      {rowActionsMenu && onAddLabel && isEditable
        ? (createPortal(
            <div
              role="menu"
              data-taxonomy-row-menu="true"
              className="min-w-[10rem] rounded-small border border-neutral-border bg-neutral-background py-tighter shadow-md"
              style={{
                position: "fixed",
                top: rowActionsMenu.top,
                left: rowActionsMenu.left,
                minWidth: ROW_ACTIONS_MENU_MIN_WIDTH_PX,
                zIndex: 200_000,
              }}
            >
              <Button
                type="button"
                role="menuitem"
                variant="neutral"
                look="string"
                size="small"
                align="left"
                className="block h-auto w-full min-h-0 justify-start rounded-none border-0 px-tight py-tighter text-left text-body-small font-normal text-neutral-content shadow-none hover:bg-neutral-surface-hover [&>span]:w-full [&>span]:justify-start [&>span]:px-0"
                onClick={() => {
                  handleStartAddUnder(rowActionsMenu.value);
                  setRowActionsMenu(null);
                }}
              >
                Add inside
              </Button>
              {rowActionsMenu.canDelete && onDeleteLabel ? (
                <Button
                  type="button"
                  role="menuitem"
                  variant="neutral"
                  look="string"
                  size="small"
                  align="left"
                  className="block h-auto w-full min-h-0 justify-start rounded-none border-0 px-tight py-tighter text-left text-body-small font-normal text-negative-content shadow-none hover:bg-neutral-surface-hover [&>span]:w-full [&>span]:justify-start [&>span]:px-0"
                  onClick={() => {
                    onDeleteLabel(rowActionsMenu.path);
                    setRowActionsMenu(null);
                  }}
                >
                  Delete
                </Button>
              ) : null}
            </div>,
            document.body,
          ) as React.ReactNode)
        : null}
    </div>
  );
};

export { TaxonomyEcho466 };
