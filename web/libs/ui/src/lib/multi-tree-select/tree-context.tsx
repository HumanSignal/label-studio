import {
  type MutableRefObject,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { debounce } from "@humansignal/core/lib/utils/debounce";

export const RootSymbol = Symbol("$$root");
export const IndexedSymbol = Symbol("$$indexed");
const OriginalIdSymbol = Symbol("$$originalId");
export const IdDelimiter = "-";

export interface IndexedNode {
  [IndexedSymbol]?: boolean;
}

export interface TreeNodeProps extends IndexedNode {
  id: string;
  label: string;
  searchBy: string[];
  children: TreeNodeProps[];
  parentChecked?: boolean;
  disabled?: boolean;
}

export interface Action<T = unknown, A = string> {
  id: string | typeof RootSymbol;
  action: A;
  value: T;
}

export type TreeAction =
  | Action<boolean, "select">
  | Action<boolean, "expand">
  | Action<{ query: string; results: TreeSearchMatch }, "search">
  | Action<boolean, "toggleselect">
  | Action<boolean, "refresh">; // Used to refresh UI without triggering onChange

interface TreeContextProps {
  data: MutableRefObject<TreeNodeProps[]>;
  selected: MutableRefObject<string[]>;
  expanded: MutableRefObject<string[]>;
  allNodeIds: MutableRefObject<string[]>;
  notify: (path: string | Symbol, change: TreeAction) => void;
  subscribe: (path: string | Symbol, callback: Function) => () => void;
  search: (query: string) => void;
  searchIndexed: boolean;
  searchQuery: MutableRefObject<string>;
  searchResults: MutableRefObject<TreeSearchMatch>;
  getLabel: (id: string) => string;
  disableAllOption?: boolean;
  customPlaceholder?: string;
  /** When true: selecting a parent does not select descendants; selecting all children does not select the parent. */
  preventAutoChildSelection?: boolean;
  isRadio?: boolean;
  // Reactive search state for components that need to re-render on search
  isSearching: boolean;
  searchResultCount: number;
}

const TreeContext = createContext<TreeContextProps>({} as TreeContextProps);

export const useTreeContext = () => useContext(TreeContext);

export interface MultiTreeSelectSchema {
  id: string;
  label: string;
  searchBy?: string[];
  children?: string | Record<string, MultiTreeSelectSchema>;
}

export interface MultiTreeSelectProviderProps {
  children?: ReactNode;
  dataRef: MutableRefObject<TreeNodeProps[]>;
  searchIndexRef: MutableRefObject<TreeSearchIndex>;
  searchIndexed: boolean;
  selected?: string[];
  expanded?: string[];
  schema?: MultiTreeSelectSchema;
  disableAllOption?: boolean;
  customPlaceholder?: string;
  /** When true: selecting a parent does not select descendants; selecting all children does not select the parent. */
  preventAutoChildSelection?: boolean;
  isRadio?: boolean;
  hiddenNodeFilter?: (node: any) => boolean;
  onChange?: (data: TreeNodeProps[], selected: string[]) => void;
  onSearch?: (query: string, results: TreeSearchMatch) => void;
  onExpand?: (id: string | Symbol, expanded: string[]) => void;
  /** Optional ref to the dropdown (e.g. from Dropdown.Trigger) to close on single selection when isRadio */
  dropdownRef?: React.RefObject<{ close?: (disableAnimation?: boolean) => void } | null>;
}

export type MultiTreeSelectProps = Omit<
  MultiTreeSelectProviderProps,
  "children" | "data" | "dataRef" | "searchIndexRef" | "searchIndexed"
> & {
  data: unknown[];
  children?: ReactNode;
  placeholder?: string;
  searchPlaceholder?: string;
  allLabel?: string;
  RootLevelIcon?: ReactNode;
  disableAllOption?: boolean;
  customPlaceholder?: string;
  /** When true: selecting a parent does not select descendants; selecting all children does not select the parent. */
  preventAutoChildSelection?: boolean;
  isRadio?: boolean;
  hiddenNodeFilter?: (node: any) => boolean;
};

/**
 * Get all children ids of a node as a flat array of strings
 */
export const getChildrenIds = (node: TreeNodeProps): string[] => {
  let childrenIds: string[] = [];
  if (node.children.length > 0) {
    childrenIds = node.children.map((child) => child.id);
    node.children.forEach((child) => {
      childrenIds = childrenIds.concat(getChildrenIds(child));
    });
  }
  return childrenIds;
};

export class TreeSearchMatch {
  private matches: Map<string, Set<string>> = new Map();

  set(id: string) {
    if (!this.matches.has(id)) {
      this.matches.set(id, new Set());
    }
  }

  add(id: string, TreeSearch: string) {
    this.matches.get(id)!.add(TreeSearch);
  }

  get(id: string) {
    return this.matches.get(id);
  }

  some(fn: (id: string) => void) {
    return Array.from(this.matches.keys()).some(fn);
  }

  size() {
    return this.matches.size;
  }
}

export class TreeSearchIndex {
  private index: Map<string, Set<string>> = new Map();

  get size() {
    return this.index.size;
  }

  add(_text: string, id: string) {
    const text = _text.toLowerCase();

    if (!this.index.has(text)) {
      this.index.set(text, new Set());
    }
    this.index.get(text)!.add(id);
  }

  search(_query: string) {
    const query = _query.toLowerCase();
    const results = new TreeSearchMatch();

    const matchingKeys = Array.from(this.index.keys()).filter((key) => key.includes(query));

    matchingKeys.forEach((key) => {
      for (const id of this.index.get(key)!) {
        results.set(id);
        results.add(id, key);
      }
    });
    return results;
  }
}

/** Shallow set-equality for selection arrays — order-independent. */
const sameSelection = (a: readonly string[], b: readonly string[]): boolean => {
  if (a.length !== b.length) return false;
  const aSet = new Set(a);
  for (const id of b) {
    if (!aSet.has(id)) return false;
  }
  return true;
};

export const MultiTreeSelectProvider = ({
  children,
  dataRef,
  searchIndexRef,
  searchIndexed,
  selected: initialSelected,
  expanded: initialExpanded,
  disableAllOption = false,
  customPlaceholder,
  preventAutoChildSelection = false,
  isRadio = false,
  onChange,
  onSearch,
  onExpand,
  dropdownRef,
}: Omit<MultiTreeSelectProviderProps, "hiddenNodeFilter">) => {
  const searchQueryRef = useRef("");
  const searchResultsRef = useRef<TreeSearchMatch>(new TreeSearchMatch());
  const selectedRef = useRef(initialSelected ?? []);
  const expandedRef = useRef<Array<string>>(initialExpanded ?? []);
  const expandedCacheRef = useRef<Array<string> | null>(null);
  const subscribersRef = useRef<Map<string | Symbol, Set<Function>>>(new Map());
  const allNodeIdsRef = useRef<Array<string>>([]);
  // Most recent selection we emitted to the parent via ``onChange``.  Used to
  // break the round-trip where a user-driven deselect ([]) propagates to the
  // parent state, the parent re-renders with ``selected={[]}``, and the sync
  // effect would otherwise re-expand it to "all" — undoing the user's click.
  // ``null`` means we have not emitted yet (so the parent's value is purely
  // external and the empty→all expansion should run on first sync).
  const lastEmittedRef = useRef<string[] | null>(null);

  // Reactive search state - triggers re-renders for components that need it
  const [isSearching, setIsSearching] = useState(false);
  const [searchResultCount, setSearchResultCount] = useState(0);

  const subscribe = (path: string | Symbol, callback: Function) => {
    if (!subscribersRef.current.has(path)) {
      subscribersRef.current.set(path, new Set());
    }
    subscribersRef.current.get(path)!.add(callback);

    return () => {
      subscribersRef.current.get(path)!.delete(callback);
    };
  };

  const notify = (path: string | Symbol, change: TreeAction) => {
    if (subscribersRef.current.has(path)) {
      for (const cb of subscribersRef.current.get(path)!) {
        cb(change);
      }
    }
  };

  // Sync selectedRef when initialSelected changes
  useEffect(() => {
    if (initialSelected == null) return;

    // Echo guard: if the parent is just re-rendering with the same selection we
    // last emitted (typical "controlled input" round-trip — user clicks → onChange
    // → parent setState → re-render), skip the sync entirely.  Without this the
    // empty→all branch below would undo a user-driven root-deselect on every
    // round-trip, making "deselect all" impossible for consumers that treat
    // ``selected=[]`` as the "All" semantic (no ``customPlaceholder``, no ``isRadio``).
    if (lastEmittedRef.current !== null && sameSelection(initialSelected, lastEmittedRef.current)) {
      return;
    }
    // Parent gave us a value that is NOT an echo of our own emit — clear the
    // marker so subsequent user-driven changes restart the round-trip dance
    // from a clean slate.
    lastEmittedRef.current = null;

    if (initialSelected.length > 0) {
      selectedRef.current = [...initialSelected];
    } else if (!customPlaceholder && !isRadio && !disableAllOption && allNodeIdsRef.current.length > 0) {
      // Empty selection without a custom placeholder means "All" — restore all node IDs
      // so the root "All Workspaces" checkbox renders as checked.
      // If the tree hasn't been indexed yet (allNodeIdsRef empty), leave [] and let
      // the initialization effect (below) populate it once indexing completes.
      // ``disableAllOption`` consumers (e.g. CopyToOtherProjects) intentionally hide
      // the root checkbox and want ``[]`` to mean "nothing selected yet" — never
      // expand to "all" for them, otherwise the internal state and the parent
      // state drift apart on every controlled-input round-trip.
      selectedRef.current = [...allNodeIdsRef.current];
    } else {
      // Custom placeholder, radio mode, or disableAllOption: empty means nothing selected.
      selectedRef.current = [];
    }

    // Notify all subscribers (TreeSelected, TreeNodes) to update their UI
    notify(RootSymbol, { id: RootSymbol, action: "refresh", value: true });
  }, [initialSelected, customPlaceholder, isRadio]);

  // Sync expandedRef when initialExpanded changes
  useEffect(() => {
    if (initialExpanded && initialExpanded.length > 0) {
      expandedRef.current = initialExpanded;
    }
  }, [initialExpanded]);

  const search = (query: string) => {
    const previousQuery = searchQueryRef.current;

    searchQueryRef.current = query;
    searchResultsRef.current = searchIndexRef.current.search(query);

    // Update reactive search state
    const trimmedQuery = query.trim();
    setIsSearching(trimmedQuery.length > 2);
    setSearchResultCount(searchResultsRef.current.size());

    // Capture the pre-search expanded state
    if (!expandedCacheRef.current && trimmedQuery.length > 2) {
      expandedCacheRef.current = [...expandedRef.current];
    }

    // Restore the pre-search expanded state
    if (previousQuery.trim().length !== 0 && trimmedQuery.length === 0) {
      expandedRef.current = [...(expandedCacheRef.current ?? [])];
      expandedCacheRef.current = null;
    }

    notify(RootSymbol, { id: "", action: "search", value: { query, results: searchResultsRef.current } });
  };

  const getLabel = (id: string) => {
    const nestedId = id.split(IdDelimiter);
    let currentId = nestedId[0];
    let node = dataRef.current.find((node) => node.id === currentId);
    let label = node ? node.label : "";
    for (let i = 1; i < nestedId.length; i++) {
      if (!node) break;
      currentId = `${currentId}${IdDelimiter}${nestedId[i]}`;
      node = node.children.find((child) => child.id === currentId);
      label = node ? node.label : "";
    }
    return label;
  };

  useEffect(() => {
    return subscribe(
      RootSymbol,
      debounce(
        (change: TreeAction) => {
          if (onChange && change.action === "select") {
            // Record what we're emitting BEFORE invoking the parent's onChange so
            // the sync effect can recognise the parent's echo on the next render
            // and short-circuit instead of resetting our internal state.
            lastEmittedRef.current = [...selectedRef.current];
            onChange(dataRef.current, selectedRef.current);
            if (isRadio && dropdownRef?.current?.close) dropdownRef.current.close();
          }
          if (onSearch && change.action === "search") onSearch(change.value.query, change.value.results);
          if (onExpand && change.action === "expand") onExpand(change.id, expandedRef.current);
        },
        16,
        false,
      ),
    );
  }, [onChange, onSearch, onExpand, isRadio, dropdownRef]);

  useEffect(() => {
    if (searchIndexed && !allNodeIdsRef.current.length) {
      allNodeIdsRef.current = getChildrenIds({
        id: RootSymbol.toString(),
        label: "All",
        searchBy: ["All"],
        children: dataRef.current,
      });

      if (!customPlaceholder && !isRadio && !disableAllOption && !selectedRef.current.length) {
        selectedRef.current = [...allNodeIdsRef.current];
      }
      // If selection already equals all nodes (e.g. parent passed full list for "All Workspaces"),
      // notify so TreeSelected can show the "All" label instead of individual names
      if (allNodeIdsRef.current.length > 0 && selectedRef.current.length === allNodeIdsRef.current.length) {
        notify(RootSymbol, { id: RootSymbol, action: "refresh", value: true });
      }
    }
  }, [searchIndexed, customPlaceholder, isRadio, disableAllOption]);

  return (
    <TreeContext.Provider
      value={{
        data: dataRef,
        allNodeIds: allNodeIdsRef,
        selected: selectedRef,
        expanded: expandedRef,
        notify,
        subscribe,
        search,
        searchIndexed,
        searchResults: searchResultsRef,
        searchQuery: searchQueryRef,
        getLabel,
        disableAllOption,
        customPlaceholder,
        preventAutoChildSelection,
        isRadio,
        isSearching,
        searchResultCount,
      }}
    >
      {children}
    </TreeContext.Provider>
  );
};

export const useMultiTreeSelectProvider = ({
  data,
  selected,
  expanded,
  onChange,
  onExpand,
  onSearch,
  schema: rootSchema,
  disableAllOption,
  customPlaceholder,
  preventAutoChildSelection,
  isRadio,
  hiddenNodeFilter,
  dropdownRef,
}: MultiTreeSelectProps) => {
  const [searchIndexed, setSearchIndexed] = useState(false);
  const searchIndexRef = useRef<TreeSearchIndex>(new TreeSearchIndex());
  const dataRef = useRef<TreeNodeProps[]>([]);

  /**
   * Build a search index for the tree data
   */
  const buildSearchIndex = useCallback(
    (data: TreeNodeProps[], parentId = "", _schema = rootSchema, isRootCall = true) => {
      // Skip data that has already been indexed
      if ((data as IndexedNode)[IndexedSymbol]) return data;

      // Filter out hidden nodes if hiddenNodeFilter is provided
      // ONLY apply filter at root level to hide entire workspace trees, not individual children
      let filteredData = data;
      if (hiddenNodeFilter && isRootCall) {
        filteredData = data.filter((node) => !hiddenNodeFilter(node));
      }

      // On root call, clear the search index to ensure we rebuild from scratch
      // This handles the case where data objects were previously indexed by another
      // component instance but this component has a fresh search index
      if (isRootCall) {
        searchIndexRef.current = new TreeSearchIndex();
      }

      for (let i = 0; i < filteredData.length; i++) {
        const node = filteredData[i];

        // Clear existing index marker so node gets re-indexed with current search index
        // This is necessary because data objects may be shared across component instances
        delete node[IndexedSymbol];

        // Allow a schema to be passed to the provider
        // to define how to traverse the tree data
        // and what properties to use for id, label, and children
        let schema = _schema;
        if (schema) {
          const rawRecord = node as unknown as Record<string | symbol, any>;
          if (rawRecord[OriginalIdSymbol] === undefined) {
            rawRecord[OriginalIdSymbol] = rawRecord[schema.id];
          }
          node.id = rawRecord[OriginalIdSymbol];
          node.label = (node as unknown as Record<string, TreeNodeProps["label"]>)[schema.label];
          node.searchBy = schema.searchBy?.map(
            (k: string) => (node as unknown as Record<string, TreeNodeProps["label"]>)[k],
          ) || [node.label];
          let children: TreeNodeProps[] = [];
          if (schema.children && typeof schema.children === "string") {
            children = (node as unknown as Record<string, TreeNodeProps["children"]>)[schema.children];
            // Reset the schema to undefined so the children schema is used if present, defaulting back to the root level schema
            schema = undefined;
          } else if (schema.children && typeof schema.children === "object") {
            const schemaKeys = Object.keys(schema.children);
            while (schemaKeys.length > 0) {
              const key = schemaKeys.shift();
              if (!key) break;
              schema = (schema.children as Record<string, MultiTreeSelectSchema>)[key];
              children = (node as unknown as Record<string, TreeNodeProps["children"]>)[key];
            }
          } else {
            // If no schema is provided, assume the data is already in the correct format
            schema = undefined;
          }

          if (children) {
            node.children = children;
          }
        }

        const fullId = parentId ? `${parentId}${IdDelimiter}${node.id}` : node.id.toString();
        node.id = fullId;

        // Mark the node as indexed so it is not indexed again
        node[IndexedSymbol] = true;

        // Add the node to the search index by the searchBy properties which fallback to using the label
        node.searchBy.forEach((searchBy) => searchIndexRef.current.add(searchBy, node.id));
        node.children = node.children || [];

        // Recursively build the search index for children
        if (node.children.length > 0) {
          delete (node.children as IndexedNode)[IndexedSymbol];
          node.children = buildSearchIndex(node.children, fullId, schema, false);
        }
      }

      // Mark the data as indexed
      Object.assign(filteredData, { [IndexedSymbol]: true });

      return filteredData;
    },
    [rootSchema, hiddenNodeFilter],
  );

  useEffect(() => {
    // Data index is still valid, no need to rebuild
    if ((data as IndexedNode)[IndexedSymbol]) return;

    dataRef.current = buildSearchIndex(data as unknown[] as TreeNodeProps[]);
    setSearchIndexed(true);
  }, [data]);

  return {
    dataRef,
    searchIndexRef,
    searchIndexed,
    // Pass provider props directly instead of creating a wrapper component
    providerProps: {
      dataRef,
      searchIndexRef,
      searchIndexed,
      selected,
      expanded,
      onChange,
      onSearch,
      onExpand,
      disableAllOption,
      customPlaceholder,
      preventAutoChildSelection,
      isRadio,
      dropdownRef,
    },
  };
};
