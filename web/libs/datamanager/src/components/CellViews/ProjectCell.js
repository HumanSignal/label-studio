import { getRoot } from "mobx-state-tree";
import { Fragment } from "react";

const ProjectLink = ({ project }) => {
  const projectID = project.id;
  const onClick = (e) => {
    e.stopPropagation();
  };

  return (
    <a href={`/projects/${projectID}/data`} onClick={onClick}>
      {project.title}
    </a>
  );
};

export const ProjectCell = (cell) => {
  const { original, value } = cell;
  const root = getRoot(original);
  const projectList = value
    .map((projectRef) => root.taskStore.associatedList.find((proj) => proj.id === projectRef.project_id))
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
      {projectList &&
        projectList.map((projectRef, index) => (
          <Fragment key={projectRef.project_id}>
            {index > 0 && ", "}
            <ProjectLink project={projectRef} />
          </Fragment>
        ))}
    </div>
  );
};
