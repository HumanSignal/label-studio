import { types } from "mobx-state-tree";
import { camelizeKeys } from "../utils/helpers";
import { StringOrNumberID } from "./types";

export const User = types
  .model("User", {
    id: StringOrNumberID,
    firstName: types.string,
    lastName: types.string,
    username: types.string,
    email: types.string,
    lastActivity: types.string,
    avatar: types.maybeNull(types.string),
    initials: types.string,
  })
  .views((self) => ({
    get fullName() {
      return [self.firstName, self.lastName]
        .filter((n) => !!n)
        .join(" ")
        .trim();
    },

    get displayName() {
      return self.fullName || (self.username ? self.username : self.email);
    },
  }))
  .preProcessSnapshot((sn) => {
    return camelizeKeys(sn);
  });
