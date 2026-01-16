/**
 * Project member roles in hierarchical order
 */
export type ProjectRole = 'owner' | 'reviewer' | 'annotator';

/**
 * User information for project members
 */
export interface ProjectMemberUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar: string | null;
  initials: string;
}

/**
 * Project member with role information
 */
export interface ProjectMember {
  id: number;
  user: ProjectMemberUser;
  role: ProjectRole;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Request payload for adding a new project member
 */
export interface AddProjectMemberRequest {
  user_id: number;
  role: ProjectRole;
}

/**
 * Request payload for updating a member's role
 */
export interface UpdateMemberRoleRequest {
  role: ProjectRole;
}

/**
 * Project permissions based on user's role
 */
export interface ProjectPermissions {
  canManageMembers: boolean;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canManageTasks: boolean;
  canReviewAnnotations: boolean;
  canExportData: boolean;
  canManageMLBackends: boolean;
  canManageWebhooks: boolean;
  canManageStorage: boolean;
  role: ProjectRole | null;
}

/**
 * Helper function to determine permissions based on role
 */
export const getPermissionsFromRole = (role: ProjectRole | null): ProjectPermissions => {
  if (!role) {
    return {
      canManageMembers: false,
      canEditProject: false,
      canDeleteProject: false,
      canManageTasks: false,
      canReviewAnnotations: false,
      canExportData: false,
      canManageMLBackends: false,
      canManageWebhooks: false,
      canManageStorage: false,
      role: null,
    };
  }

  const isOwner = role === 'owner';
  const isReviewer = role === 'owner' || role === 'reviewer';

  return {
    canManageMembers: isOwner,
    canEditProject: isOwner,
    canDeleteProject: isOwner,
    canManageTasks: isOwner,
    canReviewAnnotations: isReviewer,
    canExportData: isReviewer,
    canManageMLBackends: isOwner,
    canManageWebhooks: isOwner,
    canManageStorage: isOwner,
    role,
  };
};

/**
 * Role display labels
 */
export const ROLE_LABELS: Record<ProjectRole, string> = {
  owner: 'Owner',
  reviewer: 'Reviewer',
  annotator: 'Annotator',
};

/**
 * Role descriptions for tooltips/help text
 */
export const ROLE_DESCRIPTIONS: Record<ProjectRole, string> = {
  owner: 'Full control including project settings, member management, and deletion',
  reviewer: 'Can review and approve annotations, export data, but cannot modify project settings',
  annotator: 'Can create and edit own annotations',
};

/**
 * Role colors for badges
 */
export const ROLE_COLORS: Record<ProjectRole, string> = {
  owner: '#1890ff', // Blue
  reviewer: '#52c41a', // Green
  annotator: '#8c8c8c', // Gray
};
