import { types } from "mobx-state-tree";

import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import { AreaMixin } from "../mixins/AreaMixin";
import Registry from "../core/Registry";
import { EditableRegion } from "./EditableRegion";
import { GPSRegionModel as _gpsRegionModel } from "./GPSRegion/GPSRegionModel";

// Define editable fields for GPS regions
const EditableGPSModel = types.model("EditableGPSModel", {}).volatile(() => ({
  editableFields: [
    { property: "start", label: "Start" },
    { property: "end", label: "End" },
  ],
}));

// Create the base model without circular reference
const BaseGPSRegionModel = types.compose(
  "GPSRegionModel",
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  EditableRegion,
  EditableGPSModel,
  _gpsRegionModel,
);

// Register the region type
Registry.addRegionType(BaseGPSRegionModel, "gpsmap");

// Export the model
export { BaseGPSRegionModel as GPSRegionModel };
