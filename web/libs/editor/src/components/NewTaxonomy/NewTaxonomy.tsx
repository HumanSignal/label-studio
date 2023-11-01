import { TreeSelect } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';

type TaxonomyPath = string[];
type onAddLabelCallback = (path: string[]) => any;
type onDeleteLabelCallback = (path: string[]) => any;

type TaxonomyItem = {
  label: string,
  path: TaxonomyPath,
  depth: number,
  isLeaf?: boolean, // only in new async taxonomy
  children?: TaxonomyItem[],
  origin?: 'config' | 'user' | 'session',
  hint?: string,
};

type AntTaxonomyItem = {
  title: string,
  value: string,
  key: string,
  isLeaf?: boolean,
  children?: AntTaxonomyItem[],
};

type TaxonomyOptions = {
  leafsOnly?: boolean,
  showFullPath?: boolean,
  pathSeparator: string,
  maxUsages?: number,
  maxWidth?: number,
  minWidth?: number,
  placeholder?: string,
};

type TaxonomyProps = {
  items: TaxonomyItem[],
  selected: TaxonomyPath[],
  onChange: (node: any, selected: TaxonomyPath[]) => any,
  onLoadData?: (item: TaxonomyPath) => any,
  onAddLabel?: onAddLabelCallback,
  onDeleteLabel?: onDeleteLabelCallback,
  options: TaxonomyOptions,
  isEditable?: boolean,
};

const convert = (items: TaxonomyItem[], options: TaxonomyOptions): AntTaxonomyItem[] => {
  return items.map(item => ({
    title: item.label,
    value: item.path.join(options.pathSeparator),
    key: item.path.join(options.pathSeparator),
    isLeaf: item.isLeaf !== false && !item.children,
    disableCheckbox: options.leafsOnly && (item.isLeaf === false || !!item.children),
    children: item.children ? convert(item.children, options) : undefined,
  }));
};

const NewTaxonomy = ({
  items,
  selected,
  onChange,
  onLoadData,
  // @todo implement user labels
  // onAddLabel,
  // onDeleteLabel,
  options,
  // @todo implement readonly mode
  // isEditable = true,
}: TaxonomyProps) => {
  const [treeData, setTreeData] = useState<AntTaxonomyItem[]>([]);
  const separator = options.pathSeparator;
  const style = { minWidth: options.minWidth ?? 200, maxWidth: options.maxWidth };

  useEffect(() => {
    setTreeData(convert(items, options));
  }, [items]);

  const loadData = useCallback(async (node: any) => {
    return onLoadData?.(node.value.split(separator));
  }, []);

  return (
    <TreeSelect
      treeData={treeData}
      value={selected.map(path => path.join(separator))}
      onChange={items => onChange(null, items.map(item => item.value.split(separator)))}
      loadData={loadData}
      treeCheckable
      treeCheckStrictly
      showCheckedStrategy={TreeSelect.SHOW_ALL}
      treeExpandAction="click"
      placeholder={options.placeholder || 'Click to add...'}
      style={style}
      className="htx-taxonomy"
    />
  );
};

export { NewTaxonomy };
