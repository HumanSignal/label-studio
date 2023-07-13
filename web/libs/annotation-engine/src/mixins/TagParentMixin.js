import { types } from 'mobx-state-tree';
import Types from '../core/Types';

export const TagParentMixin = types.model('AnnotationMixin',
  {
    parentTypes: Types.tagsTypes([]),
  }).views((self) => ({
  get parent() {
    return Types.getParentTagOfTypeString(self, self.parentTypes);
  },
}));