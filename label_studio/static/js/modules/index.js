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
          path: "/project/tabs/:tab_id/tasks",
          convert(result) {
            return {
              tasks: result,
              total: 106,
            }
          }
        },
        annotations: {
          path: "/project/tabs/:tab_id/annotations",
          convert(result) {
            return {
              tasks: result,
              total: 106,
            }
          }
        },

        task: "/tasks/:id",
        cancel: "/tasks/:task_id/completions?was_cancelled=1",
        next: "/project/next",

        completion: "/tasks/:task_id/completions/:id",
        submitCompletion: {
          path: "/tasks/:taskId/completions",
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
