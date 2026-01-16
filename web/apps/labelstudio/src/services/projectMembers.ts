/**
 * API service for managing project members and roles
 */
import { getApiInstance } from '@htx/core';
import type {
  AddProjectMemberRequest,
  ProjectMember,
  UpdateMemberRoleRequest,
} from '@htx/core/types/project';

const api = getApiInstance();

/**
 * Get all members of a project
 */
export const listProjectMembers = async (projectId: number): Promise<ProjectMember[]> => {
  const response = await api.invoke<ProjectMember[]>('get', `/api/projects/${projectId}/members/`);
  return response;
};

/**
 * Add a new member to a project
 */
export const addProjectMember = async (
  projectId: number,
  data: AddProjectMemberRequest,
): Promise<ProjectMember> => {
  const response = await api.invoke<ProjectMember>('post', `/api/projects/${projectId}/members/`, {
    body: data,
  });
  return response;
};

/**
 * Update a member's role
 */
export const updateMemberRole = async (
  projectId: number,
  memberId: number,
  data: UpdateMemberRoleRequest,
): Promise<ProjectMember> => {
  const response = await api.invoke<ProjectMember>(
    'patch',
    `/api/projects/${projectId}/members/${memberId}/`,
    {
      body: data,
    },
  );
  return response;
};

/**
 * Remove a member from a project
 */
export const removeMember = async (projectId: number, memberId: number): Promise<void> => {
  await api.invoke('delete', `/api/projects/${projectId}/members/${memberId}/`);
};
