import React from "react";
import { Rate, Icon } from "antd";
import { observer, inject } from "mobx-react";
import { types } from "mobx-state-tree";

import Registry from "../../core/Registry";
import { guidGenerator } from "../../core/Helpers";

/**
 * Rating adds rating selection
 *
 * @example
 * <View>
 *   <Text name="txt" value="$text"></Text>
 *   <Rating name="rating" toName="txt" maxRating="10" icon="star" size="medium"></Rating>
 * </View>
 *
 * @name Rating
 * @param {string} name Name of the element
 * @param {string} toName Name of the element that you want to label
 * @param {number} [maxRating=5] Maximum rating value
 * @param {string} [size=medium] One of: small, medium, large
 * @param {string} [icon=start] One of: star, heart, fire, smile
 * @param {string} hotkey HotKey of Rating
 */
const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  toname: types.maybeNull(types.string),

  maxRating: types.optional(types.number, 5),
  icon: types.optional(types.string, "star"),
  size: types.optional(types.string, "medium"),
  defaultValue: types.optional(types.number, 0),

  hotkey: types.maybeNull(types.string),
});

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "rating",
    rating: types.maybeNull(types.number),
  })
  .views(self => ({
    get isSelected() {
      return self.rating > 0;
    },
  }))
  .actions(self => ({
    getSelectedString() {
      return self.rating + " star";
    },

    getSelectedNames() {
      return self.rating;
    },

    unselectAll() {
      self.rating = 0;
    },

    handleRate(value) {
      self.rating = value;
    },

    increaseValue() {
      if (self.rating >= self.maxRating) {
        self.rating = 0;
      } else {
        if (self.rating > 0) {
          self.rating = self.rating + 1;
        } else {
          self.rating = 1;
        }
      }
    },

    onHotKey() {
      return self.increaseValue();
    },

    toStateJSON() {
      if (self.rating) {
        const toname = self.toname || self.name;
        return {
          id: self.pid,
          from_name: self.name,
          to_name: toname,
          type: self.type,
          value: {
            rating: self.rating,
          },
        };
      }
    },

    fromStateJSON(obj, fromModel) {
      if (obj.id) self.pid = obj.id;

      self.rating = obj.value.rating;
    },
  }));

const RatingModel = types.compose("RatingModel", TagAttrs, Model);

const HtxRating = inject("store")(
  observer(({ item, store }) => {
    let iconSize;

    if (item.size === "small") {
      iconSize = 15;
    } else if (item.size === "medium") {
      iconSize = 25;
    } else if (item.size === "large") {
      iconSize = 40;
    }

    return (
      <div>
        <Rate
          character={<Icon type={item.icon} style={{ fontSize: iconSize }} />}
          value={item.rating}
          count={Number(item.maxRating)}
          defaultValue={item.defaultValue}
          onChange={item.handleRate}
        />
        {store.settings.enableTooltips && store.settings.enableHotkeys && item.hotkey && (
          <sup style={{ fontSize: "9px" }}>[{item.hotkey}]</sup>
        )}
      </div>
    );
  }),
);

Registry.addTag("rating", RatingModel, HtxRating);

export { HtxRating, RatingModel };
