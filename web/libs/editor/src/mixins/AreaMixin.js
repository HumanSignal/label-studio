import { destroy, isAlive, types } from "mobx-state-tree";
import { defaultStyle } from "../core/Constants";
import { guidGenerator } from "../core/Helpers";
import Result from "../regions/Result";
import { PER_REGION_MODES } from "./PerRegion";
import { ReadOnlyRegionMixin } from "./ReadOnlyMixin";
import { FF_LSDV_4930, FF_TAXONOMY_LABELING, isFF } from "../utils/feature-flags";

let ouid = 1;

export const AreaMixinBase = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    ouid: types.optional(types.number, () => ouid++),
    results: types.array(Result),
    parentID: types.maybeNull(types.string),
  })
  .views((self) => ({
    // self id without annotation id added to uniquiness across all the tree
    get cleanId() {
      return self.id.replace(/#.*/, "");
    },

    /**
     * @return {Result[]} all results with labeling (created by *Labels control)
     */
    get labelings() {
      return self.results.filter((r) => r.from_name.isLabeling);
    },

    /**
     * @return {Result?} first result with labels (usually it's the only one, but not always)
     */
    get labeling() {
      if (!isAlive(self)) {
        return undefined;
      }
      return self.results.find((r) => r.from_name.isLabeling && r.hasValue);
    },

    get emptyLabel() {
      return self.results.find((r) => r.from_name?.emptyLabel)?.from_name?.emptyLabel;
    },

    get texting() {
      return isAlive(self) && self.results.find((r) => r.type === "textarea" && r.hasValue);
    },

    get tag() {
      return self.labeling?.from_name;
    },

    hasLabel(value) {
      const labels = self.labeling?.mainValue;

      if (!labels || !value) return false;
      // label can contain comma, so check for full match first
      if (labels.includes(value)) return true;
      if (value.includes(",")) {
        return value.split(",").some((v) => labels.includes(v));
      }
      return false;
    },

    get perRegionTags() {
      return self.annotation.toNames.get(self.object.name)?.filter((tag) => tag.perregion) || [];
    },

    // special tags that can be used for labeling (only <Taxonomy isLabeling/> for now)
    get labelingTags() {
      if (!isFF(FF_TAXONOMY_LABELING)) return [];

      return self.annotation.toNames.get(self.object.name)?.filter((tag) => tag.classification && tag.isLabeling) || [];
    },

    get perRegionDescControls() {
      return self.perRegionTags.filter((tag) => tag.displaymode === PER_REGION_MODES.REGION_LIST);
    },

    get perRegionFocusTarget() {
      return self.perRegionTags.find((tag) => tag.isVisible !== false && tag.focusable);
    },

    get labelName() {
      if (!isAlive(self)) {
        return void 0;
      }
      return self.labeling?.mainValue?.[0] || self.emptyLabel?._value;
    },

    get labels() {
      return Array.from(self.labeling?.mainValue ?? []);
    },

    // used only in labels on regions for Image and Video tags
    getLabelText(joinstr) {
      const index = self.region_index;
      const label = self.labeling;
      const text = self.texting?.mainValue?.[0]?.replace(/\n\r|\n/, " ");
      const labelNames = label?.getSelectedString(joinstr);
      const labelText = [];

      if (index) labelText.push(String(index));
      if (labelNames) labelText.push(labelNames);
      if (text) labelText.push(text);
      return labelText.join(": ");
    },

    get parent() {
      if (!isAlive(self)) {
        return void 0;
      }
      return self.object;
    },

    get style() {
      if (!isAlive(self)) {
        return void 0;
      }

      const styled = self.results.find((r) => r.style);

      if (styled && styled.style) {
        return styled.style;
      }
      const emptyStyled = self.results.find((r) => r.emptyStyle);

      if (emptyStyled && emptyStyled.emptyStyle) {
        return emptyStyled.emptyStyle;
      }

      const controlStyled = self.results.find((r) => self.type.startsWith(r.type));

      return controlStyled && controlStyled.controlStyle;
    },

    // @todo may be slow, consider to add some code to annotation (un)select* methods
    get selected() {
      return self.annotation?.highlightedNode === self;
    },

    getOneColor() {
      return (self.style || defaultStyle).fillcolor;
    },

    get highlighted() {
      return self.parent?.selectionArea?.isActive ? self.isInSelectionArea : self._highlighted;
    },

    get isInSelectionArea() {
      return (!isFF(FF_LSDV_4930) || !self.hidden) && self.parent?.selectionArea?.isActive
        ? self.parent.selectionArea.intersectsBbox(self.bboxCoords)
        : false;
    },

    get supportSuggestions() {
      return self.object.supportSuggestions;
    },

    // index of the region in the regions tree (Outliner); will be updated on any order change
    get region_index() {
      if (!self.isRealRegion) {
        return null;
      }
      return self.annotation?.regionStore.regionIndexMap[self.id] || null;
    },
  }))
  .actions((self) => ({
    beforeDestroy() {
      self.results.forEach((r) => destroy(r));

      // Some region indexes have to be recalculated after destroying regions
      self.annotation?.updateAppearenceFromState?.();
    },

    setSelected(value) {
      self.selected = value;
    },

    /**
     * Remove region
     */
    deleteRegion() {
      if (self.annotation.isReadOnly()) return;
      if (self.isReadOnly()) return;
      if (self.selected) self.annotation.unselectAll(true);
      if (self.destroyRegion) self.destroyRegion();
      self.annotation.deleteRegion(self);
    },

    addResult(r) {
      self.results.push(r);
    },

    /**
     * Applies additional data from the given result.
     * In the results we have almost all data meaningful stored in value but in regions we have two places for it:
     * - region itself (fields in model)
     * - related results (in results array)
     * so for some fields we should control more if we want to apply fields that could be in both places into the region.
     * This method also helps to avoid region type detection at the deserialization stage.
     *
     * @param {Object} result - The result object containing additional data.
     * @returns {void}
     */
    applyAdditionalDataFromResult(_result) {
      // This method should be overridden if we need to get some additional data from result on deserialize
    },

    removeResult(r) {
      const index = self.results.indexOf(r);

      if (index < 0) return;
      self.results.splice(index, 1);
      destroy(r);
      if (!self.results.length) self.annotation.deleteArea(self);
    },

    setValue(tag) {
      const result = self.results.find((r) => r.from_name === tag);
      const values = tag.selectedValues();

      if (result) {
        if (tag.holdsState) result.setValue(values);
        else self.removeResult(result);
      } else {
        self.results.push({
          area: self,
          from_name: tag,
          to_name: self.object,
          type: tag.resultType,
          value: {
            [tag.valueType]: values,
          },
        });
      }
      self.updateAppearenceFromState && self.updateAppearenceFromState();
    },
  }));

export const AreaMixin = types.compose("AreaMixin", AreaMixinBase, ReadOnlyRegionMixin);
