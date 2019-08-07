import { types, getParent } from "mobx-state-tree";

import Utilities from "../utils";

const TaskStore = types
  .model("Task", {
    id: types.identifierNumber,
    data: types.maybeNull(types.string),
    project: types.maybeNull(types.number),
  })
  .views(self => ({
    get app() {
      return getParent(self);
    },

    /**
     * Return JSON with task data
     * @returns {object}
     */
    get dataObj() {
      if (Utilities.Checkers.isStringJSON(self.data)) {
        return JSON.parse(self.data);
      } else {
        return null;
      }
    },
  }));

export default TaskStore;
