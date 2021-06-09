import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { shallowEqualObjects } from 'shallow-equal';
import { useAPI } from './ApiProvider';
import { useAppStore } from './AppStoreProvider';
import { useParams } from './RoutesProvider';

export const ProjectContext = createContext();
ProjectContext.displayName = 'ProjectContext';

const projectCache = new Map();

export const ProjectProvider = ({children}) => {
  const api = useAPI();
  const params = useParams();
  const { update: updateStore } = useAppStore();
  const [projectData, setProjectData] = useState(projectCache.get(params.id) ?? {});

  const fetchProject = useCallback(async (id, force = false) => {
    const finalProjectId = id ?? params.id;

    if (!finalProjectId) return;

    if (finalProjectId) {
      if (projectCache.has(finalProjectId)) {
        setProjectData({...projectCache.get(finalProjectId)});
      }

      const projectInfo = await api.callApi('project', {
        params: { pk: finalProjectId },
        errorFilter(result) {
          return false;
        },
      });

      if (shallowEqualObjects(projectData, projectInfo) === false) {
        setProjectData({...projectInfo});
        updateStore({project: projectInfo});
        projectCache.set(finalProjectId, projectInfo);
      }
    }
  }, [params]);

  useEffect(() => {
    fetchProject();
  }, [params]);

  useEffect(() => {
    return () => projectCache.clear();
  }, []);

  return (
    <ProjectContext.Provider value={{
      project: projectData,
      fetchProject,
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  return useContext(ProjectContext) ?? {};
};
