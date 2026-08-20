import deepEqual from "deep-equal";
import { clone, destroy, flow, getParent, getRoot, getSnapshot, types } from "mobx-state-tree";
import { guidGenerator } from "../../utils/random";
import { normalizeFilterValue } from "./filter_utils";
import { TabFilter } from "./tab_filter";
import { TabHiddenColumns } from "./tab_hidden_columns";
import { TabSelectedItems } from "./tab_selected_items";
import { History } from "../../utils/history";
import { CustomJSON, StringOrNumberID, ThresholdType } from "../types";
import { clamp } from "../../utils/helpers";
const THRESHOLD_MIN = 0;
const THRESHOLD_MIN_DIFF = 0.001;
const LOCKED_TAB_UPDATE_MESSAGE = "This tab is locked. Unlock it to update.";
const LOCKED_TAB_READONLY_MESSAGE = "This tab is locked. Changes are not allowed.";
const LOCKED_TAB_FILTERS_UPDATE_MESSAGE = "This tab is locked. Unlock it to change filters.";
const LOCKED_TAB_FILTERS_READONLY_MESSAGE = "This tab is locked. Filters cannot be changed.";

import { validateFilterSnapshot } from "./filter_snapshot_utils";

export const Tab = types
  .model("View", {
    id: StringOrNumberID,

    title: "Tasks",
    oldTitle: types.maybeNull(types.string),

    key: types.optional(types.string, guidGenerator),

    type: types.optional(types.enumeration(["list", "grid"]), "list"),

    target: types.optional(types.enumeration(["tasks", "annotations"]), "tasks"),

    filters: types.array(types.late(() => TabFilter)),
    conjunction: types.optional(types.enumeration(["and", "or"]), "and"),
    hiddenColumns: types.maybeNull(types.optional(TabHiddenColumns, {})),
    ordering: types.optional(types.array(types.string), []),
    selected: types.optional(TabSelectedItems, {}),
    opener: types.optional(types.maybeNull(types.late(() => Tab)), null),
    columnsWidth: types.map(types.maybeNull(types.number)),
    columnsDisplayType: types.map(types.maybeNull(types.string)),
    gridWidth: 4,
    gridFitImagesToWidth: false,

    enableFilters: false,
    renameMode: false,
    saved: false,
    virtual: false,
    locked: false,
    is_locked: types.optional(types.maybeNull(types.boolean), false),
    locked_by: types.optional(types.maybeNull(CustomJSON), null),
    locked_at: types.optional(types.maybeNull(types.string), null),
    editable: true,
    deletable: true,
    semantic_search: types.optional(types.array(CustomJSON), []),
    threshold: types.optional(types.maybeNull(ThresholdType), null),
    agreement_selected: types.optional(CustomJSON, {}),
  })
  .volatile(() => {
    const defaultWidth = getComputedStyle(document.body)
      .getPropertyValue("--menu-sidebar-width")
      .replace("px", "")
      .trim();

    const labelingTableWidth = Number.parseInt(localStorage.getItem("labelingTableWidth") ?? defaultWidth ?? 200);

    return {
      labelingTableWidth,
    };
  })
  .views((self) => ({
    /** @returns {import("../../components/App/App").AppStore} */
    get root() {
      return getRoot(self);
    },

    get parent() {
      return getParent(getParent(self));
    },

    get columns() {
      return self.root.viewsStore.columns;
    },

    get targetColumns() {
      // `hidden` columns are filter-only (or otherwise non-toggleable) and must not
      // appear in the Columns / Order By pickers (FIT-2435).
      return self.columns.filter((c) => {
        return c.target === self.target && !c.hidden;
      });
    },

    // get fields formatted as columns structure for react-table
    get fieldsAsColumns() {
      return self.columns.reduce((res, column) => {
        if (!column.parent) {
          res.push(...column.asField);
        }
        return res;
      }, []);
    },

    get hiddenColumnsList() {
      return self.columns.filter((c) => c.is_hidden).map((c) => c.key);
    },

    get availableFilters() {
      return self.parent.availableFilters.filter((filter) => filter.field.available_for_new_filters);
    },

    get dataStore() {
      return self.root.dataStore;
    },

    get taskStore() {
      return self.root.taskStore;
    },

    get annotationStore() {
      return self.root.annotationStore;
    },

    get currentFilters() {
      return self.filters.filter((f) => {
        return f.target === self.target;
      });
    },

    get currentOrder() {
      return self.ordering.length
        ? self.ordering.reduce((res, field) => {
            const fieldName = field.replace(/^-/, "");
            const desc = field[0] === "-";

            return {
              ...res,
              [fieldName]: desc,
              desc,
              field: fieldName,
              column: self.columns.find((c) => c.id === fieldName),
            };
          }, {})
        : null;
    },

    get filtersApplied() {
      return self.validFilters.length;
    },

    get isLockedByManager() {
      return self.is_locked === true;
    },

    get lockedByName() {
      return self.locked_by?.name || self.locked_by?.email || null;
    },

    get canManageLock() {
      return self.root.SDK?.tabControls?.lock !== false;
    },

    get lockedIconTooltip() {
      if (!self.canManageLock) return "Tab locked";
      return self.lockedByName ? `Locked by ${self.lockedByName}` : "Locked";
    },

    get lockedUpdateMessage() {
      return self.canManageLock ? LOCKED_TAB_UPDATE_MESSAGE : LOCKED_TAB_READONLY_MESSAGE;
    },

    get lockedFiltersMessage() {
      return self.canManageLock ? LOCKED_TAB_FILTERS_UPDATE_MESSAGE : LOCKED_TAB_FILTERS_READONLY_MESSAGE;
    },

    get validFilters() {
      return self.filters.filter((f) => !!f.isValidFilter);
    },

    get serializedFilters() {
      const serialize = (filterModel) => {
        const snapshot = getSnapshot(filterModel);
        const item = {
          ...snapshot,
          type: filterModel.filter.currentType,
          child_filters: filterModel.child_filters
            .filter((childFilter) => childFilter.isValidFilter)
            .map((childFilter) => serialize(childFilter)),
        };

        item.value = normalizeFilterValue(item.type, item.operator, item.value);
        return item;
      };

      return self.validFilters.map((el) => serialize(el));
    },

    get selectedCount() {
      const selectedCount = self.selected.list.length;
      const dataLength = self.dataStore.total;

      return self.selected.all ? dataLength - selectedCount : selectedCount;
    },

    get allSelected() {
      return self.selectedCount === self.dataStore.total;
    },

    get filterSnapshot() {
      return {
        conjunction: self.conjunction,
        items: self.serializedFilters,
      };
    },

    /**
     * Snapshot of ALL filters (including empty/invalid ones).
     * Used by the "Copy filters" button — unlike filterSnapshot which only includes
     * valid filters, this captures the full state so the user can paste it back
     * and continue editing.
     */
    get allFiltersSnapshot() {
      const serialize = (filterModel) => {
        const item = {
          ...getSnapshot(filterModel),
          type: filterModel.filter.currentType,
          child_filters: filterModel.child_filters.map((childFilter) => serialize(childFilter)),
        };
        return item;
      };
      return {
        conjunction: self.conjunction,
        items: self.filters.map((el) => serialize(el)),
      };
    },

    // key used in urls
    get tabKey() {
      return self.virtual ? self.key : self.id;
    },

    get hiddenColumnsSnapshot() {
      return getSnapshot(self.hiddenColumns);
    },

    get query() {
      return JSON.stringify({
        filters: self.filterSnapshot,
        ordering: self.ordering.toJSON(),
        hiddenColumns: self.hiddenColumnsSnapshot,
        agreement_selected: self.agreement_selected,
      });
    },

    serialize() {
      if (self.virtual) {
        return {
          title: self.title,
          filters: self.filterSnapshot,
          ordering: self.ordering.toJSON(),
          hiddenColumns: self.hiddenColumnsSnapshot,
          columnsWidth: self.columnsWidth.toPOJO(),
          columnsDisplayType: self.columnsDisplayType.toPOJO(),
          gridWidth: self.gridWidth,
          gridFitImagesToWidth: self.gridFitImagesToWidth,
          agreement_selected: self.agreement_selected,
        };
      }

      const tab = {};
      const { apiVersion } = self.root;

      const data = {
        title: self.title,
        ordering: self.ordering.toJSON(),
        type: self.type,
        target: self.target,
        filters: self.filterSnapshot,
        hiddenColumns: getSnapshot(self.hiddenColumns),
        columnsWidth: self.columnsWidth.toPOJO(),
        columnsDisplayType: self.columnsDisplayType.toPOJO(),
        gridWidth: self.gridWidth,
        gridFitImagesToWidth: self.gridFitImagesToWidth,
        semantic_search: self.semantic_search?.toJSON() ?? [],
        threshold: self.threshold?.toJSON(),
        agreement_selected: self.agreement_selected,
      };

      if (self.saved || apiVersion === 1) {
        tab.id = self.id;
      }

      if (apiVersion === 2) {
        tab.data = data;
        tab.project = self.root.SDK.projectId;
      } else {
        Object.assign(tab, data);
      }

      self.root.SDK.invoke("tabTypeChanged", { tab: tab.id, type: self.type });
      return tab;
    },
  }))
  .volatile(() => ({
    snapshot: {},
  }))
  .actions((self) => ({
    lock() {
      self.locked = true;
    },

    unlock() {
      self.locked = false;
    },

    notifyLocked() {
      self.root.SDK.invoke("toast", {
        message: self.lockedUpdateMessage,
        type: "error",
      });
      return false;
    },

    setLockState(isLocked, lockedBy = null, lockedAt = null) {
      self.is_locked = isLocked;
      self.locked_by = lockedBy;
      self.locked_at = lockedAt;
    },

    toggleLock: flow(function* () {
      yield self.parent.updateViewLock(self, !self.isLockedByManager);
    }),

    setType(type) {
      if (self.isLockedByManager) return self.notifyLocked();
      self.type = type;
      self.root.SDK.invoke("tabTypeChanged", { tab: self.id, type });
      self.save({ reload: false });
    },

    setTarget(target) {
      self.target = target;
      self.save();
    },

    setTitle(title) {
      self.title = title;
    },

    setVirtual(value) {
      self.virtual = value;
    },

    setRenameMode(mode) {
      self.renameMode = mode;
      if (self.renameMode) self.oldTitle = self.title;
    },

    setConjunction(value) {
      if (self.isLockedByManager) return self.notifyLocked();
      self.conjunction = value;
      self.save();
    },

    setOrdering(value) {
      if (self.isLockedByManager) return self.notifyLocked();
      if (value === null) {
        self.ordering = [];
      } else {
        const direction = self.currentOrder?.[value];
        let ordering = value;

        if (direction !== undefined) {
          ordering = direction ? value : `-${value}`;
        }

        self.ordering[0] = ordering;
      }

      self.clearSelection();
      self.save({ interaction: "ordering" });
    },

    setLabelingTableWidth(width) {
      self.labelingTableWidth = width;
      localStorage.setItem("labelingTableWidth", self.labelingTableWidth);
    },

    setGridWidth(width) {
      if (self.isLockedByManager) return self.notifyLocked();
      self.gridWidth = width;
      self.save();
    },

    setFitImagesToWidth(responsive) {
      if (self.isLockedByManager) return self.notifyLocked();
      self.gridFitImagesToWidth = responsive;
      self.save();
    },

    setSelected(ids) {
      self.selected = ids;
    },

    setSemanticSearch(semanticSearchList, min, max) {
      if (self.isLockedByManager) return self.notifyLocked();
      self.semantic_search = semanticSearchList ?? [];
      /* if no semantic search we have to clean up threshold */
      if (self.semantic_search.length === 0) {
        self.threshold = null;
        return self.save();
      }
      /* if we have a min and max we need to make sure we save that too.
      this prevents firing 2 view save requests to accomplish the same thing */
      return !isNaN(min) && !isNaN(max) ? self.setSemanticSearchThreshold(min, max) : self.save();
    },

    setSemanticSearchThreshold(_min, max) {
      if (self.isLockedByManager) return self.notifyLocked();
      const min = clamp(_min ?? THRESHOLD_MIN, THRESHOLD_MIN, max - THRESHOLD_MIN_DIFF);

      if (self.semantic_search?.length && !isNaN(min) && !isNaN(max)) {
        self.threshold = { min, max };
        return self.save();
      }
    },

    clearSemanticSearchThreshold(save = true) {
      if (self.isLockedByManager) return self.notifyLocked();
      self.threshold = null;
      return save && self.save();
    },

    selectAll() {
      self.selected.toggleSelectedAll();
    },

    clearSelection() {
      self.selected.clear();
    },

    toggleSelected(id) {
      self.selected.toggleItem(id);
    },

    /**
     * Select or unselect a range of items by their IDs (used for shift-click range selection)
     * @param {Array} ids - Array of item IDs
     * @param {boolean} select - true to select, false to unselect
     */
    selectRange(ids, select = true) {
      self.selected.selectRange(ids, select);
    },

    setColumnWidth(columnID, width) {
      if (width) {
        self.columnsWidth.set(columnID, width);
      } else {
        self.columnsWidth.delete(columnID);
      }
    },

    setColumnDisplayType(columnID, type) {
      if (self.isLockedByManager) return self.notifyLocked();
      if (type !== null) {
        const filters = self.filters.filter(({ filter }) => {
          return columnID === filter.field.id;
        });

        filters.forEach((f) => {
          if (f.type !== type) f.delete();
        });

        self.columnsDisplayType.set(columnID, type);
      } else {
        self.columnsDisplayType.delete(columnID);
      }
    },

    /**
     * Add a new filter row.
     * Copies the column and operator from the last existing filter to reduce
     * repetitive re-selection when the user adds multiple filters for the same column.
     */
    createFilter() {
      if (self.isLockedByManager) return self.notifyLocked();
      const lastFilter = self.filters.length > 0 ? self.filters[self.filters.length - 1] : null;
      const filterType = lastFilter?.field.available_for_new_filters ? lastFilter.filter : self.availableFilters[0];
      const filter = TabFilter.create({
        filter: filterType,
        view: self.id,
      });

      self.filters.push(filter);

      // Immediately materialize child filter for the default column, if any
      self.applyChildFilter(filter);

      // Copy operator from previous filter if the column types match
      if (lastFilter && filter.filter.currentType === lastFilter.filter.currentType && lastFilter.operator) {
        filter.setOperator(lastFilter.operator);
      }

      if (filter.isValidFilter) self.save();
    },

    /**
     * Create a new filter row for the provided filter *type* (column).
     */
    createChildFilterForType(filterType, parentFilter) {
      const filter = TabFilter.create({
        filter: filterType,
        view: self.id,
      });

      // Child rows are ordered siblings owned by their root filter.
      parentFilter.child_filters.push(filter);

      return filter;
    },

    /**
     * Add one child row using an allowed column. Repeated aliases are valid because
     * each row represents an independent condition.
     */
    addChildFilter(rootFilter, filterTypeOrAlias) {
      if (self.isLockedByManager) return self.notifyLocked();

      const allowedAliases = rootFilter?.field?.allowed_child_filters ?? [];
      if (allowedAliases.length === 0) return null;

      const filterType =
        typeof filterTypeOrAlias === "object"
          ? filterTypeOrAlias
          : self.availableFilters.find(
              (candidate) =>
                candidate.id === filterTypeOrAlias ||
                candidate.field.alias === filterTypeOrAlias ||
                (!filterTypeOrAlias && allowedAliases.includes(candidate.field.alias)),
            );

      if (
        !filterType ||
        !allowedAliases.includes(filterType.field.alias) ||
        filterType.field.disabled ||
        !filterType.field.available_for_new_filters ||
        filterType.field.filter_available === false
      ) {
        return null;
      }

      return self.createChildFilterForType(filterType, rootFilter);
    },

    /** Remove exactly one child row and preserve its root and siblings. */
    removeChildFilter(rootFilterOrChild, maybeChildFilter) {
      if (self.isLockedByManager) return self.notifyLocked();

      const childFilter = maybeChildFilter ?? rootFilterOrChild;
      const parentFilter = maybeChildFilter
        ? rootFilterOrChild
        : self.filters.find((candidate) => candidate.child_filters.some((child) => child === childFilter));
      const index = parentFilter?.child_filters.indexOf(childFilter) ?? -1;

      if (index === -1) return false;

      destroy(childFilter);
      self.save();
      return true;
    },

    toggleColumn(column) {
      if (self.isLockedByManager) return self.notifyLocked();
      if (self.hiddenColumns.hasColumn(column)) {
        self.hiddenColumns.remove(column);
      } else {
        self.hiddenColumns.add(column);
      }
      self.save();
    },

    setAgreementFilters({
      ground_truth = false,
      annotators = { all: true, ids: [] },
      models = { all: true, ids: [] },
    }) {
      if (self.isLockedByManager) return self.notifyLocked();
      self.agreement_selected = {
        ground_truth,
        annotators: {
          all: annotators.all,
          ids: annotators.ids,
        },
        models: {
          all: models.all,
          ids: models.ids,
        },
      };
    },

    reload: flow(function* ({ interaction } = {}) {
      if (self.saved) {
        yield self.dataStore.reload({ id: self.id, interaction });
      }
      if (self.virtual) {
        yield self.dataStore.reload({ query: self.query, interaction });
      }

      getRoot(self).SDK?.invoke?.("tabReloaded", self);
    }),

    deleteFilter(filter) {
      if (self.isLockedByManager) return self.notifyLocked();

      const index = self.filters.indexOf(filter);
      if (index > -1) {
        self.filters.splice(index, 1);
        destroy(filter);
        self.save();
        return;
      }

      self.removeChildFilter(filter);
    },

    /**
     * Replace all current filters with those from a pasted snapshot.
     * Validates each item against available columns — columns that don't exist
     * in the current project are silently skipped.
     * @param {{ conjunction: string, items: Array }} snapshot
     * @returns {boolean} false if no valid filters could be imported
     */
    importFilters(snapshot) {
      if (self.isLockedByManager) return self.notifyLocked();
      const validItems = validateFilterSnapshot(snapshot, self.availableFilters);
      if (!validItems) return false;

      const { conjunction } = snapshot;
      const availableFilterIds = new Set(self.parent.availableFilters.map((filterType) => filterType.id));
      const toModelSnapshot = (item) => {
        if (!item?.filter || !availableFilterIds.has(item.filter)) return null;

        const hasChildCollection = Object.hasOwn(item, "child_filters") || Object.hasOwn(item, "child_filter");
        const childItems = Array.isArray(item.child_filters)
          ? item.child_filters
          : item.child_filter
            ? [item.child_filter]
            : [];

        return {
          filter: item.filter,
          operator: item.operator ?? null,
          value: item.value ?? null,
          ...(hasChildCollection && { child_filters: childItems.map(toModelSnapshot).filter(Boolean) }),
        };
      };

      // Destroy existing filters before importing
      while (self.filters.length > 0) {
        const f = self.filters[self.filters.length - 1];
        self.filters.splice(self.filters.length - 1, 1);
        destroy(f);
      }

      if (conjunction === "and" || conjunction === "or") {
        self.conjunction = conjunction;
      }

      for (const item of validItems) {
        try {
          const modelSnapshot = toModelSnapshot(item);
          if (!modelSnapshot) continue;

          const filter = TabFilter.create(modelSnapshot);
          self.filters.push(filter);
        } catch (e) {
          console.warn("importFilters: failed to create filter for", item.filter, e);
        }
      }

      self.save();
      return true;
    },

    afterAttach() {
      self.hiddenColumns = self.hiddenColumns ?? clone(self.parent.defaultHidden);
    },

    afterCreate() {
      self.snapshot = self.serialize();
    },

    save: flow(function* ({ reload, interaction } = {}) {
      const serialized = self.serialize();

      if (!self.saved || !deepEqual(self.snapshot, serialized)) {
        self.snapshot = serialized;
        if (self.virtual === true) {
          const snapshot = self.serialize();

          self.key = self.parent.snapshotToUrl(snapshot);

          const projectId = self.root.SDK.projectId;

          // Save the virtual tab of the project to local storage to persist between page navigations
          if (projectId) {
            localStorage.setItem(`virtual-tab-${projectId}`, JSON.stringify(snapshot));
          }

          History.navigate({ tab: self.key }, true);
          self.reload({ interaction });
        } else {
          yield self.parent.saveView(self, { reload, interaction });
        }
      }
    }),

    saveVirtual: flow(function* (options) {
      const originalId = self.id;
      self.setVirtual(false);
      const newView = yield self.save(options);

      // If a new view was created (different ID), the old view is destroyed
      // Use the new view for navigation
      if (newView && newView.id !== originalId) {
        History.navigate({ tab: newView.id }, true);
      } else {
        // Same view, ensure virtual is false
        self.setVirtual(false);
        History.navigate({ tab: self.id }, true);
      }
    }),

    delete: flow(function* () {
      yield self.root.apiCall("deleteTab", { tabID: self.id });
    }),

    markSaved() {
      self.saved = true;
    },

    /** Create the compatibility child declared by legacy singular column metadata. */
    applyChildFilter(rootFilter) {
      if (!rootFilter || !rootFilter.filter || !rootFilter.filter.field) return;

      const column = rootFilter.field;
      const childFilterAlias = column?.child_filter;

      if (!childFilterAlias || rootFilter.child_filters.length > 0) return;

      const firstChildColumn = self.targetColumns.find((candidate) => candidate.alias === childFilterAlias);

      if (firstChildColumn) {
        const filterType = self.availableFilters.find((ft) => ft.field.id === firstChildColumn.id);

        if (filterType) {
          self.createChildFilterForType(filterType, rootFilter);
        }
      }
    },

    /** Remove all children without saving; the root transition performs the write. */
    clearChildFilters(rootFilter) {
      while (rootFilter?.child_filters.length > 0) {
        destroy(rootFilter.child_filters[0]);
      }
    },

    // Compatibility action for integrations that still call the singular method name.
    clearChildFilter(rootFilter) {
      self.clearChildFilters(rootFilter);
    },
  }))
  .preProcessSnapshot((snapshot) => {
    if (snapshot === null) return snapshot;

    const { filters, agreement_selected, ...sn } = snapshot ?? {};

    if (filters && !Array.isArray(filters)) {
      const { conjunction, items } = filters ?? {};

      Object.assign(sn, {
        filters: items ?? [],
        conjunction: conjunction ?? "and",
      });
    } else {
      sn.filters = filters;
    }

    if (agreement_selected) {
      Object.assign(sn, {
        agreement_selected:
          typeof agreement_selected === "string" ? JSON.parse(agreement_selected) : agreement_selected,
      });
    }
    delete sn.selectedItems;

    return sn;
  });
