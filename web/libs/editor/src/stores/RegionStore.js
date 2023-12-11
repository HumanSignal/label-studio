import { destroy, detach, getEnv, getParent, onPatch, types } from 'mobx-state-tree';

import { Hotkey } from '../core/Hotkey';
import { isDefined } from '../utils/utilities';
import { AllRegionsType } from '../regions';
import { debounce } from '../utils/debounce';
import Tree, { TRAVERSE_STOP } from '../core/Tree';
import { FF_DEV_2755, isFF } from '../utils/feature-flags';

const hotkeys = Hotkey('RegionStore');

const localStorageKeys = {
  sort: 'outliner:sort',
  sortDirection: 'outliner:sort-direction',
  group: 'outliner:group',
  view: 'regionstore:view',
};

const SelectionMap = types.model(
  {
    selected: types.optional(types.map(types.safeReference(AllRegionsType)), {}),
    drawingSelected: types.optional(types.map(types.safeReference(AllRegionsType)), {}),
  }).views(self => {
  return {
    get keys() {
      return Array.from(self.selected.keys());
    },
    get annotation() {
      return getParent(self).annotation;
    },
    get highlighted() {
      return self.selected.size === 1 ? self.selected.values().next().value : null;
    },
    get size() {
      return self.selected.size;
    },
    get list() {
      return Array.from(self.selected.values());
    },
    isSelected(region) {
      return self.selected.has(region.id);
    },
  };
}).actions(self => {
  const updateResultsFromSelection = debounce(() => {
    self._updateResultsFromSelection();
  }, 0);

  return {
    beforeUnselect(region) {
      region.perRegionTags.forEach(tag => tag.submitChanges?.());
    },
    afterUnselect(region) {
      region.afterUnselectRegion?.();
    },
    drawingSelect(region) {
      self.drawingSelected.put(region);
    },
    drawingUnselect() {
      Array.from(self.drawingSelected.values()).forEach(region => {
        self.drawingSelected.delete(region.id);
      });
    },
    select(region) {
      self.selected.put(region);
      region.selectRegion && region.selectRegion();

      if (self.highlighted) {
        // @todo some backward compatibility, should be rewritten to state handling
        // @todo but there are some actions should be performed like scroll to region
        self.highlighted.perRegionTags.forEach(tag => tag.updateFromResult?.(undefined));
        // special case for Taxonomy as labeling tool
        self.highlighted.labelingTags.forEach(tag => tag.updateFromResult?.(undefined));
        updateResultsFromSelection();
      } else {
        updateResultsFromSelection();
      }

      // hook for side effects after region selected
      region.object?.afterRegionSelected?.(region);
    },
    _updateResultsFromSelection() {
      self._updateResultsFromRegions(self.selected.values());
    },
    _updateResultsFromRegions(regions) {
      const valuesFromControls = {};
      const controlsByName = {};

      Array.from(regions).map((region) => {
        region.results.forEach(result => {
          const controlName = result.from_name.name;
          const currentValue = valuesFromControls[controlName];

          if (currentValue !== undefined) {
            valuesFromControls[controlName] = result.mergeMainValue(currentValue);
          } else {
            controlsByName[controlName] = result.from_name;
            valuesFromControls[controlName] = result.mainValue;
          }
        });
      });
      self.annotation.unselectStates();
      for (const [controlName, value] of Object.entries(valuesFromControls)) {
        const control = controlsByName[controlName];

        control.updateFromResult?.(value);
      }
    },
    unselect(region) {
      self.beforeUnselect(region);
      self.selected.delete(region.id);
      self.afterUnselect(region);
    },
    clear() {
      // clear() in the middle empties selected regions, so store them in separate array
      const regionEntries = [...self.selected.values()];

      for (const region of regionEntries) {
        self.beforeUnselect(region);
      }
      self.selected.clear();
      for (const region of regionEntries) {
        self.afterUnselect(region);
      }
    },
    highlight(region) {
      self.clear();
      self.select(region);
    },
  };
});

export default types.model('RegionStore', {
  sort: types.optional(
    types.enumeration(['date', 'score']),
    window.localStorage.getItem(localStorageKeys.sort) ?? 'date',
  ),

  sortOrder: types.optional(
    types.enumeration(['asc', 'desc']),
    window.localStorage.getItem(localStorageKeys.sortDirection) ?? 'asc',
  ),

  group: types.optional(
    types.enumeration(['type', 'label', 'manual']),
    () => window.localStorage.getItem(localStorageKeys.group) ?? 'manual',
  ),

  filter: types.maybeNull(types.array(types.safeReference(AllRegionsType)), null),

  view: types.optional(
    types.enumeration(['regions', 'labels']),
    window.localStorage.getItem(localStorageKeys.view) ?? 'regions',
  ),
  selection: types.optional(SelectionMap, {}),
}).views(self => {
  let lastClickedItem;
  const getShiftClickSelectedRange = (item, tree) => {
    const regions = [];
    let clickedRegionsFound = 0;

    Tree.traverseTree({ children: tree }, (node) => {
      if (!node.isArea) return;
      if (node.item === lastClickedItem || node.item === item || clickedRegionsFound === 1) {
        if (node.item) regions.push(node.item);
        if (node.item === lastClickedItem) ++clickedRegionsFound;
        if (node.item === item) ++clickedRegionsFound;
      }
      if (clickedRegionsFound >= 2) {
        return TRAVERSE_STOP;
      }
    });

    return regions;
  };
  const createClickRegionInTreeHandler = (tree) => {
    return (ev, item) => {
      if (ev.shiftKey) {
        const regions = getShiftClickSelectedRange(item, tree);

        regions.forEach(region => {
          self.selection.select(region);
        });

        lastClickedItem = null;
        return;
      }
      lastClickedItem = item;
      if (ev.metaKey || ev.ctrlKey) {
        self.toggleSelection(item);
        return;
      }
      if (self.selection.highlighted === item) {
        self.clearSelection();
        return;
      }
      self.highlight(item);
    };
  };

  return {
    get annotation() {
      return getParent(self);
    },

    get classifications() {
      const textAreas = Array.from(self.annotation.names.values())
        .filter(t => isDefined(t))
        .filter(t => t.type === 'textarea' && !t.perregion)
        .map(t => t.regions);

      return [].concat(...textAreas);
    },

    get regions() {
      return Array.from(self.annotation.areas.values()).filter(area => !area.classification);
    },

    get filteredRegions() {
      return self.filter || self.regions;
    },

    get suggestions() {
      return Array.from(self.annotation.suggestions.values()).filter(area => !area.classification);
    },

    get isAllHidden() {
      return !self.regions.find(area => !area.hidden);
    },

    get sortedRegions() {
      const sorts = {
        date: isDesc => [...self.filteredRegions].sort(isDesc ? (a, b) => b.ouid - a.ouid : (a, b) => a.ouid - b.ouid),
        score: isDesc => [...self.filteredRegions].sort(isDesc ? (a, b) => b.score - a.score : (a, b) => a.score - b.score),
      };

      const sorted = sorts[self.sort](self.sortOrder === 'desc');

      return sorted;
    },

    getRegionsTree(enrich) {
      if (self.group === null || self.group === 'manual') {
        return self.asTree(enrich);
      } else if (self.group === 'label') {
        return self.asLabelsTree(enrich);
      } else if (self.group === 'type') {
        return self.asTypeTree(enrich);
      } else {
        console.error(`Grouping by ${self.group} is not implemented`);
      }
    },

    asTree(enrich) {
      const regions = self.sortedRegions;
      const tree = [];
      const lookup = new Map();
      const onClick = createClickRegionInTreeHandler(tree);

      // every region has a parentID
      // parentID is an empty string - "" if it's top level
      // or it can contain a string key to the parent region
      // [ { id: "1", parentID: "" }, { id: "2", parentID: "1" } ]
      // would create a tree of two elements

      regions.forEach((el, idx) => {
        const result = enrich(el, idx, onClick);

        Object.assign(result, {
          item: el,
          children: [],
          isArea: true,
        });

        lookup.set(el.cleanId, result);
      });

      lookup.forEach((el => {
        const pid = el.item.parentID;
        const parent = pid ? (lookup.get(pid) ?? lookup.get(pid.replace(/#(.+)/i, ''))) : null;

        if (parent) return parent.children.push(el);

        tree.push(el);
      }));

      return tree;
    },

    asLabelsTree(enrich) {
      // collect all label states into two maps
      const groups = {};
      const result = [];
      const onClick = createClickRegionInTreeHandler(result);
      let index = 0;
      const getLabelGroup = (label, key) => {
        const labelGroup = groups[key];

        if (labelGroup) return labelGroup;

        return groups[key] = {
          ...enrich(label, index, true),
          id: key,
          isGroup: true,
          isNotLabel: true,
          children: [],
        };
      };
      const getRegionLabel = (region) => region.labeling?.selectedLabels || region.emptyLabel && [region.emptyLabel];
      const addToLabelGroup = (key, label, region) => {
        const group = getLabelGroup(label, key);
        const groupId = group.id;
        const labelHotKey = getRegionLabel(region)?.[0]?.hotkey;

        if (isFF(FF_DEV_2755)) {
          group.hotkey = labelHotKey;
          group.pos = groupId.slice(0, groupId.indexOf('#'));
        }
        group.children.push({
          ...enrich(region, index, false, null, onClick, groupId),
          item: region,
          isArea: true,
        });
      };
      const addRegionsToLabelGroup = (labels, region) => {
        if (labels) {
          for (const label of labels) {
            addToLabelGroup(`${label.value}#${label.id}`, label, region);
          }
        } else {
          addToLabelGroup('no-label', undefined, region);
        }
      };

      for (const region of self.regions) {
        addRegionsToLabelGroup(region.labeling?.selectedLabels, region);

        index++;
      }

      const groupsArray = Object.values(groups);

      if (isFF(FF_DEV_2755)) {
        groupsArray.sort((a, b) => a.hotkey > b.hotkey ? 1 : a.hotkey < b.hotkey ? -1 : 0);
      }
      result.push(
        ...groupsArray,
      );

      return result;
    },

    asTypeTree(enrich) {
      // collect all label states into two maps
      const groups = {};
      const result = [];
      const onClick = createClickRegionInTreeHandler(result);

      let index = 0;

      const getTypeGroup = (region, key) => {
        const group = groups[key];

        if (group) return group;

        const groupingEntity = {
          type: 'tool',
          value: key.replace('region', ''),
          background: '#000',
        };

        return groups[key] = {
          ...enrich(groupingEntity, index, true),
          id: key,
          key,
          isArea: false,
          children: [],
          isGroup: true,
          entity: region,
        };
      };

      const addToLabelGroup = (region) => {
        const key = region.type;
        const group = getTypeGroup(region, key);

        group.children.push({
          ...enrich(region, index, false, null, onClick),
          item: region,
          isArea: true,
        });
      };

      for (const region of self.regions) {
        addToLabelGroup(region);

        index++;
      }

      result.push(...Object.values(groups));

      return result;
    },

    get hasSelection() {
      return !!self.selection.size;
    },
    isSelected(region) {
      return self.selection.isSelected(region);
    },

    get selectedIds() {
      return Array.from(self.selection.selected.values()).map(reg => reg.id);
    },

    get persistantView() {
      return window.localStorage.getItem(localStorageKeys.view) ?? self.view;
    },
  };
}).actions(self => ({
  addRegion(region) {
    self.regions.push(region);
    getEnv(self).events.invoke('entityCreate', region);
  },

  toggleSortOrder() {
    if (self.sortOrder === 'asc') self.sortOrder = 'desc';
    else self.sortOrder = 'asc';
  },

  setView(view) {
    if (isFF(FF_DEV_2755)) {
      window.localStorage.setItem(localStorageKeys.view, view);
    }
    self.view = view;
  },

  setSort(sort) {
    if (self.sort === sort) {
      self.toggleSortOrder();
    } else {
      self.sortOrder = 'asc';
      self.sort = sort;
    }

    window.localStorage.setItem(localStorageKeys.sort, self.sort);
    window.localStorage.setItem(localStorageKeys.sortDirection, self.sortOrder);

    self.initHotkeys();
  },

  setGrouping(group) {
    self.group = group;
    window.localStorage.setItem(localStorageKeys.group, self.group);
  },

  setFilteredRegions(filter) {

    if (self.regions.length === filter.length) {
      self.filter = null;
      self.regions.forEach((region) => region.filtered && region.toggleFiltered());
    } else {
      const filteredIds = filter.map((filter) => filter.id);
      
      self.filter = filter;

      self.regions.forEach((region) => {
        if (!region.hideable || (region.hidden && !region.filtered)) return;
        if (filteredIds.includes(region.id)) region.hidden && region.toggleFiltered();
        else if (!region.hidden) region.toggleFiltered();
      });
    }
  },

  /**
   * Delete region
   * @param {obj} region
   */
  deleteRegion(region) {
    detach(region);

    // find regions that have that region as a parent
    const children = self.filterByParentID(region.id);

    children && children.forEach(r => r.setParentID(region.parentID));

    getEnv(self).events.invoke('entityDelete', region);

    destroy(region);
    self.initHotkeys();
  },

  findRegionID(id) {
    return self.regions.find(r => r.id === id);
  },

  findRegion(id) {
    return self.regions.find(r => r.id === id);
  },

  filterByParentID(id) {
    return self.regions.filter(r => r.parentID === id);
  },

  afterCreate() {
    onPatch(self, patch => {
      if ((patch.op === 'add' || patch.op === 'delete') && patch.path.indexOf('/regions/') !== -1) {
        self.initHotkeys();
      }
    });
    self.view = window.localStorage.getItem(localStorageKeys.view) ?? (self.annotation.store.settings.displayLabelsByDefault ? 'labels' : 'regions');
  },

  // init Alt hotkeys for regions selection
  initHotkeys() {
    const PREFIX = 'alt+shift+';

    hotkeys.unbindAll();

    self.sortedRegions.forEach((r, n) => {
      hotkeys.addKey(PREFIX + (n + 1), function() {
        self.unselectAll();
        r.selectRegion();
      });
    });

    // this is added just for the reference to show up in the
    // settings page
    hotkeys.addKey('alt+shift+$n', () => {}, 'Select a region');
  },

  /**
   * @param {boolean} tryToKeepStates try to keep states selected if such settings enabled
   */
  unselectAll() {
    self.annotation.unselectAll();
  },

  unhighlightAll() {
    self.regions.forEach(r => r.setHighlight(false));
  },

  selectNext() {
    const { regions } = self;
    const idx = self.regions.findIndex(r => r.selected);

    if (idx < 0) {
      const region = regions[0];

      region && self.annotation.selectArea(region);
    } else {
      const next = isDefined(regions[idx + 1]) ? regions[idx + 1] : regions[0];

      next && self.annotation.selectArea(next);
    }
  },

  toggleVisibility() {
    const shouldBeHidden = !self.isAllHidden;

    self.regions.forEach(area => {
      if (area.hidden !== shouldBeHidden) {
        area.toggleHidden();
      }
    });
  },
  setHiddenByTool(shouldBeHidden, label) {
    self.regions.forEach(area => {
      if (area.hidden !== shouldBeHidden && area.type === label.type) {
        area.toggleHidden();
      }
    });
  },
  setHiddenByLabel(shouldBeHidden, label) {
    self.regions.forEach(area => {
      if (area.hidden !== shouldBeHidden) {
        const l = area.labeling;

        if (l) {
          const selected = l.selectedLabels;

          if (selected.includes(label)) {
            area.toggleHidden();
          }
        }
      }
    });
  },
  highlight(area) {
    self.selection.highlight(area);
  },

  clearSelection() {
    self.selection.clear();
  },

  selectRegionsByIds(ids) {
    self.regions.map(region => {
      if (ids.indexOf(region.id) === -1) return;
      self.toggleSelection(region, true);
    });
  },

  toggleSelection(region, isSelected) {
    if (!isDefined(isSelected)) isSelected = !self.selection.isSelected(region);
    if (isSelected) {
      self.selection.select(region);
    } else {
      self.selection.unselect(region);
    }
  },

}));
