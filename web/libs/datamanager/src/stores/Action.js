import { types } from "mobx-state-tree";
import { StringOrNumberID } from "./types";

const SelectOptions = types.model("SelectOptions", {
  label: types.string,
  value: types.string,
});

const ActionFormField = types.model("ActionForm", {
  label: types.maybeNull(types.string),
  name: types.string,
  value: types.maybeNull(types.union(types.string, types.array(types.string))),
  options: types.maybeNull(types.union(types.array(types.string), types.array(SelectOptions))),
  type: types.enumeration(["input", "number", "checkbox", "radio", "toggle", "select", "range"]),
  searchable: types.optional(types.boolean, false),
  placeholder: types.optional(types.string, ""),
});

const ActionFormCoulmn = types.model("ActionFormCoulmn", {
  width: types.maybeNull(types.number),
  fields: types.array(ActionFormField),
});

const ActionFormRow = types.model("ActionFormRow", {
  columnCount: 1,
  columns: types.maybeNull(types.array(ActionFormCoulmn)),
  fields: types.array(ActionFormField),
});

const ActionDialog = types.model("ActionDialog", {
  title: types.maybeNull(types.string),
  text: types.string,
  type: types.enumeration(["confirm", "prompt"]),
  form: types.maybeNull(types.array(ActionFormRow)),
});

export const Action = types
  .model("Action", {
    id: StringOrNumberID,
    dialog: types.maybeNull(ActionDialog),
    order: types.integer,
    disabled: types.optional(types.boolean, false),
    disabled_reason: types.optional(types.string, ""),
    title: types.string,
    enterprise_badge: types.optional(types.boolean, false),
  })
  .volatile(() => ({
    caller: null,
  }));
