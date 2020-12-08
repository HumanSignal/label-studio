import { DataManager } from "@heartex/datamanager";
import '@heartex/datamanager/build/static/css/main.css';

const dmRoot = document.querySelector(".datamanager");

if (dmRoot) {
  const dm = new DataManager({
    root: dmRoot,
    api: {
      gateway: "/api",
      endpoints: {
        project: "/project",
        columns: "/project/columns",
        tabs: "/project/tabs",
        updateTab: {
          path: "/project/tabs/:tabID",
          method: "post",
        },
        deleteTab: {
          path: "/project/tabs/:tabID",
          method: "delete",
        },

        tasks: "/project/tabs/:tabID/tasks",
        annotations: "/project/tabs/:tabID/annotations",

        task: "/tasks/:taskID",
        nextTask: "/project/next",

        completion: "/tasks/:taskID/completions/:id",
        skipTask: {
          path: "/tasks/:taskID/completions",
          method: "post",
        },
        submitCompletion: {
          path: "/tasks/:taskID/completions",
          method: "post",
        },
        updateCompletion: {
          path: "/tasks/:taskID/completions/:completionID",
          method: "post",
        },
        deleteCompletion: {
          path: "/tasks/:taskID/completions/:completionID",
          method: "delete",
        },

        setSelectedItems: {
          path: "/project/tabs/:tabID/selected-items",
          method: "post",
        },
        addSelectedItem: {
          path: "/project/tabs/:tabID/selected-items",
          method: "patch",
        },
        deleteSelectedItem: {
          path: "/project/tabs/:tabID/selected-items",
          method: "delete",
        },

        actions: "/project/actions",
        invokeAction: {
          path: "/project/tabs/:tabID/actions",
          method: "post",
        },
      },
    },
  });

  console.log(dm);
}
