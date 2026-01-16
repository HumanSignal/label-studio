/**
 * Hook to access project permissions based on user's role
 */
import { useContext, useMemo } from 'react';
import { ProjectContext } from '../providers/ProjectProvider';
import type { ProjectRole } from '@htx/core/types/project';
import { getPermissionsFromRole } from '@htx/core/types/project';

export const useProjectPermissions = () => {
  const { project } = useContext(ProjectContext);

  const currentUserRole = project?.current_user_role as ProjectRole | null | undefined;

  const permissions = useMemo(() => {
    return getPermissionsFromRole(currentUserRole || null);
  }, [currentUserRole]);

  return {
    role: currentUserRole || null,
    ...permissions,
  };
};
