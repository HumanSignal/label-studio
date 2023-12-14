import { types } from 'mobx-state-tree';

export const Object3DSelectionPoint = types.model({
  x: types.number,
  y: types.number,
});
