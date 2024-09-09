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
  })
  .volatile(() => ({
    selectedRegionId: null,
  }))
  .views((self) => ({
    get hasStates() {
      const states = self.states();
      return states && states.length > 0;
    },

    states() {
      return self.annotation.toNames.get(self.name)?.filter((tag) => tag.type.includes("labels")) ?? [];
    },

    activeStates() {
      const states = self.states();
      return states ? states.filter((s) => s.isSelected) : [];
    },

    get result() {
      return self.annotation.results.find((r) => r.from_name === self);
    },

    get selectedRegion() {
      return self.regions.find((r) => r.id === self.selectedRegionId);
    },

    get controlButton() {
      const { toolsManager } = self.annotation;
      return toolsManager.findTool("object3d");
    },

    getRegionByID(id) {
      return self.regions.find((r) => r.id === id);
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
      if (self.selectedRegionId === region.id) {
        self.selectedRegionId = null;
      }
    },

    createRegion(x, y, z) {
      const region = Object3DRegionModel.create({
        x,
        y,
        z,
        width: 1,
        height: 1,
        depth: 1, // Default size
        object: self,
      });
      self.regions.push(region);
      self.annotation.addRegion(region);

      // Automatically select the first label if available
      const firstLabel = self.states()[0]?.selectedValues()[0];
      if (firstLabel) {
        region.setLabel(firstLabel);
      }

      return region;
    },

    selectRegion(id) {
      self.selectedRegionId = id;
    },

    updateSelectedRegion(updates) {
      const region = self.selectedRegion;
      if (region) {
        Object.assign(region, updates);
      }
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
