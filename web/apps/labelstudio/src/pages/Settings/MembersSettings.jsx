/**
 * Members Settings page wrapper for project settings menu
 * Provides RBAC-based team member management
 */
import { useContext } from 'react';
import { ProjectContext } from '../../providers/ProjectProvider';
import { useAuth } from '@htx/core';
import { MembersSettings as MembersSettingsComponent } from './MembersSettings/MembersSettings';

export const MembersSettings = () => {
  const { project } = useContext(ProjectContext);
  const { user } = useAuth();

  // Get current user's role from project data
  const currentUserRole = project?.current_user_role || null;
  const currentUserId = user?.id;

  return (
    <MembersSettingsComponent
      currentUserRole={currentUserRole}
      currentUserId={currentUserId}
    />
  );
};

// Menu configuration for Settings sidebar
MembersSettings.menuItem = 'Members';
MembersSettings.path = '/members';
MembersSettings.exact = true;
