import React, {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { IconSearch } from "@humansignal/icons";

import type { TaxonomyTreeNode } from "./taxonomy-tree";
import { debounce } from "@humansignal/core/lib/utils/debounce";

type TaxonomySearchProps = {
  treeData: TaxonomyTreeNode[];
  onChange: (list: TaxonomyTreeNode[], expandedKeys: React.Key[] | null) => void;
  /** Fired when the trimmed query changes (including reset to ""). Used to hide root “Add” while filtering. */
  onQueryChange?: (trimmedQuery: string) => void;
};

export type TaxonomySearchRef = {
  resetValue: () => void;
  focus: () => void;
};

const TaxonomySearch = React.forwardRef<TaxonomySearchRef, TaxonomySearchProps>(
  ({ treeData, onChange, onQueryChange }, ref) => {
    const inputRef = useRef<HTMLInputElement>();
    const [inputValue, setInputValue] = useState("");
    const inputValueRef = useRef(inputValue);

    inputValueRef.current = inputValue;

    // When the treeNode has additional formatting because of `hint` or `color` props,
    // the `treeNode.title` is not a string but a react component,
    // so we have to look for the title in children (1 or 2 levels deep)
    const getTitle = useCallback((treeNodeTitle: any): string => {
      if (typeof treeNodeTitle === "string") return treeNodeTitle;

      if (typeof treeNodeTitle.props.children === "object") return getTitle(treeNodeTitle.props.children);

      return treeNodeTitle.props.children;
    }, []);

    // To filter the treeData items that match with the searchValue
    const filterTreeNode = useCallback(
      (searchValue: string, treeNode: TaxonomyTreeNode) => {
        const lowerSearchValue = String(searchValue).toLowerCase();
        const lowerResultValue = getTitle(treeNode.title);

        if (!lowerSearchValue) {
          return false;
        }

        return String(lowerResultValue).toLowerCase().includes(lowerSearchValue);
      },
      [getTitle],
    );

    // It's running recursively through the treeData and its children filtering the content that match with the search value
    const filterTreeData = useCallback(
      (treeData: TaxonomyTreeNode[], searchValue: string) => {
        const _expandedKeys: React.Key[] = [];

        if (!searchValue) {
          return {
            filteredDataTree: treeData,
            expandedKeys: _expandedKeys,
          };
        }

        const dig = (list: TaxonomyTreeNode[], keepAll = false) => {
          return list.reduce<TaxonomyTreeNode[]>((total, dataNode) => {
            const children = dataNode.children;

            const match = keepAll || filterTreeNode(searchValue, dataNode);
            const childList = children?.length ? dig(children, match) : undefined;

            if (match || childList?.length) {
              if (!keepAll && dataNode.children?.length) _expandedKeys.push(dataNode.key);

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
      },
      [filterTreeNode],
    );

    useImperativeHandle(ref, (): TaxonomySearchRef => {
      return {
        resetValue() {
          setInputValue("");
          onQueryChange?.("");
          onChange(treeData, []);
        },
        focus() {
          return inputRef.current?.focus();
        },
      };
    }, [onChange, onQueryChange, treeData]);

    // useLayoutEffect: sync filtered tree before paint so the popover never renders an empty tree on first
    // open (integration tests and users would otherwise see a flash / miss row nodes until a frame later).
    useLayoutEffect(() => {
      const query = inputValueRef.current;
      const _filteredData = filterTreeData(treeData, query);

      onChange(_filteredData.filteredDataTree, query.trim() ? _filteredData.expandedKeys : null);
    }, [treeData, onChange, filterTreeData]);

    const handleSearch = useCallback(
      debounce(async (e: ChangeEvent<HTMLInputElement>) => {
        const _filteredData = filterTreeData(treeData, e.target.value);

        onChange(_filteredData.filteredDataTree, _filteredData.expandedKeys);
      }, 300),
      [treeData, filterTreeData, onChange],
    );

    return (
      <div className="htx-taxonomy-search w-full max-w-full min-w-0 shrink-0" data-testid="taxonomy-search-wrap">
        <div className="box-border flex h-8 min-h-8 w-full min-w-0 flex-row items-center gap-2 rounded-smaller border border-neutral-border bg-neutral-background px-2 shadow-inner transition-colors hover:border-neutral-border-bold focus-within:border-neutral-border-bold focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-focus">
          <span
            className="pointer-events-none inline-flex size-6 shrink-0 items-center justify-center text-neutral-content-subtlest [&_svg]:block [&_svg]:size-4 [&_svg]:shrink-0"
            aria-hidden
          >
            <IconSearch aria-hidden />
          </span>
          <input
            ref={inputRef as any}
            value={inputValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const v = e.target.value;
              setInputValue(v);
              onQueryChange?.(v.trim());
              handleSearch(e);
            }}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              // to prevent selected items from being deleted
              if (e.key === "Backspace" || e.key === "Delete") e.stopPropagation();
            }}
            placeholder="Search"
            data-testid="taxonomy-search"
            name="taxonomy-search-input"
            type="text"
            role="searchbox"
            autoComplete="off"
            aria-label="Search taxonomy"
            className="h-8 min-w-0 flex-1 border-0 bg-transparent p-0 text-body-small leading-tight text-neutral-content outline-none ring-0 placeholder:text-neutral-content-subtle focus:ring-0"
          />
        </div>
      </div>
    );
  },
);

export { TaxonomySearch };
