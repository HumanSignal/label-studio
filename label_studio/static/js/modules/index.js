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
        updateTab: "/project/tabs/:tabID",
        deleteTab: "/project/tabs/:tabID",

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
            ContentType: "application/json",
          },
        },
        updateCompletion: {
          path: "/completions/:completionID",
          method: "post",
          headers: {
            ContentType: "application/json",
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
