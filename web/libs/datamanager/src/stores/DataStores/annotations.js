import { flow, getRoot, types } from "mobx-state-tree";
import { DataStore, DataStoreItem } from "../../mixins/DataStore";
import { DynamicModel } from "../DynamicModel";

export const create = (columns) => {
  const AnnotationModelBase = DynamicModel("AnnotationModelBase", columns);

  const AnnotationModel = types.compose("AnnotationModel", AnnotationModelBase, DataStoreItem);

  return DataStore("AnnotationStore", {
    apiMethod: "annotations",
    listItemType: AnnotationModel,
  }).actions((self) => ({
    loadTask: flow(function* (annotationID) {
      let remoteTask;
      const rootStore = getRoot(self);

      if (annotationID !== undefined) {
        remoteTask = yield rootStore.apiCall("task", { taskID: annotationID });
      } else {
        remoteTask = yield rootStore.apiCall("nextTask", {
          projectID: getRoot(self).project.id,
        });
      }

      annotationID = annotationID ?? remoteTask.id;

      const annotation = self.updateItem(annotationID, {
        ...remoteTask,
        source: JSON.stringify(remoteTask),
      });

      self.setSelected(annotation.id);

      return annotation;
    }),

    unsetTask() {
      self.unset();
    },
  }));
};
