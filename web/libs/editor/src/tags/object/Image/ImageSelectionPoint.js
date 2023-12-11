import { types } from 'mobx-state-tree';

export const ImageSelectionPoint = types.model({
  x: types.number,
  y: types.number,
});
