import { getType, types } from "mobx-state-tree";

/**
 * Adds an opt-in `randomize` boolean attribute to a control tag whose host
 * model exposes `_child` and `children` (typically via `SelectedModelMixin`).
 * When `randomize` is true, `displayChildren` returns a shuffled snapshot of
 * the host's **direct** `_child`-typed children produced by `reshuffle()`.
 *
 * Why "direct" and not `tiedChildren`: `tiedChildren` is recursive (via
 * `Tree.filterChildrenOfType`), which would pull nested choices into the
 * shuffle pool — flattening hierarchies (`allowNested`) and rendering nested
 * nodes twice. Shuffling only the direct subset keeps the hierarchy intact
 * and lets non-`_child` siblings (`<Header>`, `<View>`, `<HyperText>`) keep
 * their layout positions when the renderer interleaves them with the shuffle.
 *
 * Hosts own the shuffle lifecycle and must call `self.reshuffle()` from
 * their `afterCreate` (no-op when `randomize` is false). Dynamic tags get
 * a fresh order automatically via `DynamicChildrenMixin.updateDynamicChildren`,
 * which calls `self.reshuffle?.()` after replacing children.
 *
 * Compose this mixin AFTER the mixin that provides `_child` (e.g. `SelectedModelMixin`).
 */
const RandomizableTagAttrs = types.model({
  randomize: types.optional(types.boolean, false),
});

const directChildrenOfType = (self) => {
  const childType = self._child;
  if (!childType) return [];
  return (self.children ?? []).filter((c) => {
    try {
      return getType(c).name === childType;
    } catch {
      return false;
    }
  });
};

const RandomizableModel = types
  .model({})
  .volatile(() => ({
    _shuffledChildren: null,
  }))
  .views((self) => ({
    get displayChildren() {
      const direct = directChildrenOfType(self);
      if (!self.randomize) return direct;
      const shuffled = self._shuffledChildren;
      if (!shuffled || shuffled.length !== direct.length) return direct;
      const directSet = new Set(direct);
      if (shuffled.some((c) => !directSet.has(c))) return direct;
      return shuffled;
    },
  }))
  .actions((self) => ({
    reshuffle() {
      if (!self.randomize) {
        self._shuffledChildren = null;
        return;
      }
      const arr = directChildrenOfType(self);
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      self._shuffledChildren = arr;
    },
  }));

const RandomizableMixin = types.compose("RandomizableMixin", RandomizableTagAttrs, RandomizableModel);

export default RandomizableMixin;
