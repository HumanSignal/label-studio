import { types } from "mobx-state-tree";

const ObjectBase = types
  .model({
    // TODO there should be a better way to force an update
    _needsUpdate: types.optional(types.number, 0),
  })
  .views(self => ({}))
  .actions(self => {
    let props = {};

    function addProp(name, value) {
      props[name] = value;
      self._needsUpdate = self._needsUpdate + 1;
    }

    function getProps() {
      return props;
    }

    return {
      addProp,
      getProps,
    };
  });

export default ObjectBase;
