// import '@heartex/datamanager/build/static/css/main.css';
import { DataManager } from "../../dm/js/main";

const dmRoot = document.querySelector(".datamanager");

if (dmRoot) {
  const dm = new DataManager({
    root: dmRoot,
    apiGateway: "/api",
    apiVersion: 2,
    apiEndpoints: {
      /** Project base info */
      project: "/project",

      /** Available columns/fields of the dataset */
      columns: "/project/columns",

      /** Tabs (materialized views) */
      tabs: "/project/tabs",

      /** Update particular tab (POST) */
      updateTab: {
        path: "/project/tabs/:tabID",
        method: "post",
      },

      /** Delete particular tab (DELETE) */
      deleteTab: {
        path: "/project/tabs/:tabID",
        method: "delete",
      },

      /** List of tasks (samples) in the dataset */
      tasks: "/project/tabs/:tabID/tasks",

      /** Per-task annotations (completions, predictions) */
      annotations: "/project/tabs/:tabID/annotations",

      /** Single task (sample) */
      task: "/tasks/:taskID",

      /** Next task (labelstream, default sequential) */
      nextTask: "/project/next",

      /** Sinfle annotation */
      completion: "/tasks/:taskID/completions/:id",

      /** Mark sample as skipped */
      skipTask: {
        path: (params) => {
          const pathBase = "/tasks/:taskID/completions";
          const isNewCompletion = !isDefined(params.completionID);
          return isNewCompletion ? pathBase : `${pathBase}/:completionID`;
        },
        method: "post",
      },

      /** Submit annotation */
      submitCompletion: {
        path: "/tasks/:taskID/completions",
        method: "post",
      },

      /** Update annotation */
      updateCompletion: {
        path: "/tasks/:taskID/completions/:completionID",
        method: "post",
      },

      /** Delete annotation */
      deleteCompletion: {
        path: "/tasks/:taskID/completions/:completionID",
        method: "delete",
      },

      /** Override selected items list (checkboxes) */
      setSelectedItems: {
        path: "/project/tabs/:tabID/selected-items",
        method: "post",
      },

      /** Add item to the current selection */
      addSelectedItem: {
        path: "/project/tabs/:tabID/selected-items",
        method: "patch",
      },

      /** Subtract item from the current selection */
      deleteSelectedItem: {
        path: "/project/tabs/:tabID/selected-items",
        method: "delete",
      },

      /** List of available actions */
      actions: "/project/actions",

      /** Invoke a particular action */
      invokeAction: {
        path: "/project/tabs/:tabID/actions",
        method: "post",
      },
    }
  });

  console.log(dm);
}
