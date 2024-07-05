import { getRoot } from "mobx-state-tree";

export const ProjectCell = (cell) => {
  const { original, value } = cell;
  const root = getRoot(original);
  // TODO: turn this into a link to open the project later
  const projectList = value
    .map((projectRef) => (
      root.taskStore.associatedList.find(proj => proj.id === projectRef.project_id)?.title
    ))
    .filter(Boolean);

  return (
    <div
      style={{
        maxHeight: "100%",
        overflow: "hidden",
        fontSize: 12,
        lineHeight: "16px",
      }}
    >
      {projectList && projectList.join(", ")}
    </div>
  );
};
