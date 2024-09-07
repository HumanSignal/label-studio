import { type Instance, types } from "mobx-state-tree";
import ObjectBase from "../Base";
import { AnnotationMixin } from "../../../mixins/AnnotationMixin";
import { IsReadyWithDepsMixin } from "../../../mixins/IsReadyMixin";
import { Object3DRegionModel } from "../../../regions/Object3DRegion";
import ProcessAttrsMixin from "../../../mixins/ProcessAttrs";

const TagAttrs = types.model({
  name: types.identifier,
  value: types.maybeNull(types.string),
  zoom: types.optional(types.number, 1.0),
});

const Model = types
  .model("Object3DModel", {
    type: "object3d",
    _value: types.optional(types.string, ""),
    regions: types.array(Object3DRegionModel),
    // Add any additional properties specific to the 3D object itself
  })
  .views((self) => ({
    get hasStates() {
      const states = self.states();
      return states && states.length > 0;
    },

    states() {
      return self.annotation.toNames.get(self.name) ?? [];
    },

    activeStates() {
      const states = self.states();
      return states ? states.filter((s) => s.isSelected && s.type.includes("labels")) : [];
    },

    get result() {
      return self.annotation.results.find((r) => r.from_name === self);
    },
  }))
  .actions((self) => ({
    addRegion(region) {
      self.regions.push(region);
      self.annotation.addRegion(region);
    },

    deleteRegion(region) {
      const index = self.regions.indexOf(region);
      if (index > -1) {
        self.regions.splice(index, 1);
        self.annotation.deleteRegion(region);
      }
    },

    setSelected(regionId) {
      self.regions.forEach((r) => {
        r.setSelected(r.id === regionId);
      });
    },

    // This method will be called when loading an annotation result
    deserializeRegions(regions) {
      regions.forEach((regionData) => {
        self.addRegion(Object3DRegionModel.create(regionData));
      });
    },

    // This method should be called when the component mounts
    onMount() {
      // Initialize 3D viewer or any other necessary setup
    },

    // This method should be called when the component unmounts
    onUnmount() {
      // Clean up 3D viewer or any other resources
    },
  }));

export const Object3DModel = types.compose(
  "Object3DModel",
  TagAttrs,
  ProcessAttrsMixin,
  ObjectBase,
  AnnotationMixin,
  IsReadyWithDepsMixin,
  Model,
);

export type Object3DModelType = Instance<typeof Object3DModel>;
