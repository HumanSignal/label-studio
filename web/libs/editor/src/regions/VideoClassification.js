import { types } from "mobx-state-tree";

import Registry from "../core/Registry";
import { VideoRegion } from "./VideoRegion";

const Model = types
  .model("VideoClassificationModel", {
    type: "videoclassification",
    choices: types.array(types.string),
    classification: true,
    perFrame: true,
  })
  .views((self) => ({
    get label() {
      return self.choices.join(", ");
    },

    getShape() {
      return null;
    },

    getVisibility() {
      return true;
    },
  }))
  .actions((self) => {
    const Super = {
      toggleLifespan: self.toggleLifespan,
      addKeypoint: self.addKeypoint,
      removeKeypoint: self.removeKeypoint,
      serialize: self.serialize,
    };

    return {
      updateShape() {
        return;
      },

      serialize() {
        const result = Super.serialize();

        // `rotation` doesn't make any sense in classification, so we remove it
        // @todo rewrite to only add `rotation` in regions where it makes sense
        result.value.sequence = result.value.sequence.map(({ rotation, ...keyframe }) => {
          return keyframe;
        });

        return result;
      },

      toggleLifespan(frame) {
        Super.toggleLifespan(frame);

        self.object.updatePerFrameViews();
      },

      addKeypoint(frame, customEnabled) {
        Super.addKeypoint(frame, customEnabled);

        self.object.updatePerFrameViews();
      },

      removeKeypoint(frame) {
        Super.removeKeypoint(frame);

        self.object.updatePerFrameViews();
      },
    };
  });

const VideoClassificationModel = types.compose("VideoClassificationModel", VideoRegion, Model);

Registry.addRegionType(VideoClassificationModel, "video");

export { VideoClassificationModel };
