import React, {
  FormEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { Dropdown, Menu } from 'antd';

import { LsChevron } from '../../assets/icons';
import { Tooltip } from '../../common/Tooltip/Tooltip';
import { useToggle } from '../../hooks/useToggle';
import { CNTagName } from '../../utils/bem';
import { FF_DEV_4075, FF_PROD_309, isFF } from '../../utils/feature-flags';
import { isArraysEqual } from '../../utils/utilities';
import TreeStructure from '../TreeStructure/TreeStructure';

import styles from './Taxonomy.module.scss';

type TaxonomyPath = string[];
type onAddLabelCallback = (path: string[]) => any;
type onDeleteLabelCallback = (path: string[]) => any;

type TaxonomyItem = {
  label: string,
  path: TaxonomyPath,
  depth: number,
  children?: TaxonomyItem[],
  origin?: 'config' | 'user' | 'session',
  hint?: string,
};

type TaxonomyOptions = {
  canRemoveItems?: boolean,
  leafsOnly?: boolean,
  showFullPath?: boolean,
  pathSeparator?: string,
  maxUsages?: number,
  maxWidth?: number,
  minWidth?: number,
  placeholder?: string,
};

type TaxonomyOptionsContextValue = TaxonomyOptions & {
  onAddLabel?: onAddLabelCallback,
  onDeleteLabel?: onDeleteLabelCallback,
  maxUsagesReached?: boolean,
};

type TaxonomyProps = {
  items: TaxonomyItem[],
  selected: TaxonomyPath[],
  onChange: (node: any, selected: TaxonomyPath[]) => any,
  onAddLabel?: onAddLabelCallback,
  onDeleteLabel?: onDeleteLabelCallback,
  options?: TaxonomyOptions,
  isEditable?: boolean,
};

type TaxonomySelectedContextValue = [TaxonomyPath[], (path: TaxonomyPath, value: boolean) => any];

const TaxonomySelectedContext = React.createContext<TaxonomySelectedContextValue>([[], () => undefined]);
const TaxonomyOptionsContext = React.createContext<TaxonomyOptionsContextValue>({});

type UserLabelFormProps = {
  onAddLabel: (path: string[]) => any,
  onFinish?: () => any,
  path: string[],
};

interface RowProps {
  style: any;
  dimensionCallback: (ref: any) => void;
  maxWidth: number;
  isEditable?: boolean;
  item: {
    row: {
      id: string,
      isOpen: boolean,
      path: string[],
      childCount: number,
      isFiltering: boolean,
      name: string,
      padding: number,
      isLeaf: boolean,
      origin?: any,
      hint?: string,
    },
    children?: any,
    toggle: (id: string) => void,
    addInside: (id?: string) => void,
  };
}

const UserLabelForm = ({ onAddLabel, onFinish, path }: UserLabelFormProps) => {
  const addRef = useRef<HTMLInputElement>(null);
  const onAdd = (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent) => {
    if (!addRef.current) return;

    const value = addRef.current.value;
    const isEscape = 'key' in e && e.key === 'Escape';
    const isEnter = 'key' in e && e.key === 'Enter';
    const isBlur = e.type === 'blur';

    if (isEscape) e.stopPropagation();

    // just do nothing, maybe misclick
    if (isEnter && !value) return;

    if ((isBlur || isEnter) && value) onAddLabel([...path, value]);

    // event fires on every key, so important to check
    if (isBlur || isEnter || isEscape) {
      addRef.current.value = '';
      onFinish?.();
    }
  };

  // autofocus; this also allows to close form on every action, because of blur event
  useEffect(() => addRef.current?.focus(), []);

  return (
    <div className={styles.taxonomy__newitem}>
      <input name="taxonomy__add" onKeyDownCapture={onAdd} onBlur={onAdd} ref={addRef} />
    </div>
  );
};

const SelectedList = ({ isEditable, flatItems } : { isEditable: boolean, flatItems:TaxonomyItem[] }) => {
  const [selected, setSelected] = useContext(TaxonomySelectedContext);
  const { showFullPath, pathSeparator = ' / ' } = useContext(TaxonomyOptionsContext);

  const selectedLabels = selected.map((selectedItem: string[]) =>
    selectedItem.map(
      (value: string) => {
        const label = flatItems.find(taxonomyItem => taxonomyItem.path[taxonomyItem.path.length - 1] === value)?.label;

        return label ?? value;
      }),
  );

  return (
    <div className={['htx-taxonomy-selected', styles.taxonomy__selected].join(' ')}>
      {selectedLabels.map((path, index) => (
        <div key={path.join('|')}>
          <span>{showFullPath ? path.join(pathSeparator) : path[path.length - 1]}</span>
          {isEditable ? (
            <input type="button" onClick={() => setSelected(selected[index], false)} value="×" />
          ) : null}
        </div>
      ))}
    </div>
  );
};

// check if item is child of parent (i.e. parent is leading subset of item)
function isSubArray(item: string[], parent: string[]) {
  if (item.length <= parent.length) return false;
  return parent.every((n, i) => item[i] === n);
}

type HintTooltipProps = {
  // Without title there is no tooltip at all as a component
  title?: string,
  // wrapper is used as a tag in JSX to wrap child elements to make Tooltip to work with the single child element
  // it can be a real tag or a component that provides real HTMLElement (not a text) as the result
  wrapper?: CNTagName,
  children: JSX.Element,
}

export const HintTooltip: React.FC<HintTooltipProps> = ({
  title,
  wrapper: Wrapper,
  children,
  ...rest
}) => {
  if (!isFF(FF_PROD_309)) return children;
  
  const content = Wrapper ? <Wrapper>{children}</Wrapper> : children;

  if (title) {
    return (
      <Tooltip title={title} mouseEnterDelay={500} {...rest}>
        {content}
      </Tooltip>
    );
  }
  return content;
};

const Item: React.FC<RowProps> = ({ style, item, dimensionCallback, maxWidth, isEditable }: RowProps) => {
  const {
    row: { id, isOpen, childCount, isFiltering, name, path, padding, isLeaf, hint },
    toggle,
    addInside: addChild,
  } = item;

  const [selected, setSelected] = useContext(TaxonomySelectedContext);
  const { leafsOnly, maxUsages, maxUsagesReached, onAddLabel, onDeleteLabel } = useContext(TaxonomyOptionsContext);

  const checked = selected.some(current => isArraysEqual(current, path));
  const isChildSelected = selected.some(current => isSubArray(current, path));
  const onlyLeafsAllowed = leafsOnly && !isLeaf;
  const limitReached = maxUsagesReached && !checked;
  const disabled = onlyLeafsAllowed || limitReached || !isEditable;

  const onClick = () => onlyLeafsAllowed && toggle(id);
  const arrowStyle = !isLeaf ? { transform: isOpen ? 'rotate(180deg)' : 'rotate(90deg)' } : { display: 'none' };

  const title = onlyLeafsAllowed
    ? 'Only leaf nodes allowed'
    : limitReached
      ? `Maximum ${maxUsages} items already selected`
      : undefined;

  const setIndeterminate = useCallback(
    el => {
      if (!el) return;
      if (checked) el.indeterminate = false;
      else el.indeterminate = isChildSelected;
    },
    [checked, isChildSelected],
  );

  const onDelete = useCallback(() => {
    onDeleteLabel?.(path);
    addChild();
  }, [item, onDeleteLabel]);

  const customClassname =
    item.row.origin === 'session'
      ? styles.taxonomy__item_session
      : item.row.origin === 'user'
        ? styles.taxonomy__item_user
        : '';

  const isAddingItem = name === '' && onAddLabel;

  const itemContainer = useRef<any>();
  const scrollSpace = maxWidth - itemContainer.current?.parentElement.offsetWidth || 0;
  const labelMaxWidth = maxWidth - padding - scrollSpace - 90;

  useEffect(() => {
    const container = itemContainer?.current;

    if (container) {
      container.toggle = toggle;
      dimensionCallback(container);
    }
  }, []);


  return (
    <div ref={itemContainer} style={{ paddingLeft: padding, maxWidth, ...style, width: 'fit-content' }}>
      {!isAddingItem ? (
        <>
          <div className={[styles.taxonomy__measure, isFF(FF_DEV_4075) ? styles.taxonomy__measure_ff_dev4075 : false].filter(Boolean).join(' ')}>
            <label>{name}</label>
            {isFF(FF_DEV_4075) && !isFiltering && (
              <div className={styles.taxonomy__extra}>
                <span className={styles.taxonomy__extra_count}>{childCount}</span>
              </div>
            )}
          </div>
          <HintTooltip title={hint}>
            <div className={[styles.taxonomy__item, customClassname].join(' ')}>
              <div className={styles.taxonomy__grouping} onClick={() => toggle(id)}>
                <LsChevron stroke="#09f" style={arrowStyle} />
              </div>
              <input
                className="item"
                id={id}
                name={id}
                type="checkbox"
                disabled={disabled}
                checked={checked}
                ref={setIndeterminate}
                onChange={e => {
                  if (isEditable) {
                    setSelected(path, e.currentTarget.checked);
                  }
                }}
              />
              <label
                htmlFor={id}
                style={isFF(FF_DEV_4075) ? {} : { maxWidth: `${labelMaxWidth}px` }}
                onClick={isEditable ? onClick : undefined}
                title={title}
                className={disabled ? styles.taxonomy__collapsable : undefined}
              >
                {name}
              </label>
              {!isFiltering && (
                <div className={styles.taxonomy__extra}>
                  <span className={styles.taxonomy__extra_count}>{childCount}</span>
                  {isEditable && onAddLabel && (
                    <div className={styles.taxonomy__extra_actions}>
                      <Dropdown
                        destroyPopupOnHide // important for long interactions with huge taxonomy
                        trigger={['click']}
                        overlay={(
                          <Menu>
                            <Menu.Item
                              key="add-inside"
                              className={styles.taxonomy__action}
                              onClick={() => {
                                addChild(id);
                              }}
                            >
                            Add Inside
                            </Menu.Item>
                            {item.row.origin === 'session' && (
                              <Menu.Item key="delete" className={styles.taxonomy__action} onClick={onDelete}>
                              Delete
                              </Menu.Item>
                            )}
                          </Menu>
                        )}
                      >
                        <div>...</div>
                      </Dropdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          </HintTooltip>
        </>
      ) : (
        <UserLabelForm key="" onAddLabel={onAddLabel} onFinish={() => addChild()} path={path} />
      )}
    </div>
  );
};

type TaxonomyDropdownProps = {
  dropdownRef: React.Ref<HTMLDivElement>,
  flatten: TaxonomyItem[],
  items: TaxonomyItem[],
  show: boolean,
  isEditable?: boolean,
};

const filterTreeByPredicate = (flatten: TaxonomyItem[], predicate: (item: TaxonomyItem) => boolean) => {
  const roots: TaxonomyItem[] = [];
  const childs: TaxonomyItem[][] = [];
  let d = -1;

  for (let i = flatten.length; i--;) {
    const item = flatten[i];

    if (item.depth === d) {
      const adjusted: TaxonomyItem = { ...item, children: childs[d] ?? [] };

      childs[d] = [];
      if (d) {
        if (!childs[d - 1]) childs[d - 1] = [];
        childs[d - 1].unshift(adjusted);
      } else {
        roots.unshift(adjusted);
      }
      d--;
      continue;
    }

    if (predicate(item)) {
      const adjusted = { ...item, children: [] };

      if (item.depth === 0) {
        roots.unshift(adjusted);
      } else {
        d = item.depth - 1;
        if (!childs[d]) childs[d] = [];
        childs[d].unshift(adjusted);
      }
    }
  }

  return roots;
};

const TaxonomyDropdown = ({ show, flatten, items, dropdownRef, isEditable }: TaxonomyDropdownProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const predicate = (item: TaxonomyItem) => item.label.toLocaleLowerCase().includes(search);
  const onInput = (e: FormEvent<HTMLInputElement>) => setSearch(e.currentTarget.value.toLocaleLowerCase());
  const { onAddLabel, minWidth, maxWidth } = useContext(TaxonomyOptionsContext);
  const [isAdding, addInside, closeForm] = useToggle(false);

  const list = search ? filterTreeByPredicate(flatten, predicate) : items;

  useEffect(() => {
    const input = inputRef.current;

    if (show && input) {
      input.value = '';
      input.focus();
      setSearch('');
    }
  }, [show]);

  const dataTransformation = ({
    node: { children, depth, label, origin, path, hint },
    nestingLevel,
    isFiltering,
    isOpen,
    childCount,
  }: {
    node: TaxonomyItem,
    nestingLevel: number,
    isFiltering: boolean,
    isOpen: boolean,
    childCount: number | undefined,
  }) => ({
    childCount,
    id: `${label}-${depth}`,
    isFiltering,
    isLeaf: !children?.length,
    isOpen,
    isOpenByDefault: true,
    name: label,
    nestingLevel,
    origin,
    padding: nestingLevel * 10 + 10,
    path,
    hint,
  });

  return (
    <div className={styles.taxonomy__dropdown} ref={dropdownRef} style={{ display: show ? 'block' : 'none' }}>
      <input
        autoComplete="off"
        className={styles.taxonomy__search}
        name="taxonomy__search"
        placeholder="Search..."
        onInput={onInput}
        ref={inputRef}
      />
      <TreeStructure
        items={list}
        isEditable={isEditable}
        rowComponent={Item}
        flatten={search !== ''}
        rowHeight={30}
        defaultExpanded={false}
        maxHeightPercentage={50}
        minWidth={Number(minWidth) || 200}
        maxWidth={Number(maxWidth) || 600}
        transformationCallback={dataTransformation}
      />
      {onAddLabel && search === '' && (
        <div className={styles.taxonomy__add__container}>
          {isAdding ? (
            <UserLabelForm path={[]} onAddLabel={onAddLabel} onFinish={closeForm} />
          ) : isEditable ? (
            <div className={styles.taxonomy__add}>
              <button onClick={addInside}>Add</button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

const Taxonomy = ({
  items,
  selected: externalSelected,
  onChange,
  onAddLabel,
  onDeleteLabel,
  options = {},
  isEditable = true,
}: TaxonomyProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const taxonomyRef = useRef<HTMLDivElement>(null);
  const [isOpen, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const onClickOutside = useCallback(e => {
    const cn = styles.taxonomy__action;

    // don't close dropdown if user clicks on action from context menu
    if ([e.target, e.target.parentNode].some(n => n?.classList?.contains(cn))) return;
    if (!taxonomyRef.current?.contains(e.target)) close();
  }, []);

  const isOpenClassName = isOpen ? styles.taxonomy_open : '';

  const flatten = useMemo(() => {
    const flatten: TaxonomyItem[] = [];
    const visitItem = (item: TaxonomyItem) => {
      flatten.push(item);
      item.children?.forEach(visitItem);
    };

    items.forEach(visitItem);
    return flatten;
  }, [items]);

  const [selected, setInternalSelected] = useState(externalSelected);

  const contextValue: TaxonomySelectedContextValue = useMemo(() => {
    const setSelected = (path: TaxonomyPath, value: boolean) => {
      const newSelected = value ? [...selected, path] : selected.filter(current => !isArraysEqual(current, path));

      // don't remove last item when taxonomy is used as labeling tool
      // canRemoveItems is undefined when FF is off; false only when region is active
      if (options.canRemoveItems === false && !newSelected.length) return;

      setInternalSelected(newSelected);
      onChange && onChange(null, newSelected);
    };

    return [selected, setSelected];
  }, [selected]);

  const optionsWithMaxUsages = useMemo(() => {
    const maxUsagesReached = options.maxUsages ? selected.length >= options.maxUsages : false;

    return { ...options, maxUsagesReached, onAddLabel, onDeleteLabel };
  }, [options, options.maxUsages, options.maxUsages ? selected : 0]);

  const onKeyDown = useCallback(e => {
    const taxonomyList: NodeListOf<HTMLElement> | undefined = taxonomyRef.current?.querySelectorAll('.item');
    const searchInput = taxonomyRef.current?.querySelector('input');
    const focusedElement: HTMLInputElement | Element | any = document.activeElement || undefined;
    const taxonomyHasItems = taxonomyList && taxonomyList.length > 0;
    const index = (taxonomyList && focusedElement)
      ? Array.from(taxonomyList).findIndex((taxonomyItem => taxonomyItem.id === focusedElement.id))
      : -1;
    const shiftFocus = (index: number, shift: number) => taxonomyHasItems && taxonomyList[index + shift].focus();
    // to not scroll the dropdown during jumping over checkboxes
    const dontDoubleScroll = (e: KeyboardEvent) => {
      if (['text', 'checkbox'].includes((e.target as HTMLInputElement).type)) e.preventDefault();
    };

    switch (e.key) {
      case 'Escape':
        close();
        e.stopPropagation();
        break;
      case 'ArrowDown':
        dontDoubleScroll(e);
        if (e.shiftKey) {
          setOpen(true);
          searchInput && searchInput.focus();
        }
        if (index >= 0) shiftFocus(index, 1);
        if (searchInput === focusedElement) shiftFocus(0, 0);
        break;
      case 'ArrowUp':
        dontDoubleScroll(e);
        if (index > 0) shiftFocus(index, -1);
        else if (index === 0) searchInput && searchInput.focus();
        break;
      case 'ArrowRight':
        if (index >= 0) focusedElement.parentNode?.parentNode?.toggle(focusedElement.id);
        searchInput && searchInput.focus();
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    setInternalSelected(externalSelected);
  }, [externalSelected]);

  useEffect(() => {
    document.body.addEventListener('click', onClickOutside, true);
    document.body.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.removeEventListener('click', onClickOutside);
      document.body.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <TaxonomySelectedContext.Provider value={contextValue}>
      <TaxonomyOptionsContext.Provider value={optionsWithMaxUsages}>
        <SelectedList isEditable={isEditable} flatItems={flatten} />
        <div className={['htx-taxonomy', styles.taxonomy, isOpenClassName].join(' ')} ref={taxonomyRef}>
          <span onClick={() => setOpen(val => !val)}>
            {options.placeholder || 'Click to add...'}
            <LsChevron stroke="#09f" />
          </span>
          <TaxonomyDropdown show={isOpen} isEditable={isEditable} items={items} flatten={flatten} dropdownRef={dropdownRef} />
        </div>
      </TaxonomyOptionsContext.Provider>
    </TaxonomySelectedContext.Provider>
  );
};

export { Taxonomy };
