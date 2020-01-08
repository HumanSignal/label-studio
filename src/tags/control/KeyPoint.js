import { types } from "mobx-state-tree";

import * as Tools from "../../tools";
import Registry from "../../core/Registry";
import Types from "../../core/Types";

/**
 * KeyPoint tag
 * KeyPoint is used to add a keypoint to an image
 * @example
 * <View>
 *   <KeyPoint name="kp-1" toName="img-1"></KeyPoint>
 *   <Image name="img-1" value="$img"></Image>
 * </View>
 * @name KeyPoint
 * @param {string} name name of the element
 * @param {string} toname name of the image to label
 * @param {float=} [opacity=0.9] opacity of keypoint
 * @param {string=} [fillColor=#8bad00] keypoint fill color
 * @param {number=} [strokeWidth=1] width of the stroke
 */

const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  toname: types.maybeNull(types.string),

  opacity: types.optional(types.string, "0.9"),
  fillcolor: types.optional(types.string, "#8bad00"),

  strokewidth: types.optional(types.string, "1"),
});

const Model = types
  .model({
    id: types.identifier,
    type: "keypoint",

    // tools: types.array(BaseTool)
  })
  .views(self => ({
    get hasStates() {
      const states = self.states();
      return states && states.length > 0;
    },

    get completion() {
      return Types.getParentOfTypeString(self, "Completion");
    },
  }))
  .actions(self => ({
    fromStateJSON(obj) {},

    getTools() {
      return Object.values(self.tools);
    },

    afterCreate() {
      const kp = Tools.KeyPoint.create();
      kp._control = self;

      self.tools = { keypoint: kp };
    },
  }));

const KeyPointModel = types.compose("KeyPointModel", TagAttrs, Model);

const HtxView = () => {
  return null;
};

Registry.addTag("keypoint", KeyPointModel, HtxView);

export { HtxView, KeyPointModel };
