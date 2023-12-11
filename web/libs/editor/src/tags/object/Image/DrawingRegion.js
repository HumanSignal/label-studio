import { types } from 'mobx-state-tree';
import Registry from '../../../core/Registry';

export const DrawingRegion = types.union(
  {
    dispatcher(sn) {
      if (!sn) return types.null;
      // may be a tag itself or just its name
      const objectName = sn.object.name || sn.object;
      // we have to use current config to detect Object tag by name
      const tag = window.Htx.annotationStore.names.get(objectName);
      // provide value to detect Area by data
      const available = Registry.getAvailableAreas(tag.type, sn);
      // union of all available Areas for this Object type

      return types.union(...available, types.null);
    },
  },
);
