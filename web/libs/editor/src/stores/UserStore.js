import { types } from 'mobx-state-tree';
import { camelizeKeys } from '../utils/utilities';

export const UserExtended = types
  .model('UserExtended', {
    id: types.identifierNumber,
    firstName: types.maybeNull(types.string),
    lastName: types.maybeNull(types.string),
    username: types.maybeNull(types.string),
    email: types.maybeNull(types.string),
    lastActivity: types.maybeNull(types.string),
    avatar: types.maybeNull(types.string),
    initials: types.maybeNull(types.string),
    phone: types.maybeNull(types.string),
  })
  .preProcessSnapshot((sn) => {
    return camelizeKeys(sn ?? {});
  });


/**
 * User store of Label Studio
 */
const UserStore = types
  .model('UserStore', {
    /**
     * Personal key of user
     */
    id: types.maybeNull(types.integer),
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

      return '';
    },
  }));

export default UserStore;
