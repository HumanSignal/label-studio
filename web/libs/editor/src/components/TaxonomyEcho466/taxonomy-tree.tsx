import type React from "react";
import { useCallback, useMemo, useRef } from "react";

import { TreeSelect, type TreeSelectCheckState, type TreeSelectNode } from "@humansignal/ui";

export type TaxonomyTreeNode = {
  title: React.ReactNode;
  value: string;
  key: string;
  isLeaf?: boolean;
  children?: TaxonomyTreeNode[];
  disableCheckbox?: boolean;
  checkState?: TreeSelectCheckState;
  rowSuffix?: React.ReactNode;
  /** When false, tree row does not use a label button (e.g. inline add-label input). */
  labelIsInteractive?: boolean;
  /** Label row toggles expand instead of selection (leafs-only non-leaf rows). */
  expandLabelTogglesExpand?: boolean;
};

export type TaxonomyTreeProps = {
  nodes: TaxonomyTreeNode[];
  expandedKeys: string[];
  loadingKeys: ReadonlySet<string>;
  selectedValues: string[];
  onToggleExpand: (node: TaxonomyTreeNode) => void | Promise<void>;
  onToggleSelect: (node: TaxonomyTreeNode) => void;
};

const toTreeSelectNode = (node: TaxonomyTreeNode): TreeSelectNode => ({
  label: node.title,
  value: node.value,
  key: node.key,
  isLeaf: node.isLeaf,
  disabled: node.disableCheckbox,
  checkState: node.checkState,
  rowSuffix: node.rowSuffix,
  labelIsInteractive: node.labelIsInteractive,
  expandLabelTogglesExpand: node.expandLabelTogglesExpand,
  children: node.children?.map(toTreeSelectNode),
});

export function TaxonomyTree({
  nodes,
  expandedKeys,
  loadingKeys,
  selectedValues,
  onToggleExpand,
  onToggleSelect,
}: TaxonomyTreeProps) {
  const { nodeByKey, mapped } = useMemo(() => {
    const m = new Map<string, TaxonomyTreeNode>();
    const indexNodes = (list: TaxonomyTreeNode[]) => {
      list.forEach((node) => {
        m.set(String(node.key), node);
        if (node.children?.length) indexNodes(node.children);
      });
    };
    indexNodes(nodes);
    return { nodeByKey: m, mapped: nodes.map(toTreeSelectNode) };
  }, [nodes]);

  const nodeByKeyRef = useRef(nodeByKey);
  nodeByKeyRef.current = nodeByKey;
  const onToggleExpandRef = useRef(onToggleExpand);
  const onToggleSelectRef = useRef(onToggleSelect);
  onToggleExpandRef.current = onToggleExpand;
  onToggleSelectRef.current = onToggleSelect;

  /** Stable identity so TreeSelect rows can memoize across selection-only updates. */
  const handleToggleExpand = useCallback(async (node: TreeSelectNode) => {
    const original = nodeByKeyRef.current.get(String(node.key));
    if (original) return onToggleExpandRef.current(original);
  }, []);

  const handleToggleSelect = useCallback((node: TreeSelectNode) => {
    const original = nodeByKeyRef.current.get(String(node.key));
    if (original) onToggleSelectRef.current(original);
  }, []);

  return (
    <TreeSelect
      nodes={mapped}
      expandedKeys={expandedKeys}
      loadingKeys={loadingKeys}
      selectedValues={selectedValues}
      onToggleExpand={handleToggleExpand}
      onToggleSelect={handleToggleSelect}
    />
  );
}
