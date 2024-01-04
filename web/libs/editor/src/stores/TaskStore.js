import { getParent, types } from 'mobx-state-tree';
import Utilities from '../utils';

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
  .model('Task', {
    id: types.maybeNull(types.number),
    load: types.optional(types.boolean, false),
    auth: types.maybeNull(AuthStore),
    /**
     * Data of task, may contain an object but in App Store will be transformed into string
     * MST doesn't support processing of dynamic objects with unkown keys value
     */
    data: types.maybeNull(types.string),
    queue: types.optional(types.maybeNull(types.string), null),
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
      } else if (typeof self.data === 'object') {
        return self.data;
      } else {
        return null;
      }
    },
  }));

export default TaskStore;
