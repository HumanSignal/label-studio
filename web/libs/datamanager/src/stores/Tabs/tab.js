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
import { FF_ANNOTATION_RESULTS_FILTERING, isFF } from "../../utils/feature-flags";

const THRESHOLD_MIN = 0;
const THRESHOLD_MIN_DIFF = 0.001;

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
      return self.columns.filter((c) => {
        return c.target === self.target && !c.isAnnotationResultsFilterColumn;
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
      return self.parent.availableFilters;
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
        const targetMatches = f.target === self.target;
        const annotationResultsOK = isFF(FF_ANNOTATION_RESULTS_FILTERING) || !f.field.isAnnotationResultsFilterColumn;

        return targetMatches && annotationResultsOK;
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

    get validFilters() {
      return self.filters.filter((f) => !!f.isValidFilter);
    },

    get serializedFilters() {
      const serialize = (filterModel) => {
        const item = {
          ...getSnapshot(filterModel),
          type: filterModel.filter.currentType,
        };

        // cleanup or recurse on child_filter
        if (item.child_filter) {
          if (!filterModel.child_filter?.isValidFilter) {
            item.child_filter = null;
          } else {
            item.child_filter = serialize(filterModel.child_filter);
          }
        }

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

    setType(type) {
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

    setRenameMode(mode) {
      self.renameMode = mode;
      if (self.renameMode) self.oldTitle = self.title;
    },

    setConjunction(value) {
      self.conjunction = value;
      self.save();
    },

    setOrdering(value) {
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
      self.gridWidth = width;
      self.save();
    },

    setFitImagesToWidth(responsive) {
      self.gridFitImagesToWidth = responsive;
      self.save();
    },

    setSelected(ids) {
      self.selected = ids;
    },

    setSemanticSearch(semanticSearchList, min, max) {
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
      const min = clamp(_min ?? THRESHOLD_MIN, THRESHOLD_MIN, max - THRESHOLD_MIN_DIFF);

      if (self.semantic_search?.length && !isNaN(min) && !isNaN(max)) {
        self.threshold = { min, max };
        return self.save();
      }
    },

    clearSemanticSearchThreshold(save = true) {
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

    createFilter() {
      const filterType = self.availableFilters[0];
      const filter = TabFilter.create({
        filter: filterType,
        view: self.id,
      });

      self.filters.push(filter);

      // Immediately materialize child filter for the default column, if any
      self.applyChildFilter(filter);

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

      // Don't add to main filters array - child is owned by parent
      parentFilter.child_filter = filter;

      return filter;
    },

    toggleColumn(column) {
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
      // Recursively delete child filter first
      if (filter.child_filter) {
        self.deleteFilter(filter.child_filter);
      }

      const index = self.filters.findIndex((f) => f === filter);
      if (index > -1) {
        self.filters.splice(index, 1);
        destroy(filter);
        self.save();
      }
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
      self.virtual = false;
      yield self.save(options);
      History.navigate({ tab: self.id }, true);
    }),

    delete: flow(function* () {
      yield self.root.apiCall("deleteTab", { tabID: self.id });
    }),

    markSaved() {
      self.saved = true;
    },

    /**
     * Create child filters for a given root filter according to its column's `child_filter` metadata.
     */
    applyChildFilter(rootFilter) {
      if (!rootFilter || !rootFilter.filter || !rootFilter.filter.field) return;

      const column = rootFilter.field;
      const childFilter = column?.child_filter;

      if (!childFilter) return;

      // NOTE: using targetColumns instead of columns means that annotation results columns cannot be used in child_filters, but seems fine for now
      const firstChildColumn = self.targetColumns.find((c) => c.alias === childFilter);

      if (firstChildColumn && !rootFilter.child_filter) {
        const filterType = self.availableFilters.find((ft) => ft.field.id === firstChildColumn.id);

        if (filterType) {
          const childFilter = self.createChildFilterForType(filterType, rootFilter);
        }
      }
    },

    /** Remove any child filters previously created */
    clearChildFilter(rootFilter) {
      if (rootFilter.child_filter) {
        self.deleteFilter(rootFilter.child_filter);
        rootFilter.child_filter = null;
      }
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
