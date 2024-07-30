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
    };

    return {
      updateShape() {
        return;
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
