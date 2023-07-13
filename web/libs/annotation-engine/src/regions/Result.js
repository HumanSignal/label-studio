import { getParent, getRoot, getSnapshot, types } from 'mobx-state-tree';
import { guidGenerator } from '../core/Helpers';
import Registry from '../core/Registry';
import Tree from '../core/Tree';
import { AnnotationMixin } from '../mixins/AnnotationMixin';
import { isDefined } from '../utils/utilities';
import { FF_DEV_1372, FF_LSDV_4583, isFF } from '../utils/feature-flags';

const Result = types
  .model('Result', {
    id: types.optional(types.identifier, guidGenerator),
    // pid: types.optional(types.string, guidGenerator),

    score: types.maybeNull(types.number),
    // @todo to readonly mixin
    readonly: types.optional(types.boolean, false),

    // @why?
    // hidden: types.optional(types.boolean, false),

    // @todo to mixins
    // selected: types.optional(types.boolean, false),
    // highlighted: types.optional(types.boolean, false),

    // @todo pid?
    // parentID: types.optional(types.string, ""),

    // ImageRegion, TextRegion, HyperTextRegion, AudioRegion)),
    // optional for classifications
    // labeling/control tag
    from_name: types.late(() => types.reference(types.union(...Registry.modelsArr()))),
    // object tag
    to_name: types.late(() => types.reference(types.union(...Registry.objectTypes()))),
    // @todo some general type, maybe just a `string`
    type: types.enumeration([
      'labels',
      'hypertextlabels',
      'paragraphlabels',
      'rectangle',
      'keypoint',
      'polygon',
      'brush',
      'ellipse',
      'magicwand',
      'rectanglelabels',
      'keypointlabels',
      'polygonlabels',
      'brushlabels',
      'ellipselabels',
      'timeserieslabels',
      'choices',
      'datetime',
      'number',
      'taxonomy',
      'textarea',
      'rating',
      'pairwise',
      'videorectangle',
      'ranker',
    ]),
    // @todo much better to have just a value, not a hash with empty fields
    value: types.model({
      ranker: types.union(types.array(types.string), types.frozen(), types.null),
      datetime: types.maybe(types.string),
      number: types.maybe(types.number),
      rating: types.maybe(types.number),
      item_index: types.maybeNull(types.number),
      text: types.maybe(types.union(types.string, types.array(types.string))),
      choices: types.maybe(types.array(types.union(types.string, types.array(types.string)))),
      // pairwise
      selected: types.maybe(types.enumeration(['left', 'right'])),
      // @todo all other *labels
      labels: types.maybe(types.array(types.string)),
      htmllabels: types.maybe(types.array(types.string)),
      hypertextlabels: types.maybe(types.array(types.string)),
      paragraphlabels: types.maybe(types.array(types.string)),
      rectanglelabels: types.maybe(types.array(types.string)),
      keypointlabels: types.maybe(types.array(types.string)),
      polygonlabels: types.maybe(types.array(types.string)),
      ellipselabels: types.maybe(types.array(types.string)),
      brushlabels: types.maybe(types.array(types.string)),
      timeserieslabels: types.maybe(types.array(types.string)),
      taxonomy: types.frozen(), // array of arrays of strings
      sequence: types.frozen(),
    }),
    // info about object and region
    // meta: types.frozen(),
  })
  .views(self => ({
    get perRegionStates() {
      const states = self.states;

      return states && states.filter(s => s.perregion === true);
    },

    get store() {
      return getRoot(self);
    },

    get area() {
      return getParent(self, 2);
    },

    get mainValue() {
      return self.value[self.from_name.valueType];
    },

    mergeMainValue(value) {
      value = value?.toJSON ? value.toJSON() : value;
      const mainValue = self.mainValue?.toJSON?.() ? self.mainValue?.toJSON?.() : self.mainValue;

      if (typeof value !== typeof mainValue) return null;
      if (self.type.endsWith('labels')) {
        return value.filter(x => mainValue.includes(x));
      }
      return value === mainValue ? value : null;
    },

    get hasValue() {
      const value = self.mainValue;

      if (!isDefined(value)) return false;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    },

    get editable() {
      throw new Error('Not implemented');
    },

    isReadOnly() {
      return self.readonly || self.area.isReadOnly();
    },

    isSelfReadOnly() {
      return self.readonly;
    },

    getSelectedString(joinstr = ' ') {
      return self.mainValue?.join(joinstr) || '';
    },

    get selectedLabels() {
      if (self.mainValue?.length === 0 && self.from_name.allowempty) {
        return self.from_name.findLabel(null);
      }
      return self.mainValue?.map(value => self.from_name.findLabel(value)).filter(Boolean);
    },

    /**
     * Checks perRegion and Visibility params
     */
    get canBeSubmitted() {
      const control = self.from_name;

      if (control.perregion) {
        const label = control.whenlabelvalue;

        if (label && !self.area.hasLabel(label)) return false;
      }

      // picks leaf's (last item in a path) value for Taxonomy or usual Choice value for Choices
      const innerResults = (r) =>
        r.map(s => Array.isArray(s) ? s.at(-1) : s);

      const isChoiceSelected = () => {
        const tagName = control.whentagname;
        const choiceValues = control.whenchoicevalue?.split(',') ?? null;
        const results = self.annotation.results.filter(r => ['choices', 'taxonomy'].includes(r.type) && r !== self);

        if (tagName) {
          const result = results.find(r => {
            if (r.from_name.name !== tagName) return false;
            // for perRegion choices we should check that they are in the same area
            return !r.from_name.perregion || r.area === self.area;
          });

          if (!result) return false;
          if (choiceValues && !choiceValues.some(v => innerResults(result.mainValue).some(vv => result.from_name.selectedChoicesMatch(v, vv)))) return false;
        } else {
          if (!results.length) return false;
          // if no given choice value is selected in any choice result
          if (choiceValues && !results.some(r => choiceValues.some(v => innerResults(r.mainValue).some(vv => r.from_name.selectedChoicesMatch(v, vv))))) return false;
        }
        return true;
      };

      if (control.visiblewhen === 'choice-selected') {
        return isChoiceSelected();
      } else if (isFF(FF_DEV_1372) && control.visiblewhen === 'choice-unselected') {
        return !isChoiceSelected();
      }

      return true;
    },

    get tag() {
      const value = self.mainValue;

      if (!value || !value.length) return null;
      if (!self.from_name.findLabel) return null;
      return self.from_name.findLabel(value[0]);
    },

    get style() {
      if (!self.tag) return null;
      const fillcolor = self.tag.background || self.tag.parent.fillcolor;

      if (!fillcolor) return null;
      const strokecolor = self.tag.background || self.tag.parent.strokecolor;
      const { strokewidth, fillopacity, opacity } = self.tag.parent;

      return { strokecolor, strokewidth, fillcolor, fillopacity, opacity };
    },

    get emptyStyle() {
      const emptyLabel = self.from_name.emptyLabel;

      if (!emptyLabel) return null;
      const fillcolor = emptyLabel.background || emptyLabel.parent.fillcolor;

      if (!fillcolor) return null;
      const strokecolor = emptyLabel.background || emptyLabel.parent.strokecolor;
      const { strokewidth, fillopacity, opacity } = emptyLabel.parent;

      return { strokecolor, strokewidth, fillcolor, fillopacity, opacity };
    },

    get controlStyle() {
      if (!self.from_name) return null;

      const { fillcolor, strokecolor, strokewidth, fillopacity, opacity } = self.from_name;

      return { strokecolor, strokewidth, fillcolor, fillopacity, opacity };
    },
  }))
  .volatile(() => ({
    pid: '',
    selected: false,
    // highlighted: types.optional(types.boolean, false),
  }))
  .actions(self => ({
    setValue(value) {
      self.value[self.from_name.valueType] = value;
    },

    afterCreate() {
      self.pid = self.id;
    },

    afterAttach() {
      // const tag = self.from_name;
      // update state of classification tags
      // @todo unify this with `selectArea`
    },

    setParentID(id) {
      self.parentID = id;
    },

    // update region appearence based on it's current states, for
    // example bbox needs to update its colors when you change the
    // label, becuase it takes color from the label
    updateAppearenceFromState() { },

    serialize(options) {
      const { type, score, value, ...sn } = getSnapshot(self);
      const { valueType } = self.from_name;
      const data = self.area ? self.area.serialize(options) : {};
      // cut off annotation id
      const id = self.area?.cleanId;
      const from_name = Tree.cleanUpId(sn.from_name);
      const to_name = Tree.cleanUpId(sn.to_name);

      if (!data) return null;
      if (!self.canBeSubmitted) return null;

      if (!isDefined(data.value)) data.value = {};
      // with `mergeLabelsAndResults` control uses only one result even with external `Labels`
      if (self.to_name.mergeLabelsAndResults) {
        if (type === 'labels') return null;
        // add labels to the main region, not nested ones
        if (self.area?.labels?.length && !self.from_name.perregion) data.value.labels = self.area.labels;
      }

      const contolMeta = self.from_name.metaValue;

      if (contolMeta) {
        data.meta = { ...data.meta, ...contolMeta };
      }
      const areaMeta = self.area.meta;

      if (areaMeta && Object.keys(areaMeta).length) {
        data.meta = { ...data.meta, ...areaMeta };
      }

      if (self.area.parentID) {
        data.parentID = self.area.parentID.replace(/#.*/, '');
      }

      Object.assign(data, { id, from_name, to_name, type, origin: self.area.origin });

      if (isDefined(value[valueType])) {
        Object.assign(data.value, { [valueType]: value[valueType] });
      }

      if (typeof score === 'number') data.score = score;

      if (self.isSelfReadOnly()) data.readonly = true;

      if (isFF(FF_LSDV_4583) && isDefined(self.area.item_index)) {
        data.item_index = self.area.item_index;
      }

      return data;
    },

    /**
     * Remove region
     */
    deleteRegion() {
      if (self.annotation.isReadOnly()) return;

      self.unselectRegion();

      self.annotation.relationStore.deleteNodeRelation(self);

      if (self.type === 'polygonregion') {
        self.destroyRegion();
      }

      self.annotation.regionStore.deleteRegion(self);

      self.annotation.deleteRegion(self);
    },

    setHighlight(val) {
      self._highlighted = val;
    },

    toggleHighlight() {
      self.setHighlight(!self._highlighted);
    },

    toggleHidden() {
      self.hidden = !self.hidden;
    },
  }));

export default types.compose('Result', Result, AnnotationMixin);
