import { getRoot, types } from "mobx-state-tree";
import { StringOrNumber } from "../types";

export const TabSelectedItems = types
  .model("TabSelectedItems", {
    all: false,
    list: types.optional(types.array(StringOrNumber), []),
  })
  .views((self) => ({
    get snapshot() {
      return {
        all: self.all,
        [self.listName]: Array.from(self.list),
      };
    },

    get listName() {
      return self.all ? "excluded" : "included";
    },

    get hasSelected() {
      return self.isAllSelected || self.isIndeterminate;
    },

    get isAllSelected() {
      return self.all && self.list.length === 0;
    },

    get isIndeterminate() {
      return self.list.length > 0;
    },

    get length() {
      return self.list.length;
    },

    get total() {
      if (self.all) {
        const totalCount = getRoot(self).dataStore.total ?? 0;

        return totalCount - self.length;
      }
      return self.length;
    },

    isSelected(id) {
      if (self.all) {
        return !self.list.includes(id);
      }
      return self.list.includes(id);
    },
  }))
  .actions((self) => ({
    afterCreate() {
      self._invokeChangeEvent();
    },

    toggleSelectedAll() {
      if (!self.all || !(self.all && self.isIndeterminate)) {
        self.all = !self.all;
      }

      self.list = [];
      self._invokeChangeEvent();
    },

    addItem(id) {
      self.list.push(id);
      self._invokeChangeEvent();
    },

    removeItem(id) {
      self.list.splice(self.list.indexOf(id), 1);
      self._invokeChangeEvent();
    },

    toggleItem(id) {
      if (self.list.includes(id)) {
        self.list.splice(self.list.indexOf(id), 1);
      } else {
        self.list.push(id);
      }
      self._invokeChangeEvent();
    },

    /**
     * Select or unselect multiple items by their IDs (used for shift-click range selection).
     * @param {Array} ids - Array of item IDs to select/unselect
     * @param {boolean} select - true to select, false to unselect
     */
    selectRange(ids, select = true) {
      if (self.all) {
        // In "all selected" mode:
        // - To select: remove IDs from the excluded list
        // - To unselect: add IDs to the excluded list
        for (const id of ids) {
          const index = self.list.indexOf(id);
          if (select && index !== -1) {
            self.list.splice(index, 1);
          } else if (!select && index === -1) {
            self.list.push(id);
          }
        }
      } else {
        // In normal mode:
        // - To select: add IDs to the included list
        // - To unselect: remove IDs from the included list
        for (const id of ids) {
          const index = self.list.indexOf(id);
          if (select && index === -1) {
            self.list.push(id);
          } else if (!select && index !== -1) {
            self.list.splice(index, 1);
          }
        }
      }
      self._invokeChangeEvent();
    },

    update(data) {
      self.all = data?.all ?? self.all;
      self.list = data?.[self.listName] ?? self.list;
      self._invokeChangeEvent();
    },

    clear() {
      self.all = false;
      self.list = [];
      self._invokeChangeEvent();
    },

    _invokeChangeEvent() {
      getRoot(self).SDK.invoke("taskSelectionChanged", self);
    },
  }))
  .preProcessSnapshot((sn) => {
    const { included, excluded, all } = sn ?? {};
    const result = { all, list: sn.list ?? (all ? excluded : included) };

    return result;
  });
