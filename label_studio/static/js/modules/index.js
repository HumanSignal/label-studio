import { DataManager } from "htx-data-manager";

const dmRoot = document.querySelector(".datamanager");

console.log(dmRoot);

if (dmRoot) {
  const dm = DataManager({
    root: dmRoot,
    api: {
      gateway: "/api",
      endpoints: {
        tasks: "/tasks",
        completion: "/completions",
        cancel: "/cancel",
        projects: "/projects",
        next: "/next",
        expertInstructions: "/expert_instruction",
      },
    },
  });

  console.log(dm);
}
