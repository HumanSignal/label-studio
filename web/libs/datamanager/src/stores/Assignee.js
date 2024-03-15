import { types } from "mobx-state-tree";
import { User } from "./Users";
import { StringOrNumberID } from "./types";

export const Assignee = types
  .model("Assignee", {
    id: StringOrNumberID,
    user: types.late(() => types.reference(User)),
    review: types.maybeNull(types.enumeration(["accepted", "rejected", "fixed"])),
    reviewed: types.maybeNull(types.boolean),
    annotated: types.maybeNull(types.boolean),
  })
  .views((self) => ({
    get firstName() {
      return self.user.firstName;
    },
    get lastName() {
      return self.user.lastName;
    },
    get username() {
      return self.user.username;
    },
    get email() {
      return self.user.email;
    },
    get lastActivity() {
      return self.user.lastActivity;
    },
    get avatar() {
      return self.user.avatar;
    },
    get initials() {
      return self.user.initials;
    },
    get fullName() {
      return self.user.fullName;
    },
  }))
  .preProcessSnapshot((sn) => {
    let result = sn;

    if (typeof sn === "number") {
      result = {
        id: sn,
        user: sn,
        annotated: true,
        review: null,
        reviewed: false,
      };
    } else {
      const { user_id, user, ...rest } = sn;

      result = {
        ...rest,
        id: user_id ?? user,
        user: user_id ?? user,
      };
    }

    return result;
  });
