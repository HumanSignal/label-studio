import { types } from "mobx-state-tree";
import { User } from "./Users";
import { StringOrNumberID } from "./types";

const userSnapshot = (id, user = {}) => ({
  id,
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  lastActivity: "",
  initials: "",
  ...user,
});

export const Assignee = types
  .model("Assignee", {
    id: StringOrNumberID,
    user: User,
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
        user: userSnapshot(sn),
        annotated: true,
        review: null,
        reviewed: false,
      };
    } else {
      const { user_id, annotated, review, reviewed, ...user } = sn;
      const id = user_id ?? sn.id;

      result = {
        id,
        user: userSnapshot(id, user),
        annotated,
        review,
        reviewed,
      };
    }

    return result;
  });
