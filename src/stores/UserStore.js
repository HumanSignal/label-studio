import { types } from "mobx-state-tree";

/**
 * User store of Label Studio
 */
const UserStore = types
  .model("UserStore", {
    /**
     * Personal key of user
     */
    pk: types.maybeNull(types.integer),
    /**
     * Name of user
     */
    firstName: types.maybeNull(types.string),
    /**
     * Last name of user
     */
    lastName: types.maybeNull(types.string),
  })
  .views(self => ({
    get displayName() {
      if (self.firstName || self.lastName) return `${self.firstName} ${self.lastName}`;

      return "";
    },
  }));

export default UserStore;
