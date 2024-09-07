import { types, getRoot, getParent, type Instance } from "mobx-state-tree";
import RegionsMixin from "../mixins/Regions";
import Registry from "../core/Registry";
import { guidGenerator } from "../core/Helpers";
import { AreaMixin } from "../mixins/AreaMixin";
import NormalizationMixin from "../mixins/Normalization";

const Model = types
  .model("Object3DRegionModel", {
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "object3dregion",
    object: types.late(() => types.reference(Registry.getModelByTag("object3d"))),

    // 3D specific properties
    x: types.number,
    y: types.number,
    z: types.number,
    width: types.number,
    height: types.number,
    depth: types.number,
    rotationX: types.number,
    rotationY: types.number,
    rotationZ: types.number,
  })
  .views((self) => ({
    get parent() {
      return getParent(self);
    },

    get annotation() {
      return getRoot<any>(self)?.annotationStore?.selected;
    },

    // Add more view methods as needed
  }))
  .actions((self) => ({
    updatePosition(x: number, y: number, z: number) {
      self.x = x;
      self.y = y;
      self.z = z;
    },

    updateDimensions(width: number, height: number, depth: number) {
      self.width = width;
      self.height = height;
      self.depth = depth;
    },

    updateRotation(x: number, y: number, z: number) {
      self.rotationX = x;
      self.rotationY = y;
      self.rotationZ = z;
    },

    serialize() {
      return {
        value: {
          x: self.x,
          y: self.y,
          z: self.z,
          width: self.width,
          height: self.height,
          depth: self.depth,
          rotationX: self.rotationX,
          rotationY: self.rotationY,
          rotationZ: self.rotationZ,
        },
      };
    },

    // Add more action methods as needed
  }));

const Object3DRegionModel = types.compose("Object3DRegionModel", RegionsMixin, AreaMixin, NormalizationMixin, Model);

type Object3DRegionType = Instance<typeof Object3DRegionModel> & {
  detectByValue: any;
};

Registry.addRegionType(Object3DRegionModel as unknown as Object3DRegionType, "object3d");

export { Object3DRegionModel };
