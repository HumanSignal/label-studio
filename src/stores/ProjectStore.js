import { types, getParent } from "mobx-state-tree";

/**
 * Project Store
 */
const ProjectStore = types
  .model("Project", {
    /**
     * Project ID
     */
    id: types.identifierNumber,
  })
  .views(self => ({
    get app() {
      return getParent(self);
    },
  }));

export default ProjectStore;
