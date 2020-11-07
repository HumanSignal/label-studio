import { DataManager } from "htx-data-manager";

const dmRoot = document.querySelector(".datamanager");

console.log(dmRoot);

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
          headers: {
            'Content-Type': "application/json",
          },
        },
        deleteTab: {
          path: "/project/tabs/:tabID",
          method: "delete",
        },

        tasks: "/project/tabs/:tabID/tasks",
        annotations: "/project/tabs/:tabID/annotations",

        task: "/tasks/:taskID",
        skipTask: "/tasks/:taskID/completions?was_cancelled=1",
        nextTask: "/project/next",

        completion: "/tasks/:taskID/completions/:id",
        submitCompletion: {
          path: "/tasks/:taskID/completions",
          method: "post",
          headers: {
            'Content-Type': "application/json",
          },
        },
        updateCompletion: {
          path: "/completions/:completionID",
          method: "post",
          headers: {
            'Content-Type': "application/json",
          },
        },
        deleteCompletion: {
          path: "/completions/:completionID",
          method: "delete",
        },
      },
    },
  });

  console.log(dm);
}
