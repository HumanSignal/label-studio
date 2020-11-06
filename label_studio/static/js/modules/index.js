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

        tasks: {
          path: "/project/tabs/:tabID/tasks",
          convert(result) {
            return {
              tasks: result,
              total: 106,
            }
          }
        },
        annotations: {
          path: "/project/tabs/:tabID/annotations",
          convert(result) {
            return {
              tasks: result,
              total: 106,
            }
          }
        },

        task: "/tasks/:id",
        cancel: "/tasks/:taskID/completions?was_cancelled=1",
        next: "/project/next",

        completion: "/tasks/:taskID/completions/:id",
        submitCompletion: {
          path: "/tasks/:taskID/completions",
          method: "post",
          headers: {
            ContentType: "application/json",
          },
        },
      },
    },
  });

  console.log(dm);
}
