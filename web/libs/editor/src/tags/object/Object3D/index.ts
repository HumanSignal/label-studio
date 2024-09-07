import { Object3DModel } from "./model";
import Object3DView from "./view";
import Registry from "../../../core/Registry";

Registry.addTag("object3d", Object3DModel, Object3DView);
Registry.addObjectType(Object3DModel);

export { Object3DModel, Object3DView };
