import { applySnapshot, getSnapshot, types } from "mobx-state-tree";
import { guidGenerator } from "../utils/unique";

export const rawCallbackType = types.custom<Function, Function>({
  name: "rawCallback",
  fromSnapshot(value: Function) {
    return value;
  },
  toSnapshot(value: Function) {
    return value;
  },
  getValidationMessage(value: Function) {
    return "";
  },
  isTargetType(value: any) {
    return typeof value === "function";
  },
});

export const ControlButton = types
  .model("ControlButton", {
    id: types.optional(types.identifier, guidGenerator),
    title: types.maybe(types.string),
    look: types.maybe(types.enumeration(["primary", "danger", "destructive", "alt", "outlined", "active", "disabled"])),
    tooltip: types.maybe(types.string),
    ariaLabel: types.maybe(types.string),
    disabled: types.maybe(types.boolean),
    onClick: types.maybe(rawCallbackType),
  })
  .actions((self) => ({
    updateProps(newProps: Partial<typeof self>) {
      applySnapshot(self, Object.assign({}, getSnapshot(self), newProps));
    },
  }));

const ArCB = types.model("ArCB", {
  buttons: types.optional(types.array(ControlButton), []),
});
