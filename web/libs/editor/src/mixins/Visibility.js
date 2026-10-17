import { getParent, hasParent, types } from "mobx-state-tree";
import { isDefined } from "../utils/utilities";

/**
 * Visibility of a node on a given item of a multi-item object (perItem, Multi Items Segmentation).
 * Tags without VisibilityMixin (Number, DateTime, Rating) inherit visibility from their parent View,
 * the same way `isVisible` is checked for them in RequiredMixin.
 * @param {Object} node Tag
 * @param {number} itemIndex
 * @returns {boolean}
 */
export function isNodeVisibleForItem(node, itemIndex) {
  if (node.isVisibleForItem) return node.isVisibleForItem(itemIndex);
  if (node.isVisible === false) return false;
  if (!hasParent(node, 2)) return true;

  const parent = getParent(node, 2);

  return parent.isVisibleForItem ? parent.isVisibleForItem(itemIndex) : parent.isVisible !== false;
}

/**
 * Controls visibility of the element depending on other tags.
 * `visibleWhen` is required parameter, can refer to choices or regions, both selected or unselected:
 * - region-selected, can specify tag and label value, both are optional
 * - choice-selected, can specify tag, and with tag specified can specify choice value
 * - no-region-selected, can't specify anything else
 * - choice-unselected, can specify tag, and with tag specified can specify choice value
 * Can be applied to `View` and `Choices` tags.
 */
const VisibilityMixin = types
  .model({
    visiblewhen: types.maybeNull(types.string),
    whentagname: types.maybeNull(types.string),
    whenchoicevalue: types.maybeNull(types.string),
    whenlabelvalue: types.maybeNull(types.string),
    whenrole: types.maybeNull(types.string),
  })
  .views((self) => ({
    get isVisible() {
      if (getParent(self, 2)?.isVisible === false) {
        return false;
      }

      return self.isOwnConditionMet();
    },

    /**
     * Same as `isVisible`, but choice conditions on perItem tags are checked on the given item
     * instead of the current one, so hidden items can be told apart from visible ones on submit.
     * @param {number} itemIndex
     * @returns {boolean}
     */
    isVisibleForItem(itemIndex) {
      const parent = getParent(self, 2);
      const isParentVisible = parent?.isVisibleForItem
        ? parent.isVisibleForItem(itemIndex)
        : parent?.isVisible !== false;

      return isParentVisible && self.isOwnConditionMet(itemIndex);
    },

    /**
     * Checks visibility params of this tag only, ignoring parents.
     * @param {number} [itemIndex] item to check perItem choices on; current item if not set
     * @returns {boolean}
     */
    isOwnConditionMet(itemIndex) {
      const isPerItem = (tag) => isDefined(itemIndex) && tag.peritem && !!tag.selectedValuesForItem;
      const selectedValues = (tag) => (isPerItem(tag) ? tag.selectedValuesForItem(itemIndex) : tag.selectedValues?.());

      if (self.visiblewhen) {
        const fns = {
          "region-selected": ({ tagName, labelValue, roleValue }) => {
            const area = self.annotation.highlightedNode;

            if (!area || (tagName && area.labeling?.from_name.name !== tagName)) {
              return false;
            }

            if (labelValue) return labelValue.split(",").some((v) => area.hasLabel(v));

            if (roleValue) return roleValue.split(",").some((v) => area.chatmessage?.role === v);

            return true;
          },

          "choice-selected": ({ tagName, choiceValue }) => {
            if (!tagName) {
              for (const choices of self.annotation.names.values()) {
                if (choices.type === "choices" && choices.selectedValues && selectedValues(choices).length) {
                  return true;
                }
              }
              return false;
            }

            const tag = self.annotation.names.get(tagName);

            if (tag && isPerItem(tag)) {
              if (!isNodeVisibleForItem(tag, itemIndex)) return false;

              // for Taxonomy the value is a path, the selected choice is the last item in it
              const values = selectedValues(tag).map((v) => (Array.isArray(v) ? v.at(-1) : v));

              if (!choiceValue?.length) return values.length > 0;
              return choiceValue.split(",").some((v) => values.some((vv) => tag.selectedChoicesMatch(v, vv)));
            }

            if (!tag?.hasChoiceSelection && !choiceValue?.length) return false;
            if (tag.isVisible === false) return false;

            return tag.hasChoiceSelection(choiceValue?.split(","), tag.selectedValues());
          },

          "no-region-selected": () => !self.annotation.highlightedNode,
          "choice-unselected": (params) => !fns["choice-selected"](params),
        };

        if (Object.keys(fns).includes(self.visiblewhen)) {
          const res = fns[self.visiblewhen]({
            tagName: self.whentagname,
            choiceValue: self.whenchoicevalue,
            labelValue: self.whenlabelvalue,
            roleValue: self.whenrole,
          });

          return res !== false;
        }
      } else if (self.whenchoicevalue) {
        for (const choices of self.annotation.names.values()) {
          const choicesList = choices && selectedValues(choices);

          if (choicesList?.length) {
            for (const obj of choicesList) {
              if (obj === self.whenchoicevalue) return true;
            }
          }
        }

        return false;
      }

      return true;
    },
  }));

export default VisibilityMixin;
