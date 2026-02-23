/**
 * Mock Result type for AreaMixin tests. Provides same interface used by AreaMixin
 * without requiring full Registry and control/object tags.
 */
import { types } from "mobx-state-tree";
import { guidGenerator } from "../../core/Helpers";

const MockResult = types
  .model("MockResult", {
    id: types.optional(types.identifier, guidGenerator),
    from_name: types.frozen(),
    to_name: types.frozen(),
    type: types.string,
    value: types.frozen(),
    style: types.maybeNull(types.frozen()),
    emptyStyle: types.maybeNull(types.frozen()),
    controlStyle: types.maybeNull(types.frozen()),
  })
  .views((self) => ({
    get mainValue() {
      return self.value?.labels ?? self.value?.textarea ?? null;
    },
    get hasValue() {
      const v = self.mainValue;
      return Array.isArray(v) ? v.length > 0 : v != null && v !== "";
    },
    getSelectedString(join = " ") {
      const v = self.mainValue;
      return Array.isArray(v) ? v.join(join) : (v ?? "").toString();
    },
  }))
  .actions(() => ({
    setValue() {},
  }));

export default MockResult;
