import { flow, getRoot, types } from "mobx-state-tree";
import { guidGenerator } from "../../utils/random";
import { isDefined } from "../../utils/utils";
import { DEFAULT_PAGE_SIZE, getStoredPageSize } from "../../components/Common/Pagination/Pagination";
import { FF_LOPS_E_3, isFF } from "../../utils/feature-flags";

const listIncludes = (list, id) => {
  const index = id !== undefined ? Array.from(list).findIndex((item) => item.id === id) : -1;

  return index >= 0;
};

const MixinBase = types
  .model("InfiniteListMixin", {
    page: types.optional(types.integer, 0),
    pageSize: types.optional(types.integer, getStoredPageSize("tasks", DEFAULT_PAGE_SIZE)),
    total: types.optional(types.integer, 0),
    loading: false,
    loadingItem: false,
    loadingItems: types.optional(types.array(types.number), []),
    updated: guidGenerator(),
  })
  .views((self) => ({
    get API() {
      return self.root.API;
    },

    get root() {
      return getRoot(self);
    },

    get totalPages() {
      return Math.ceil(self.total / self.pageSize);
    },

    get hasNextPage() {
      return self.page !== self.totalPages;
    },

    get isLoading() {
      return self.loadingItem || self.loadingItems.length > 0;
    },

    get length() {
      return self.list.length;
    },

    itemIsLoading(id) {
      return self.loadingItems.includes(id);
    },
  }))
  .actions((self) => ({
    setSelected(val) {
      let selected;

      if (typeof val === "number") {
        selected = self.list.find((t) => t.id === val);
        if (!selected) {
          selected = getRoot(self).taskStore.loadTask(val);
        }
      } else {
        selected = val;
      }

      if (selected && selected.id !== self.selected?.id) {
        self.selected = selected;
        self.highlighted = selected;

        getRoot(self).SDK.invoke("taskSelected");
      }
    },

    hasRecord(id) {
      return self.list.some((t) => t.id === Number(id));
    },

    unset({ withHightlight = false } = {}) {
      self.selected = undefined;
      if (withHightlight) self.highlighted = undefined;
    },

    setList({ list, total, reload, associatedList = [] }) {
      const newEntity = list.map((t) => ({
        ...t,
        source: JSON.stringify(t),
      }));

      self.total = total;

      newEntity.forEach((n) => {
        const index = self.list.findIndex((i) => i.id === n.id);

        if (index >= 0) {
          self.list.splice(index, 1);
        }
      });

      if (reload) {
        self.list = [...newEntity];
      } else {
        self.list.push(...newEntity);
      }

      self.associatedList = associatedList;
    },

    setLoading(id) {
      if (id !== undefined) {
        self.loadingItems.push(id);
      } else {
        self.loadingItem = true;
      }
    },

    finishLoading(id) {
      if (id !== undefined) {
        self.loadingItems = self.loadingItems.filter((item) => item !== id);
      } else {
        self.loadingItem = false;
      }
    },

    clear() {
      self.highlighted = undefined;
      self.list = [];
      self.page = 0;
      self.total = 0;
    },
  }));

export const DataStore = (modelName, { listItemType, apiMethod, properties, associatedItemType }) => {
  const model = types
    .model(modelName, {
      ...(properties ?? {}),
      list: types.optional(types.array(listItemType), []),
      selectedId: types.optional(types.maybeNull(types.number), null),
      highlightedId: types.optional(types.maybeNull(types.number), null),
      ...(associatedItemType
        ? { associatedList: types.optional(types.maybeNull(types.array(associatedItemType)), []) }
        : {}),
    })
    .views((self) => ({
      get selected() {
        return self.list.find(({ id }) => id === self.selectedId);
      },

      get highlighted() {
        return self.list.find(({ id }) => id === self.highlightedId);
      },

      set selected(item) {
        self.selectedId = item?.id ?? item;
      },

      set highlighted(item) {
        self.highlightedId = item?.id ?? item;
      },
    }))
    .volatile(() => ({
      requestId: null,
    }))
    .actions((self) => ({
      updateItem(itemID, patch) {
        let item = self.list.find((t) => t.id === itemID);

        if (item) {
          item.update(patch);
        } else {
          item = listItemType.create(patch);
          self.list.push(item);
        }

        return item;
      },

      fetch: flow(function* ({ id, query, pageNumber = null, reload = false, interaction, pageSize } = {}) {
        let currentViewId;
        let currentViewQuery;
        const requestId = (self.requestId = guidGenerator());
        const root = getRoot(self);

        if (id) {
          currentViewId = id;
          currentViewQuery = query;
        } else {
          const currentView = root.viewsStore.selected;

          currentViewId = currentView?.id;
          currentViewQuery = currentView?.virtual ? currentView?.query : null;
        }

        if (!isDefined(currentViewId)) return;

        self.loading = true;

        if (interaction === "filter" || interaction === "ordering" || reload) {
          self.page = 1;
        } else if (reload || isDefined(pageNumber)) {
          if (self.page === 0) self.page = 1;
          else if (isDefined(pageNumber)) self.page = pageNumber;
        } else {
          self.page++;
        }

        if (pageSize) {
          self.pageSize = pageSize;
        } else {
          self.pageSize = getStoredPageSize("tasks", DEFAULT_PAGE_SIZE);
        }

        const params = {
          page: self.page,
          page_size: self.pageSize,
        };

        if (currentViewQuery) {
          params.query = currentViewQuery;
        } else {
          params.view = currentViewId;
        }

        if (interaction) Object.assign(params, { interaction });

        const data = yield root.apiCall(apiMethod, params, {}, { allowToCancel: root.SDK.type === "DE" });

        // We cancel current request processing if request id
        // changed during the request. It indicates that something
        // triggered another request while current one is not yet finished
        if (requestId !== self.requestId || data.isCanceled) {
          console.log(`Request ${requestId} was cancelled by another request`);
          return;
        }

        const highlightedID = self.highlighted;
        const apiMethodSettings = root.API.getSettingsByMethodName(apiMethod);
        const { total, [apiMethod]: list } = data;
        let associatedList = [];

        if (isFF(FF_LOPS_E_3) && apiMethodSettings?.associatedType) {
          associatedList = data[apiMethodSettings?.associatedType];
        }

        if (list)
          self.setList({
            total,
            list,
            reload: reload || isDefined(pageNumber),
            associatedList,
          });

        if (isDefined(highlightedID) && !listIncludes(self.list, highlightedID)) {
          self.highlighted = null;
        }

        self.postProcessData?.(data);

        self.loading = false;

        root.SDK.invoke("dataFetched", self);
      }),

      reload: flow(function* ({ id, query, interaction } = {}) {
        yield self.fetch({ id, query, reload: true, interaction });
      }),

      focusPrev() {
        const index = Math.max(0, self.list.indexOf(self.highlighted) - 1);

        self.highlighted = self.list[index];
        self.updated = guidGenerator();

        return self.highlighted;
      },

      focusNext() {
        const index = Math.min(self.list.length - 1, self.list.indexOf(self.highlighted) + 1);

        self.highlighted = self.list[index];
        self.updated = guidGenerator();

        return self.highlighted;
      },
    }));

  return types.compose(MixinBase, model);
};
