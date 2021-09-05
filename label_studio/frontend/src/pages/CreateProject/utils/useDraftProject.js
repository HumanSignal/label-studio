import React from 'react';
import { useAPI } from '../../../providers/ApiProvider';
import { useTranslation } from "react-i18next";
import "../../../translations/i18n";


export const useDraftProject = () => {
  const { t } = useTranslation();

  const api = useAPI();
  const [project, setProject] = React.useState();

  const fetchDraftProject = React.useCallback(async () => {
    const projects = await api.callApi('projects');

    // always create the new one
    const lastIndex = (projects ?? []).length;
    let projectNumber = lastIndex + 1;
    let projectName = t("newProject") + ` #${projectNumber}`;

    // dirty hack to get proper non-duplicate name
    while(projects.find(({title}) => title === projectName)) {
      projectNumber++;
      projectName = t("newProject") + ` #${projectNumber}`;
    }

    const draft = await api.callApi('createProject', {
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
