import { types, getRoot, getParent } from "mobx-state-tree";
import { guidGenerator } from "../core/Helpers";
import Registry from "../core/Registry";
import { AreaMixin } from "../mixins/AreaMixin";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";

const Model = types
  .model("Object3DRegionModel", {
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "object3dregion",
    object: types.late(() =>
      types.reference(Registry.getModelByTag("object3d"))
    ),

    x: types.number,
    y: types.number,
    z: types.number,
    width: types.number,
    height: types.number,
    depth: types.number,
    rotation: types.optional(types.array(types.number), [0, 0, 0])
  })
  .views(self => ({
    get parent() {
      return getParent(self);
    },

    get annotation() {
      return getRoot<any>(self).annotationStore.selected;
    },

    get completion() {
      return getRoot<any>(self).annotationStore.selected;
    },

    states() {
      return self.object.states();
    },

    activeStates() {
      const states = self.states();
      return states.filter(s => s.isSelected);
    },

    get labelsFromControls() {
      const object = self.object;
      const controlsByType = object.annotation.toNames.get(object.name);
      return (
        controlsByType?.filter(control => control.type.includes("labels")) ?? []
      );
    },

    get labeledLabels() {
      return self.labelsFromControls
        .map(control => control.selectedValues())
        .flat();
    }
  }))
  .actions(self => ({
    updatePosition(x, y, z) {
      self.x = x;
      self.y = y;
      self.z = z;
    },

    updateDimensions(width, height, depth) {
      self.width = width;
      self.height = height;
      self.depth = depth;
    },

    updateRotation(rotationX, rotationY, rotationZ) {
      self.rotation = [rotationX, rotationY, rotationZ];
    },

    serialize() {
      return {
        id: self.id,
        pid: self.pid,
        x: self.x,
        y: self.y,
        z: self.z,
        width: self.width,
        height: self.height,
        depth: self.depth,
        rotation: self.rotation
      };
    },

    setLabel(label) {
      const object = self.object;
      const controlsByType = object.annotation.toNames.get(object.name);
      const labelControl = controlsByType?.find(control =>
        control.type.includes("labels")
      );

      if (labelControl) {
        labelControl.unselectAll();
        labelControl.toggleSelected(label);
      }
    },

    toggleLabel(label) {
      const object = self.object;
      const controlsByType = object.annotation.toNames.get(object.name);
      const labelControl = controlsByType?.find(control =>
        control.type.includes("labels")
      );

      if (labelControl) {
        labelControl.toggleSelected(label);
      }
    }
  }));

const Object3DRegionModel = types.compose(
  "Object3DRegionModel",
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  Model
);

Registry.addRegionType(Object3DRegionModel as any, "object3d");

export { Object3DRegionModel };
