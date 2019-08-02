import React, { Component } from "react";
import { Rating } from "semantic-ui-react";

import { observer, inject } from "mobx-react";
import { types } from "mobx-state-tree";

import { guidGenerator } from "../../core/Helpers";
import Registry from "../../core/Registry";
import Tree from "../../core/Tree";
import Types from "../../core/Types";

/**
 * Rating tag
 * @example
 * <View>
 *   <Text name="txt" value="$text"></Text>
 *   <Rating name="rating" toName="txt" maxRating="10"></Rating>
 * </View>
 * @name Rating
 * @param {string} name of the element
 * @param {string} toName name of the element that you want to label
 * @param {integer=} [maxRating=5] maxmium rating value
 * @param {string=} [size=large] one of: mini tiny small large huge massive
 * @param {string=} [icon=star] one of: star heart
 * @param {string=} hotkey hokey
 */
const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  toname: types.maybeNull(types.string),

  maxrating: types.optional(types.string, "5"),
  icon: types.optional(types.string, "star"),
  size: types.optional(types.string, "large"),

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

    handleRate(e, { rating, maxrating }) {
      self.rating = rating;
    },

    increaseValue() {
      if (self.rating >= self.maxrating) {
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

const RatingModel = types.compose(
  "RatingModel",
  TagAttrs,
  Model,
);

const HtxRating = inject("store")(
  observer(({ item, store }) => {
    return (
      <div>
        <Rating
          icon="star"
          size={item.size}
          defaultRating={0}
          rating={item.rating}
          maxRating={item.maxrating}
          onRate={item.handleRate}
          clearable
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
