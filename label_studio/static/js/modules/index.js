import { DataManager } from "htx-data-manager";

const dmRoot = document.querySelector(".datamanager");

console.log(dmRoot);

if (dmRoot) {
  const dm = new DataManager({
    root: dmRoot,
    api: {
      gateway: "/api",
      endpoints: {
        tasks: {
          path: "/tasks",
          convert(result) {
            return {
              tasks: result,
              total: 106,
            }
          }
        },
        task: "/tasks/:id",
        completion: "/tasks/:task_id/completions/:id",
        cancel: "/cancel",
        projects: "/projects",
        next: "/projects/1/next",
        project: "/project",
        expertInstructions: "/expert_instruction",
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
