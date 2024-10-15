import React from "react";
import { useAPI } from "../../../providers/ApiProvider";

export const useDraftProject = () => {
  const api = useAPI();
  const [project, setProject] = React.useState();

  const fetchDraftProject = React.useCallback(async () => {
    const response = await api.callApi("projects");

    // always create the new one
    const projects = response?.results ?? [];
    const lastIndex = projects.length;
    let projectNumber = lastIndex + 1;
    let projectName = `New Project #${projectNumber}`;

    // dirty hack to get proper non-duplicate name
    while (projects.find(({ title }) => title === projectName)) {
      projectNumber++;
      projectName = `New Project #${projectNumber}`;
    }

    const draft = await api.callApi("createProject", {
      body: {
        title: projectName,
      },
    });

    if (draft) setProject(draft);
  }, []);

  React.useEffect(() => {
    fetchDraftProject();
  }, []);

  return project;
};
