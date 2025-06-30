import Registry from "../../../core/Registry";
import * as GPSMapModel from "./model";
import { GPSMapComponent } from "./view";
import { GPSRegionModel } from "../../../regions/GPSRegion";
import { observer, inject } from "mobx-react";

// Wrap the component with observer from mobx-react AND inject the store
const GPSMap = inject("store")(observer(GPSMapComponent));

const _tagView = GPSMap;
const _model = GPSMapModel.GPSMapModel;

Registry.addTag("gpsmap", _model, _tagView);
Registry.addObjectType(_model);

export { GPSRegionModel, _model as GPSMapModel, GPSMap };
