import { getRoot, isAlive, types } from 'mobx-state-tree';
import Types from '../core/Types';
import { FF_DEV_3391, FF_SIMPLE_INIT, isFF } from '../utils/feature-flags';

export const AnnotationMixin = types.model('AnnotationMixin', {

}).views((self) => ({
  get annotation() {
    // annotation should not be accessed before store is initialized
    if (isFF(FF_SIMPLE_INIT) && !window.STORE_INIT_OK) {
      console.error('LSF: annotation accessed before store is initialized', self);
    }

    if (!isAlive(self)) return null;
    if (isFF(FF_DEV_3391)) {
      const root = getRoot(self);

      // if that's a Tool (they live in separate tree)
      if (root === self) {
        if (self.control) {
          return self.control.annotation;
        } else if (self.obj) {
          return self.obj.annotation;
        }
        return null;
      }

      // if annotation history item selected
      if (root.annotationStore?.selectedHistory) {
        return root.annotationStore.selectedHistory;
      }

      // return connected annotation, not the globally selected one
      return Types.getParentOfTypeString(self, 'Annotation');
    }

    const as = self.annotationStore;

    return as?.selectedHistory ?? as?.selected;
  },

  get annotationStore() {
    const root = getRoot(self);

    if (root === self) {
      if (self.control) {
        return getRoot(self.control).annotationStore;
      } else if (self.obj) {
        return getRoot(self.obj).annotationStore;
      }
      return null;
    }

    return root.annotationStore;
  },
}));
