import { types } from 'mobx-state-tree';
import isMatch from 'lodash.ismatch';
import InfoModal from '../../components/Infomodal/Infomodal';
import { AnnotationMixin } from '../../mixins/AnnotationMixin';
import { FF_DEV_3391, FF_DEV_3666, isFF } from '../../utils/feature-flags';
import { BaseTag } from '../TagBase';

const ObjectBase = types
  .model({
    ...(isFF(FF_DEV_3391)
      ? {
        id: types.identifier,
        name: types.string,
      } : {
        name: types.identifier,
      }),
    // TODO there should be a better way to force an update
    _needsUpdate: types.optional(types.number, 0),
    isObjectTag: true,
  })
  .views(self => ({
    /**
     * A list of all related regions
     * it is using for validation purposes
     */
    get allRegs() {
      return self.annotation?.regionStore.regions.filter(r => r.object === self) || [];
    },
    /**
     * A list of regions related to the current object state
     * (it could be overridden)
     */
    get regs() {
      return self.allRegs;
    },
    findRegion(params) {
      let obj = null;

      if (self._regionsCache && self._regionsCache.length) {
        obj = self._regionsCache.find(({ region }) => isMatch(region, params));
      }

      return obj || self.regions.find(r => isMatch(r, params));
    },
    get isReady() {
      return true;
    },
  }))
  .actions(self => {
    const props = {};

    function addProp(name, value) {
      props[name] = value;
      self._needsUpdate = self._needsUpdate + 1;
    }

    function getProps() {
      return props;
    }

    // @todo maybe not a best place for this method?
    // check that maxUsages was not exceeded for labels
    // and if it was - don't allow to create new region and unselect all regions
    // unselect labels which was exceeded maxUsages
    // return all states left untouched - available labels and others
    function getAvailableStates() {
      // `checkMaxUsages` may unselect labels with already reached `maxUsages`
      const checkAndCollect = (list, s) => (s.checkMaxUsages ? list.concat(s.checkMaxUsages()) : list);
      const allStates = self.states() || [];
      let exceeded;

      if (isFF(FF_DEV_3666)) {
        exceeded = allStates.reduce(checkAndCollect, []).filter(e => e.selected);
        exceeded.forEach(e => e.setSelected(false));
      } else {
        exceeded = allStates.reduce(checkAndCollect, []);
      }

      const states = self.activeStates() || [];

      if (states.length === 0) {
        if (exceeded.length) {
          const label = exceeded[0];

          InfoModal.warning(`You can't use ${label.value} more than ${label.maxUsages} time(s)`);
        }
        self.annotation.unselectAll();
      }
      return states;
    }

    return {
      addProp,
      getProps,
      getAvailableStates,
    };
  });

export default types.compose(ObjectBase, BaseTag, AnnotationMixin);
