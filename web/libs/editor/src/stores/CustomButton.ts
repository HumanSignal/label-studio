import { types } from "mobx-state-tree";
import { guidGenerator } from "../utils/unique";

/**
 * Custom buttons that can be injected from outside application.
 * The only required property is `name`. If the `name` is one of the predefined buttons, it will be rendered as such.
 * @see CustomControl in BottomBar/Controls
 */
export const CustomButton = types.model("CustomButton", {
  id: types.optional(types.identifier, guidGenerator),
  name: types.string,
  title: types.string,
  look: types.maybe(
    types.enumeration(["primary", "danger", "destructive", "alt", "outlined", "active", "disabled"] as const),
  ),
  tooltip: types.maybe(types.string),
  ariaLabel: types.maybe(types.string),
  disabled: types.maybe(types.boolean),
});
