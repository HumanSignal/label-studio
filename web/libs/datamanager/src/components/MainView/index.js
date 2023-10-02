import { DataView as DataViewOld } from "./DataViewOld/Table";
import { DataView as DataViewNew } from "./DataView/DataView";
import { FF_DEV_1470, isFF } from "../../utils/feature-flags";

export const DataView = isFF(FF_DEV_1470) ? DataViewNew : DataViewOld;
