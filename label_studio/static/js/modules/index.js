import { DataManager } from "htx-data-manager";

const dmRoot = document.querySelector(".datamanager");

console.log(dmRoot);

if (dmRoot) {
  const dm = new DataManager({
    root: dmRoot,
    api: {
      gateway: "/api",
      endpoints: {
        tasks: "/tasks",
        task: "/tasks/:id",
        completion: "/tasks/:task_id/completions/:id",
        cancel: "/cancel",
        projects: "/projects",
        next: "/next",
        expertInstructions: "/expert_instruction",
      },
    },
  });

  console.log(dm);
}
