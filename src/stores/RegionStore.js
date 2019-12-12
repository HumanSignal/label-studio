import { types, getParent, getEnv, destroy } from "mobx-state-tree";

import * as HtxObjectModel from "../interfaces/object";

export default types
  .model("RegionStore", {
    regions: types.array(
      types.safeReference(
        types.union(
          HtxObjectModel.TextRegionModel,
          HtxObjectModel.RectRegionModel,
          HtxObjectModel.PolygonRegionModel,
          HtxObjectModel.AudioRegionModel,
          HtxObjectModel.TextAreaRegionModel,
          HtxObjectModel.KeyPointRegionModel,
          HtxObjectModel.HyperTextRegionModel,
        ),
      ),
    ),
  })
  .actions(self => ({
    addRegion(region) {
      self.regions.push(region);
      getEnv(self).onEntityCreate(region);
    },

    findRegion(pid) {
      return self.regions.find(r => r.pid === pid);
    },

    /**
     * Delete region
     * @param {obj} region
     */
    deleteRegion(region) {
      const arr = self.regions;

      for (let i = 0; i < arr.length; i++) {
        if (arr[i] === region) {
          arr.splice(i, 1);
        }
      }

      getEnv(self).onEntityDelete(region);
    },

    unselectAll() {
      self.regions.forEach(r => r.unselectRegion());
      getParent(self).setHighlightedNode(null);
    },

    unhighlightAll() {
      self.regions.forEach(r => r.setHighlight(false));
    },
  }));
