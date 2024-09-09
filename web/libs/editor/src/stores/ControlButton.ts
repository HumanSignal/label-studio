import { applySnapshot, getSnapshot, types } from "mobx-state-tree";
import { customTypes } from "../core/CustomTypes";
import { guidGenerator } from "../utils/unique";

export const ControlButton = types
  .model("ControlButton", {
    id: types.optional(types.identifier, guidGenerator),
    title: types.maybe(types.string),
    look: types.maybe(types.enumeration(["primary", "danger", "destructive", "alt", "outlined", "active", "disabled"])),
    tooltip: types.maybe(types.string),
    ariaLabel: types.maybe(types.string),
    disabled: types.maybe(types.boolean),
    onClick: types.maybe(customTypes.rawCallback),
  })
  .actions((self) => ({
    updateProps(newProps: Partial<typeof self>) {
      applySnapshot(self, Object.assign({}, getSnapshot(self), newProps));
    },
  }));
