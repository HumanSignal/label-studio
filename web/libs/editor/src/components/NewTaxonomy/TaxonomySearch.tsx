import React, { ChangeEvent, KeyboardEvent, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import './TaxonomySearch.styl';
import { Block } from '../../utils/bem';
import { AntTaxonomyItem } from './NewTaxonomy';
import { debounce } from 'lodash';

type TaxonomySearchProps = {
  treeData: AntTaxonomyItem[],
  onChange: (list: AntTaxonomyItem[], expandedKeys: React.Key[] | null) => void,
}

export type TaxonomySearchRef = {
  resetValue: () => void,
  focus: () => void,
}

const TaxonomySearch = React.forwardRef<TaxonomySearchRef, TaxonomySearchProps>(({
  treeData,
  onChange,
}, ref) => {
  useImperativeHandle(ref, (): TaxonomySearchRef => {
    return {
      resetValue() {
        setInputValue('');
        onChange(treeData, []);
      },
      focus() {
        return inputRef.current?.focus();
      },
    };
  });

  const inputRef = useRef<HTMLInputElement>();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const _filteredData = filterTreeData(treeData, inputValue);

    onChange(_filteredData.filteredDataTree, null);
  }, [treeData]);

  // When the treeNode has additional formatting because of `hint` or `color` props,
  // the `treeNode.title` is not a string but a react component,
  // so we have to look for the title in children (1 or 2 levels deep)
  const getTitle = useCallback((treeNodeTitle: any): string => {
    if (typeof treeNodeTitle === 'string') return treeNodeTitle;

    if (typeof treeNodeTitle.props.children === 'object')
      return getTitle(treeNodeTitle.props.children);

    return treeNodeTitle.props.children;
  }, []);

  // To filter the treeData items that match with the searchValue
  const filterTreeNode = useCallback((searchValue: string, treeNode: AntTaxonomyItem) => {
    const lowerSearchValue = String(searchValue).toLowerCase();
    const lowerResultValue = getTitle(treeNode.title);

    if (!lowerSearchValue) {
      return false;
    }

    return String(lowerResultValue).toLowerCase().includes(lowerSearchValue);
  }, []);

  // It's running recursively through treeData and its children filtering the content that match with the search value
  const filterTreeData = useCallback((treeData: AntTaxonomyItem[], searchValue: string) => {
    const _expandedKeys: React.Key[] = [];

    if (!searchValue) {
      return {
        filteredDataTree: treeData,
        expandedKeys: _expandedKeys,
      };
    }

    const dig = (list: AntTaxonomyItem[], keepAll = false) => {
      return list.reduce<AntTaxonomyItem[]>((total, dataNode) => {
        const children = dataNode['children'];

        const match = keepAll || filterTreeNode(searchValue, dataNode);
        const childList = children?.length ? dig(children, match) : undefined;

        if (match || childList?.length) {
          if (!keepAll && dataNode['children']?.length)
            _expandedKeys.push(dataNode.key);

          total.push({
            ...dataNode,
            isLeaf: !childList?.length,
            children: childList,
          });
        }

        return total;
      }, []);
    };

    return {
      filteredDataTree: dig(treeData),
      expandedKeys: _expandedKeys,
    };
  }, []);

  const handleSearch = useCallback(debounce(async (e: ChangeEvent<HTMLInputElement>) => {
    const _filteredData = filterTreeData(treeData, e.target.value);

    onChange(_filteredData.filteredDataTree, _filteredData.expandedKeys);
  }, 300), [treeData]);

  return (
    <Block
      ref={inputRef}
      value={inputValue}
      tag={'input'}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        handleSearch(e);
      }}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        // to prevent selected items from being deleted
        if (e.key === 'Backspace' || e.key === 'Delete') e.stopPropagation();
      }}
      placeholder={'Search'}
      data-testid={'taxonomy-search'}
      name={'taxonomy-search-input'}
    />
  );
});

export { TaxonomySearch };
