import { getParent, types } from "mobx-state-tree";
import Utilities from "../utils";

/**
 * Model for HTTP Basic Authorization
 */
const AuthStore = types.model({
  enable: types.optional(types.boolean, false),
  username: types.string,
  password: types.string,
  to: types.string,
});

/**
 * Task Store
 */
const TaskStore = types
  .model("Task", {
    id: types.maybeNull(types.number),
    load: types.optional(types.boolean, false),
    auth: types.maybeNull(AuthStore),
    agreement: types.maybeNull(types.number),
    /**
     * Data of task, may contain an object but in App Store will be transformed into string
     * MST doesn't support processing of dynamic objects with unkown keys value
     */
    data: types.maybeNull(types.string),
    /**
     * Source field contains full task data as JSON string (LSE-only)
     * Includes annotators array with review statuses
     */
    source: types.optional(types.maybeNull(types.string), null),
    queue: types.optional(types.maybeNull(types.string), null),
    /**
     * Whether this task can be skipped. Defaults to true if undefined.
     */
    allow_skip: types.optional(types.maybeNull(types.boolean), true),
  })
  .views((self) => ({
    get app() {
      return getParent(self);
    },

    /**
     * Return JSON with task data
     * @returns {object}
     */
    get dataObj() {
      const data = (() => {
        if (Utilities.Checkers.isStringJSON(self.data)) {
          return JSON.parse(self.data);
        }
        if (typeof self.data === "object") {
          return self.data;
        }
        return null;
      })();

      // Add source field if available
      if (data && self.source) {
        data.source = self.source;
      }

      return data;
    },
  }));

export default TaskStore;
