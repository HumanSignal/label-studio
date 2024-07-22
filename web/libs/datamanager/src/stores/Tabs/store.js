import { applySnapshot, clone, destroy, flow, getRoot, getSnapshot, types } from "mobx-state-tree";
import { History } from "../../utils/history";
import { guidGenerator } from "../../utils/random";
import { isDefined, unique } from "../../utils/utils";
import { CustomJSON } from "../types";
import { Tab } from "./tab";
import { TabColumn } from "./tab_column";
import { TabFilterType } from "./tab_filter_type";
import { TabHiddenColumns } from "./tab_hidden_columns";
import { serializeJsonForUrl, deserializeJsonFromUrl } from "../../utils/urlJSON";
import { isEmpty } from "../../utils/helpers";

const storeValue = (name, value) => {
  window.localStorage.setItem(name, value);
  return value;
};

const restoreValue = (name) => {
  const value = window.localStorage.getItem(name);

  return value ? value === "true" : false;
};

const dataCleanup = (tab, columnIds) => {
  const { data } = tab;

  if (!data) return { ...tab };

  if (data.filters) {
    data.filters.items = data.filters.items.filter(({ filter }) => {
      return columnIds.includes(filter.replace(/^filter:/, ""));
    });
  }

  ["columnsDisplayType", "columnWidths"].forEach((key) => {
    data[key] = Object.fromEntries(
      Object.entries(data[key] ?? {}).filter(([col]) => {
        return columnIds.includes(col);
      }),
    );
  });

  Object.entries(data.hiddenColumns ?? {}).forEach(([key, list]) => {
    data.hiddenColumns[key] = list.filter((k) => columnIds.includes(k));
  });

  return { ...tab, data };
};

const createNameCopy = (name) => {
  let newName = name;
  const matcher = /Copy(\s\(([\d]+)\))?/;
  const copyNum = newName.match(matcher);

  if (copyNum) {
    newName = newName.replace(matcher, (...match) => {
      const num = match[2];

      if (num) return `Copy (${Number(num) + 1})`;

      return "Copy (2)";
    });
  } else {
    newName += " Copy";
  }

  return newName;
};

export const TabStore = types
  .model("TabStore", {
    selected: types.maybeNull(types.late(() => types.reference(Tab))),
    views: types.optional(types.array(Tab), []),
    availableFilters: types.optional(types.array(TabFilterType), []),
    columnsTargetMap: types.map(types.array(TabColumn)),
    columnsRaw: types.optional(CustomJSON, []),
    sidebarVisible: restoreValue("sidebarVisible"),
    sidebarEnabled: restoreValue("sidebarEnabled"),
  })
  .volatile(() => ({
    defaultHidden: null,
  }))
  .views((self) => ({
    get all() {
      return self.views;
    },

    get canClose() {
      return self.all.length > 1;
    },

    get columns() {
      const cols = self.columnsTargetMap ?? new Map();

      return cols.get(self.selected?.target ?? "tasks") ?? [];
    },

    get dataStore() {
      return getRoot(self).dataStore;
    },

    get taskStore() {
      return getRoot(self).taskStore;
    },

    get annotationStore() {
      return getRoot(self).annotationStore;
    },

    get lastView() {
      return self.views[self.views.length - 1];
    },

    serialize() {
      return self.views.map((v) => v.serialize());
    },
  }))
  .actions((self) => ({
    setSelected: flow(function* (view, options = {}) {
      let selected;

      if (typeof view === "string") {
        selected = yield self.getViewByKey(view);
      } else if (typeof view === "number") {
        selected = self.views.find((v) => v.id === view);
      } else if (view && view.id) {
        selected = self.views.find((v) => v.id === view.id);
      }
      if (!selected) {
        selected = self.views[0];
      }

      if (self.views.length === 0 && options.createDefault !== false) {
        view = null;
        yield self.createDefaultView();
      }

      if (selected && self.selected !== selected) {
        if (options.pushState !== false || !view) {
          History.navigate({ tab: selected.tabKey }, true);
        }

        self.dataStore.clear();
        self.selected = selected;

        yield selected.reload();

        const root = getRoot(self);

        root.SDK.invoke("tabChanged", selected);
        selected.selected._invokeChangeEvent();
      }
    }),

    deleteView: flow(function* (view, { autoselect = true } = {}) {
      if (autoselect && self.selected === view) {
        let newView;

        if (self.selected.opener) {
          newView = self.opener.referrer;
        } else {
          const index = self.views.indexOf(view);

          newView = index === 0 ? self.views[index + 1] : self.views[index - 1];
        }

        self.setSelected(newView.key);
      }

      if (view.saved) {
        yield getRoot(self).apiCall("deleteTab", { tabID: view.id });
      }

      destroy(view);
    }),

    createSnapshot(viewSnapshot = {}) {
      const isVirtual = !!viewSnapshot?.virtual;
      const tabStorageKey = isVirtual && viewSnapshot.projectId ? `virtual-tab-${viewSnapshot.projectId}` : null;
      const existingTabStorage = isVirtual && localStorage.getItem(tabStorageKey);
      const existingTabStorageParsed = existingTabStorage ? JSON.parse(existingTabStorage) : null;
      const urlTabIsVirtualCandidate = !!(viewSnapshot?.tab && isNaN(viewSnapshot.tab));
      const existingTabUrlParsed =
        isVirtual && urlTabIsVirtualCandidate ? self.snapshotFromUrl(viewSnapshot.tab) : null;
      const urlTabNotEmpty = !isEmpty(existingTabUrlParsed);
      const existingTab = urlTabNotEmpty ? existingTabUrlParsed : existingTabStorageParsed;
      const existingTabKey = urlTabNotEmpty ? viewSnapshot.tab : existingTabStorageParsed?.tab;
      const snapshot = {
        ...viewSnapshot,
        key: existingTabKey,
        tab: existingTabKey,
        ...(existingTab ?? viewSnapshot ?? {}),
      };
      const lastView = self.views[self.views.length - 1];
      const newTitle = snapshot.title ?? `New Tab ${self.views.length + 1}`;
      const newID = snapshot.id ?? (lastView?.id ? lastView.id + 1 : 0);

      const defaultHiddenColumns = self.defaultHidden
        ? clone(self.defaultHidden)
        : {
            explore: [],
            labeling: [],
          };

      return {
        ...snapshot,
        id: newID,
        title: newTitle,
        key: snapshot.key ?? guidGenerator(),
        hiddenColumns: snapshot.hiddenColumns ?? defaultHiddenColumns,
      };
    },

    addView: flow(function* (viewSnapshot = {}, options) {
      const { autoselect = true, autosave = true, reload = true } = options ?? {};

      const newSnapshot = self.createSnapshot(viewSnapshot);

      self.views.push(newSnapshot);
      const newView = self.views[self.views.length - 1];

      if (autosave) {
        // with autosave it will be reloaded anyway
        yield newView.save({ reload: !autosave && reload });
      }

      if (autoselect) {
        const selectedView = self.views[self.views.length - 1];

        self.setSelected(selectedView);
      }

      return newView;
    }),

    getViewByKey: flow(function* (key) {
      const view = self.views.find((v) => v.key === key);

      if (view) return view;
      const viewSnapshot = self.snapshotFromUrl(key);

      if (!viewSnapshot) return null;

      return yield self.addVirtualView(viewSnapshot);
    }),

    addVirtualView: flow(function* (viewSnapshot) {
      return yield self.addView(viewSnapshot, {
        autosave: false,
        // No need to select 'cause it's a selecting phase
        autoselect: false,
      });
    }),

    createDefaultView: flow(function* () {
      self.views.push({
        id: 0,
        title: "Default",
        hiddenColumns: self.defaultHidden,
      });

      let defaultView = self.views[self.views.length - 1];

      yield defaultView.save(defaultView);

      // at this point newly created tab does not exist
      // so we need to take in from the list once again
      defaultView = self.views[self.views.length - 1];
      self.selected = defaultView;
      getRoot(self).SDK.hasInterface("tabs") && defaultView.reload();
    }),

    snapshotFromUrl(viewQueryParam) {
      try {
        const viewSnapshot = deserializeJsonFromUrl(viewQueryParam);

        viewSnapshot.key = viewQueryParam;
        viewSnapshot.virtual = true;
        return viewSnapshot;
      } catch {
        return null;
      }
    },

    snapshotToUrl(snapshot) {
      return serializeJsonForUrl(snapshot);
    },

    saveView: flow(function* (view, { reload, interaction } = {}) {
      const needsLock = ["ordering", "filter"].includes(interaction);

      if (needsLock) view.lock();
      const { id: tabID } = view;
      const body = { body: view.snapshot };
      const params = { tabID };

      if (interaction !== undefined) Object.assign(params, { interaction });

      const root = getRoot(self);
      const apiMethod = !view.saved && root.apiVersion === 2 ? "createTab" : "updateTab";

      const result = yield root.apiCall(apiMethod, params, body, { allowToCancel: root.SDK.type === "DE" });

      if (result.isCanceled) {
        return view;
      }
      const viewSnapshot = getSnapshot(view);
      const newViewSnapshot = {
        ...viewSnapshot,
        ...result,
        saved: true,
        filters: viewSnapshot.filters,
        conjunction: viewSnapshot.conjunction,
      };

      if (result.id !== view.id) {
        self.views.push({ ...newViewSnapshot, saved: true });
        const newView = self.views[self.views.length - 1];

        root.SDK.hasInterface("tabs") && newView.reload();
        self.setSelected(newView);
        destroy(view);

        return newView;
      }
      applySnapshot(view, newViewSnapshot);

      if (reload !== false) {
        view.reload({ interaction });
      }

      view.unlock();
      return view;
    }),

    updateViewOrder: flow(function* (source, destination) {
      // Detach the view from the original position
      const [removed] = self.views.splice(source, 1);
      const sn = getSnapshot(removed);

      // Insert the view at the new position
      self.views.splice(destination, 0, sn);

      const idList = {
        project: getRoot(self).project.id,
        ids: self.views.map((obj) => {
          return obj.id;
        }),
      };

      getRoot(self).apiCall("orderTab", {}, { body: idList }, { alwaysExpectJSON: false });
    }),
    duplicateView: flow(function* (view) {
      const sn = getSnapshot(view);

      self.views.push({
        ...sn,
        id: Number.MAX_SAFE_INTEGER,
        saved: false,
        key: guidGenerator(),
        title: createNameCopy(sn.title),
      });

      const newView = self.views[self.views.length - 1];

      yield newView.save();
      self.selected = self.views[self.views.length - 1];
      self.selected.reload();
    }),

    createView(viewSnapshot) {
      return Tab.create(viewSnapshot ?? {});
    },

    expandFilters() {
      self.sidebarEnabled = storeValue("sidebarEnabled", true);
      self.sidebarVisible = storeValue("sidebarVisible", true);
    },

    collapseFilters() {
      self.sidebarEnabled = storeValue("sidebarEnabled", false);
      self.sidebarVisible = storeValue("sidebarVisible", false);
    },

    toggleSidebar() {
      self.sidebarVisible = storeValue("sidebarVisible", !self.sidebarVisible);
    },

    fetchColumns() {
      const columns = self.columnsRaw;
      const targets = unique(columns.map((c) => c.target));
      const hiddenColumns = {};
      const addedColumns = new Set();

      const createColumnPath = (columns, column) => {
        const result = [];

        if (column && column.parent) {
          const parentColums = columns.find((c) => {
            return !c.parent && c.id === column.parent && c.target === column.target;
          });

          result.push(createColumnPath(columns, parentColums).columnPath);
        }

        const parentPath = result.join(".");

        if (isDefined(column?.id)) {
          result.push(column.id);
        } else {
          console.warn("Column or id is not defined", column);
          console.warn("Columns", columns);
        }

        const columnPath = result.join(".");

        return { parentPath, columnPath };
      };

      targets.forEach((target) => {
        self.columnsTargetMap.set(target, []);
      });

      columns.forEach((col) => {
        if (!isDefined(col)) return;
        const { columnPath, parentPath } = createColumnPath(columns, col);

        const { target, visibility_defaults: visibility } = col;

        const columnID = `${target}:${columnPath}`;

        if (addedColumns.has(columnID)) return;

        const parent = parentPath ? `${target}:${parentPath}` : undefined;

        const children = col.children ? col.children.map((ch) => `${target}:${columnPath}.${ch}`) : undefined;

        const colsList = self.columnsTargetMap.get(col.target);

        colsList.push({
          ...col,
          id: columnID,
          alias: col.id,
          parent,
          children,
        });

        const column = colsList[colsList.length - 1];

        addedColumns.add(column.id);

        if (!col.children && column.filterable && (col?.visibility_defaults?.filter ?? true)) {
          self.availableFilters.push({
            id: `filter:${columnID}`,
            type: col.type,
            field: columnID,
            schema: col.schema ?? null,
          });
        }

        Object.entries(visibility ?? {}).forEach(([key, visible]) => {
          if (!visible) {
            hiddenColumns[key] = hiddenColumns[key] ?? [];
            hiddenColumns[key].push(column.id);
          }
        });
      });

      self.defaultHidden = TabHiddenColumns.create(hiddenColumns);
    },

    fetchTabs: flow(function* (tab, taskID, labeling) {
      const tabId = Number.parseInt(tab);
      const response = yield getRoot(self).apiCall("tabs");
      const tabs = response.tabs ?? response ?? [];
      const columnIds = self.columns.map((c) => c.id);

      const snapshots = tabs.map((t) => {
        const { data, ...tab } = dataCleanup(t, columnIds);

        return {
          ...tab,
          ...(data ?? {}),
          saved: true,
          hasData: !!data,
        };
      });

      self.views.push(...snapshots);

      yield self.setSelected(Number.isNaN(tabId) ? tab : tabId, {
        pushState: tab === undefined,
      });

      yield self.selected?.save();

      if (labeling) {
        getRoot(self).startLabelStream({
          pushState: false,
        });
      } else if (isDefined(taskID)) {
        const task = { id: Number.parseInt(taskID) };

        getRoot(self).startLabeling(task, {
          pushState: false,
        });
      }
    }),

    fetchSingleTab: flow(function* (tabKey, selectedItems) {
      let tab;
      const tabId = Number.parseInt(tabKey);

      if (!isNaN(tabKey) && !isNaN(tabId)) {
        const tabData = yield getRoot(self).apiCall("tab", { tabId });
        const columnIds = (self.columns ?? []).map((c) => c.id);
        const { data, ...tabClean } = dataCleanup(tabData, columnIds);

        self.views.push({
          ...tabClean,
          ...(data ?? {}),
          selected: {
            all: selectedItems?.all,
            list: selectedItems.included ?? selectedItems.excluded ?? [],
          },
          saved: true,
          hasData: !!data,
        });
        tab = self.views[self.views.length - 1];
      } else {
        tab = yield self.getViewByKey(tabKey);
      }

      self.selected = tab;
    }),
  }));
