import { types } from 'mobx-state-tree';

type UserLabel = {
  path: string[],
  origin: 'user' | 'session',
}

type ControlsWithLabels = Record<string, UserLabel[]>;
type ControlsWithPaths = Record<string, string[][]>;

// Subset of user generated labels per control tag, currently only for taxonomy
const UserLabels = types
  .model({
    // controls: types.map(types.array(types.array(types.string))),
    controls: types.frozen<ControlsWithLabels>({}),
  })
  .actions(self => ({
    addLabel(control: string, path: string[]) {
      const label: UserLabel = { path, origin: 'session' };
      const labels = [...(self.controls[control] ?? []), label];

      self.controls = { ...self.controls, [control]: labels };
    },

    deleteLabel(control: string, path: string[]) {
      if (!self.controls[control]) return;
      const labels = self.controls[control].filter(existed =>
        existed.path.length !== path.length
        || !existed.path.every((item, index) => item === path[index]));

      self.controls = { ...self.controls, [control]: labels };
    },

    init(controls: ControlsWithPaths) {
      const adjusted: ControlsWithLabels = {};

      for (const control in controls) {
        adjusted[control] = controls[control].map(path => ({
          origin: 'user',
          path,
        }));
      }
      self.controls = adjusted;
    },
  }));

export { UserLabels };
