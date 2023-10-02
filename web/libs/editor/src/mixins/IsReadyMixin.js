import { types } from 'mobx-state-tree';

const IsReadyMixin = types.model({}).volatile(() => {
  return {
    _isReady: true,
  };
}).views(self => ({
  get isReady() {
    return self._isReady;
  },
})).actions(self => {
  return {
    setReady(value) {
      self._isReady = value;
    },
  };
});

export default IsReadyMixin;

export const IsReadyWithDepsMixin = IsReadyMixin.views(self => ({
  get isReady() {
    return self._isReady && !self.regs?.filter(r => !r.isReady).length;
  },
}));