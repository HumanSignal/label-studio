import { types } from "mobx-state-tree";
import { FF_LOPS_E_3, isFF } from "../utils/feature-flags";
import { CustomCalback, HtmlOrReact, StringOrNumberID } from "./types";

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

const isFFLOPSE3 = isFF(FF_LOPS_E_3);

export const Action = types
  .model("Action", {
    id: StringOrNumberID,
    dialog: types.maybeNull(ActionDialog),
    order: types.integer,
    title: isFFLOPSE3 ? types.union(types.string, HtmlOrReact) : types.string,
    ...(isFFLOPSE3
      ? {
          children: types.optional(types.array(types.late(() => Action)), []),
          callback: types.maybeNull(CustomCalback),
          isSeparator: types.optional(types.boolean, false),
          isTitle: types.optional(types.boolean, false),
          newStyle: types.optional(types.boolean, false),
          disabled: types.optional(types.boolean, false),
          disabledReason: types.optional(types.string, ""),
        }
      : {}),
  })
  .volatile(() => ({
    caller: null,
  }));
