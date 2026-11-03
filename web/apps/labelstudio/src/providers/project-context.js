import { createContext, useContext } from "react";

export const ProjectContext = createContext({});
ProjectContext.displayName = "ProjectContext";

export const useProject = () => {
  return useContext(ProjectContext) ?? {};
};
