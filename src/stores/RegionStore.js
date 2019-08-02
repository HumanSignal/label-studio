import { types, getParent } from "mobx-state-tree";

import { TextRegionModel } from "../interfaces/object/TextRegion";
import { RectRegionModel } from "../interfaces/object/RectRegion";
import { PolygonRegionModel } from "../interfaces/object/PolygonRegion";
import { AudioRegionModel } from "../interfaces/object/AudioRegion";
import { TextAreaRegionModel } from "../interfaces/object/TextAreaRegion";

export default types
  .model("RegionStore", {
    regions: types.array(
      types.safeReference(
        types.union(TextRegionModel, RectRegionModel, PolygonRegionModel, AudioRegionModel, TextAreaRegionModel),
      ),
    ),
  })
  .actions(self => ({
    addRegion(region) {
      self.regions.push(region);
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
    },

    unselectAll() {
      self.regions.forEach(r => r.unselectRegion());
      getParent(self).setHighlightedNode(null);
    },

    unhighlightAll() {
      self.regions.forEach(r => r.setHighlight(false));
    },
  }));
