import { types } from "mobx-state-tree";

/**
 * User store of Label Studio
 */
const UserStore = types.model("UserStore", {
  /**
   * Personal key of user
   */
  pk: types.integer,
  /**
   * Name of user
   */
  firstName: types.string,
  /**
   * Last name of user
   */
  lastName: types.string,
});

export default UserStore;
